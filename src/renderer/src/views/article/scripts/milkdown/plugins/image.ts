/**
 * ============================================================================
 * 图片节点视图
 * ============================================================================
 *
 * 需要解决四个问题：
 *
 * 1. **本地图片没法直接用相对路径显示**
 *    Blossom 的图片引用形如 `![名称](图片名.png)`，编辑器里必须转成
 *    自定义协议 `blossom:\图片名.png` 才能被主进程拦截读取。
 *    注意转换只发生在**渲染层**，节点的 `src` 属性始终保存原始名称，
 *    因此保存回 markdown 时依然是 `![名称](图片名.png)`，引用解析逻辑不受影响。
 *
 * 2. **alt 里的样式标记**
 *    旧语法支持 `![照片A##shadow##w100](a.png)` 表示加阴影、宽 100px。
 *    alt 不会显示成正文，所以这里解析出来只用于渲染，不改写文档。
 *
 * 3. **点击图片只选中，不弹面板**
 *    单击图片会选中节点（方便拖动 / 删除），同时在图片右上角浮现一个
 *    「编辑」按钮；点这个按钮才派发 `bl-image-click`，由 Vue 层弹出
 *    「宽度 / 阴影」设置面板。这样可以避免「想拖图片却弹出面板」。
 *
 * 4. **加载失败显示文字而不是占位框**
 *    旧实现给失败状态加了固定 min-width / min-height 的虚线框，图片加载完成
 *    或失败时高度变化会让正文抖动。现在失败时只显示一行错误文字（高度与正文
 *    行高一致），不会挤压排版。
 */

import { $view } from '@milkdown/kit/utils'
import { NodeSelection } from '@milkdown/kit/prose/state'
import { imageSchema } from '@milkdown/kit/preset/commonmark'
import { protocolWrapper, picCacheWrapper } from '@renderer/views/picture/scripts/picture'

import { IMAGE_CLICK_EVENT } from '../constants'

export { IMAGE_CLICK_EVENT }

/** 图片节点点击事件 detail */
export interface ImageClickDetail {
  /** 原始引用地址（相对文档库的路径或 http 地址） */
  src: string
  /** 渲染用的地址 */
  renderSrc: string
  /** 节点在文档中的位置，用于修改宽度 / 阴影 */
  pos: number
  /** 原始 alt（含 `##shadow##` / `##w100` 标记） */
  alt: string
  /** 是否已加阴影 */
  shadow: boolean
  /** 当前宽度（如 `100px` / `50%` / `auto`） */
  width: string
  /**
   * 面板定位锚点（图片外框元素）
   *
   * 面板是 fixed 浮层，需要拿到真实的 DOM 元素才能在滚动时重新计算位置，
   * 只靠 clientX / clientY 定位的话滚动后会「留在原地」。
   */
  anchor: HTMLElement | null
}

/** alt 中的标记分隔符，与旧渲染器一致 */
const GRAMMAR = '##'

/** 判断是否是外部地址 */
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url)

/**
 * 把 markdown 中的图片地址（相对名称 / 绝对路径 / http 地址）转成可渲染的地址
 */
export const resolveImageSrc = (src: string): string => {
  if (!src) return ''

  // 已经处理过的协议地址直接返回
  if (src.startsWith('blossom:') || src.startsWith('data:') || src.startsWith('file:')) {
    return src
  }
  const url = isHttpUrl(src) ? src : protocolWrapper(src)
  // 加上时间戳参数，配合「重载图片」功能清理缓存
  return picCacheWrapper(url)
}

/**
 * 图片固有尺寸缓存（原始引用 -> 像素宽高）
 *
 * 用途：在图片**解码之前**就能给 <img> 写上 width / height 属性，
 * 浏览器据此按比例预留高度，长文章里图片陆续加载也不会把下方的正文整体顶下去。
 */
const sizeCache = new Map<string, { width: number; height: number }>()

/** 预加载单张图片并记录固有尺寸 */
const primeOne = (src: string): Promise<void> => {
  if (!src || sizeCache.has(src)) return Promise.resolve()
  const url = resolveImageSrc(src)
  if (!url) return Promise.resolve()

  return new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        sizeCache.set(src, { width: image.naturalWidth, height: image.naturalHeight })
      }
      resolve()
    }
    image.onerror = () => resolve()
    image.src = url
  })
}

/**
 * 预加载一组图片的固有尺寸
 *
 * 页面在把 markdown 塞进编辑器之前调用。图片本身走缓存协议，预加载很便宜；
 * 超时后不再等待，避免个别图片拖慢文章打开速度。
 *
 * @param srcs    图片地址列表（markdown 里的原始引用）
 * @param timeout 最长等待时间（毫秒）
 */
export const primeImageSizes = async (srcs: string[], timeout = 600) => {
  const list = Array.from(new Set(srcs.filter(Boolean)))
  if (list.length === 0) return
  await Promise.race([
    Promise.all(list.map((src) => primeOne(src))),
    new Promise((resolve) => setTimeout(resolve, timeout))
  ])
}

/**
 * 解析 alt 中的样式标记
 * `照片A##shadow##w100` => { alt: '照片A', shadow: true, width: '100px' }
 */
export const parseImageAlt = (alt: string) => {
  const result = { alt: alt ?? '', shadow: false, width: 'auto' }
  if (!result.alt.includes(GRAMMAR)) return result

  const tags = result.alt.split(GRAMMAR)
  result.alt = tags[0]
  for (let i = 1; i < tags.length; i++) {
    const tag = tags[i]
    if (!tag) continue
    if (tag === 'shadow') result.shadow = true
    if (tag.startsWith('w')) {
      const width = tag.substring(1)
      if (width) result.width = width.endsWith('%') ? width : `${width}px`
    }
  }
  return result
}

/**
 * 图片 NodeView
 */
class ImageNodeView {
  dom: HTMLElement
  private img: HTMLImageElement
  /** 加载失败时的提示文字 */
  private errorEl: HTMLElement
  /** 选中后浮现的「编辑」按钮 */
  private editBtn: HTMLElement
  private node: any
  private view: any
  /** 取节点在文档中的位置（ProseMirror 注入） */
  private getPos: () => number | undefined

  constructor(node: any, view: any, getPos: () => number | undefined) {
    this.node = node
    this.view = view
    this.getPos = getPos

    this.dom = document.createElement('span')
    this.dom.className = 'bl-image-node'
    this.dom.setAttribute('contenteditable', 'false')

    this.img = document.createElement('img')
    /*
     * 不使用 loading="lazy"：
     * 编辑器是自定义滚动容器，懒加载会在滚动过程中陆续触发，导致长文章的
     * 排版一段一段地变化（看起来像「重新渲染」）。本地图片加载很快，直接加载。
     */
    this.img.decoding = 'async'
    this.img.addEventListener('error', () => this.showError())
    this.img.addEventListener('load', () => {
      this.hideError()
      // 记住固有尺寸，下次渲染同一张图就能提前占位
      const { src = '' } = this.node.attrs
      if (src && this.img.naturalWidth > 0 && this.img.naturalHeight > 0) {
        sizeCache.set(src, { width: this.img.naturalWidth, height: this.img.naturalHeight })
      }
    })

    this.errorEl = document.createElement('span')
    this.errorEl.className = 'bl-image-error'

    this.editBtn = document.createElement('span')
    this.editBtn.className = 'bl-image-edit iconbl bl-a-fileedit-line'
    this.editBtn.title = '图片设置（宽度 / 阴影）'

    this.dom.appendChild(this.img)
    this.dom.appendChild(this.errorEl)
    this.dom.appendChild(this.editBtn)

    /*
     * 单击图片：只选中节点，不弹面板。
     * 这里主动 setNodeSelection，保证 selectNode() 被调用、编辑按钮能浮现。
     */
    this.img.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      const pos = this.getPos()
      if (typeof pos === 'number' && this.view) {
        const { state } = this.view
        // 注意：Transaction 没有 setNodeSelection，必须用 NodeSelection.create 包一层
        this.view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)))
        this.view.focus()
      }
    })

    // 按下时阻止默认行为，避免点按钮时编辑器丢失选区
    this.editBtn.addEventListener('mousedown', (event) => event.preventDefault())
    this.editBtn.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.dispatchEdit()
    })

    this.apply()
  }

  /** 派发「打开图片设置面板」事件 */
  private dispatchEdit() {
    const { src = '', alt = '' } = this.node.attrs
    const parsed = parseImageAlt(alt)
    const detail: ImageClickDetail = {
      src,
      renderSrc: this.img.src,
      pos: this.getPos() ?? -1,
      alt,
      shadow: parsed.shadow,
      width: parsed.width,
      anchor: this.dom
    }
    this.dom.dispatchEvent(new CustomEvent(IMAGE_CLICK_EVENT, { detail, bubbles: true, composed: true }))
  }

  /** 加载失败：显示文字提示，隐藏图片 */
  private showError() {
    const { src = '', alt = '' } = this.node.attrs
    const parsed = parseImageAlt(alt)
    this.errorEl.textContent = `图片加载失败：${parsed.alt || src || '未知图片'}`
    this.dom.classList.add('is-broken')
  }

  private hideError() {
    this.errorEl.textContent = ''
    this.dom.classList.remove('is-broken')
  }

  /** 把节点属性映射到 DOM */
  private apply() {
    const { src = '', alt = '', title = '' } = this.node.attrs
    const parsed = parseImageAlt(alt)

    this.img.src = resolveImageSrc(src)
    this.img.alt = parsed.alt
    this.img.title = title || parsed.alt
    // 宽度为 auto 时不要写 inline style，否则会覆盖下面 width 属性的预留效果
    this.img.style.width = parsed.width === 'auto' ? '' : parsed.width
    this.img.style.boxShadow = parsed.shadow ? 'var(--bl-preview-img-box-shadow)' : ''

    // 已知固有尺寸就写上 width / height 属性：浏览器会在解码前按比例占位
    const size = sizeCache.get(src)
    if (size) {
      this.img.width = size.width
      this.img.height = size.height
    } else {
      this.img.removeAttribute('width')
      this.img.removeAttribute('height')
    }

    // 方便调试与样式定位
    this.dom.dataset.src = src
  }

  update(node: any) {
    if (node.type !== this.node.type) return false
    this.node = node
    this.apply()
    return true
  }

  selectNode() {
    this.dom.classList.add('is-selected')
  }

  deselectNode() {
    this.dom.classList.remove('is-selected')
  }

  ignoreMutation() {
    return true
  }

  destroy() {
    this.img.remove()
  }
}

/** 图片 NodeView 插件 */
export const imageNodeView = $view(
  imageSchema.node,
  () =>
    (node: any, view: any, getPos: () => number | undefined) =>
      new ImageNodeView(node, view, getPos)
)
