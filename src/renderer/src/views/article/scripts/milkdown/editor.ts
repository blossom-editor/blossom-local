/**
 * ============================================================================
 * Milkdown 所见即所得编辑器封装
 * ============================================================================
 *
 * 这一层是页面（ArticleIndex.vue）与 milkdown 之间的**唯一**接触面：
 * 页面只依赖这里暴露的方法与事件，不直接接触 milkdown / ProseMirror 的任何 API，
 * 后续升级 milkdown 或者替换编辑器内核时，只需要改动这个文件。
 *
 * ## 组成
 *
 * | 模块                      | 作用                                                            |
 * | ------------------------- | --------------------------------------------------------------- |
 * | preset/commonmark         | 标准 markdown（标题、列表、引用、代码块、图片、链接…）          |
 * | preset/gfm                | GFM 扩展（表格、任务列表、删除线、自动链接）                    |
 * | plugin/history            | 撤销 / 重做                                                     |
 * | plugin/listener           | 文档变化、选区变化、焦点变化回调                                |
 * | plugin/clipboard          | 复制黏贴时保留 markdown 结构                                    |
 * | plugin/indent             | Tab / Shift-Tab 缩进列表                                        |
 * | plugin/upload             | 拖拽 / 黏贴图片时的上传插槽                                     |
 * | plugin/cursor             | 拖拽光标与 gap cursor                                           |
 * | plugin/trailing           | 文档末尾自动补一个空段落，方便在结尾继续输入                    |
 * | plugins/math              | LaTeX 公式（remark-math + katex）                               |
 * | plugins/sup-sub           | 上标 / 下标（`<sup>` / `<sub>`）                                |
 * | plugins/font-color        | 文字颜色（`<font color>`）                                      |
 * | plugins/block-marker      | 彩色引用、容器表格的视觉装饰                                    |
 * | plugins/table             | 官方 table-block（增删行列、拖拽、对齐）                        |
 * | plugins/code-block        | 官方 code-block（CodeMirror：语言选择、语法高亮、复制）         |
 * | plugins/list-item         | 官方 list-item-block（任务列表复选框可点击）                    |
 * | plugins/image             | 图片协议转换与 alt 样式标记                                     |
 * | plugins/drag-guard        | 禁止在编辑器内拖动文字 / 图片（表格行列手柄除外）               |
 * | plugins/empty-block-drag  | 从空段落按下拖动时手动扩展选区（浏览器原生不支持）              |
 * | plugins/link              | 链接点击拦截（单击移光标 / Ctrl+单击打开）+ `[文字](地址)` 输入规则 + 链接 mark 不向后延伸 |
 * | plugins/backspace         | 空段落紧跟分割线 / 公式块时，Backspace 删除空段落并选中该块     |
 * | plugins/paste             | 从 VSCode 复制的内容按普通文本黏贴（不走 milkdown 的代码块分支）|
 * | component/link-tooltip    | 官方链接浮层：悬停预览（复制/编辑/删除）+ 选区上方输入链接      |
 * | plugins/link-edit         | 链接输入浮层（官方 LinkEditTooltip 的等价实现，额外保留 title） |
 * | plugins/search            | 正文查找（Ctrl+F）的命中高亮                                    |
 * | plugins/slash             | `/` 快捷插入菜单                                                |
 * | plugins/selection-tooltip | 选中文字后的浮动工具条（颜色 + 格式 + 设为链接）                |
 */

// ProseMirror 基础样式（选区、表格、拖拽光标），milkdown 不自带主题时需要显式引入
import '@milkdown/kit/prose/view/style/prosemirror.css'
import '@milkdown/kit/prose/tables/style/tables.css'
import '@milkdown/kit/prose/gapcursor/style/gapcursor.css'

import { Editor, commandsCtx, defaultValueCtx, editorViewCtx, editorViewOptionsCtx, rootCtx, serializerCtx } from '@milkdown/kit/core'
import { commonmark, toggleEmphasisCommand, toggleInlineCodeCommand, toggleStrongCommand } from '@milkdown/kit/preset/commonmark'
import { gfm, insertTableCommand, toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { indent } from '@milkdown/kit/plugin/indent'
import { upload, uploadConfig } from '@milkdown/kit/plugin/upload'
import { cursor } from '@milkdown/kit/plugin/cursor'
import { trailing } from '@milkdown/kit/plugin/trailing'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import {
  configureLinkTooltip,
  linkTooltipAPI,
  linkTooltipConfig,
  linkTooltipPlugin,
  toggleLinkCommand as linkTooltipToggleCommand
} from '@milkdown/kit/component/link-tooltip'
import { Decoration } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'
import { replaceAll } from '@milkdown/kit/utils'

import { supSubPlugins } from './plugins/sup-sub'
import { fontColorPlugins } from './plugins/font-color'
import { mathPlugins } from './plugins/math'
import { blockDecoratorPlugin } from './plugins/block-marker'
import { tablePlugins, configureTable } from './plugins/table'
import { codeBlockPlugins, configureCodeBlock } from './plugins/code-block'
import { listItemPlugins, configureListItem } from './plugins/list-item'
import { imageNodeView } from './plugins/image'
import { dragGuardPlugins } from './plugins/drag-guard'
import { emptyBlockDragPlugins } from './plugins/empty-block-drag'
import { linkPlugins, configureLinkMark } from './plugins/link'
import { backspacePlugins } from './plugins/backspace'
import { handleVSCodePaste } from './plugins/paste'
import { configureBlLinkEdit } from './plugins/link-edit'
import { slashPlugins, configureSlash } from './plugins/slash'
import { selectionTooltipPlugins, configureSelectionTooltip } from './plugins/selection-tooltip'
import { searchPluginKey, searchPlugins } from './plugins/search'
import { insertMarkdown as insertMarkdownCommand, runCommand } from './commands'
import type { EditorCommandName } from './commands'
/** 标题按颜色切段（右侧目录用），与只读预览窗口共用同一份实现 */
import { headingRuns } from '../heading-runs'
import type { HeadingRun } from '../heading-runs'

import { REQUEST_EVENT } from './constants'
import type { EditorRequestDetail } from './constants'

export { REQUEST_EVENT }
export type { EditorRequestDetail }

/** 编辑器初始化参数 */
export interface WysiwygOptions {
  /** 编辑器挂载的容器 */
  root: HTMLElement
  /** 初始 markdown 内容 */
  defaultValue?: string
  /** 文档内容变化回调（只通知"变了"，需要 markdown 时由调用方主动 getMarkdown） */
  onChange?: () => void
  /** 图片上传实现，返回文档库中的文件名 */
  uploadImage?: (file: File) => Promise<string>
}

/** 查找结果 */
export interface SearchResult {
  /** 命中总数 */
  total: number
  /** 当前命中下标（从 0 开始，-1 表示无命中） */
  current: number
}

/** 目录项里的一段文字 */
export type { HeadingRun }

/** 目录项 */
export interface HeadingItem {
  /** 标题级别 1-6 */
  level: number
  /** 标题纯文本（悬停提示 / 判断是否空标题用） */
  text: string
  /** 在同类元素中的序号，用于点击时定位 DOM */
  index: number
  /**
   * 按颜色切分后的标题文字
   *
   * 颜色取自标题里的 `<font color="...">`（见 plugins/font-color.ts）。
   * 拆成多段是为了和正文一致：只有被上色的那几个字在目录里变色，
   * 而不是整行跟着变。没有任何颜色时，这里就是一整段无色文字。
   */
  runs: HeadingRun[]
}

/**
 * 找到选区（或光标）所在链接的完整区间
 *
 * 链接 mark 可能被拆成多个文本节点（中间夹了加粗等其他 mark），
 * 所以这里在光标所在的文本块内扫描，把「同一 mark 的连续文本」合并成区间，
 * 再取包含选区的那个区间。
 *
 * @param state    ProseMirror 的 EditorState
 * @param linkType link mark 类型
 */
const findLinkRange = (state: any, linkType: any): { from: number; to: number; mark: any } | null => {
  const selection = state.selection
  const $from = selection?.$from
  if (!$from) return null

  /*
   * 光标落在链接边界时 `marks()` 可能为空，所以再向左右看一个节点：
   * - nodeAfter：光标刚好在链接开头
   * - nodeBefore：光标刚好在链接结尾（仅限空选区，避免「选中链接后面的文字」
   *   时被误判成在链接里）
   */
  const mark =
    $from.marks?.().find((m: any) => m.type === linkType) ??
    $from.nodeAfter?.marks.find((m: any) => m.type === linkType) ??
    (selection.empty ? $from.nodeBefore?.marks.find((m: any) => m.type === linkType) : null) ??
    null
  if (!mark) return null

  const start = $from.start($from.depth)
  const end = $from.end($from.depth)
  const runs: { from: number; to: number }[] = []
  let run: { from: number; to: number } | null = null

  state.doc.nodesBetween(start, end, (node: any, pos: number) => {
    if (!node.isText) {
      run = null
      return
    }
    if (mark.isInSet(node.marks)) {
      if (run && run.to === pos) run.to = pos + node.nodeSize
      else {
        run = { from: pos, to: pos + node.nodeSize }
        runs.push(run)
      }
    } else {
      run = null
    }
  })

  const hit = runs.find((item) => selection.from <= item.to && selection.to >= item.from)
  if (!hit) return null
  return { from: hit.from, to: hit.to, mark }
}

/**
 * 编辑器封装类
 */
export class WysiwygEditor {
  private editor!: Editor
  private root: HTMLElement
  private options: WysiwygOptions
  /** 是否正在整体替换文档（切换文章时），用于屏蔽 onChange 回调 */
  private applying = false
  /** 文档是否有改动，供页面判断是否需要保存 */
  private dirty = false

  private constructor(options: WysiwygOptions) {
    this.options = options
    this.root = options.root
  }

  /**
   * 创建编辑器（异步，内部会等待 milkdown 的各个 Ready timer）
   */
  static async create(options: WysiwygOptions): Promise<WysiwygEditor> {
    const instance = new WysiwygEditor(options)
    await instance.init()
    return instance
  }

  private async init() {
    const { root, defaultValue = '', onChange, uploadImage } = this.options

    /*
     * 快捷键插件：
     * Blossom 历史快捷键（Alt+B 加粗等）继续有效；
     * 需要弹窗的（插入图片 / 链接）派发自定义事件交给页面处理。
     *
     * 注意：Ctrl/Cmd + S 不在这里处理。代码块是 CodeMirror 的独立 contenteditable，
     * 按键事件到不了 ProseMirror 的 handleKeyDown，只有挂在 document 捕获阶段才能
     * 在代码块内也生效（见 ArticleIndex.vue 的 onGlobalKeydown）。
     */
    const shortcutPlugin = $prose((ctx) => {
      const key = new PluginKey('BL_SHORTCUT')

      /**
       * Blossom 传统快捷键 => milkdown 命令
       * 这些是旧版 codemirror 里的组合键，保留下来减少用户迁移成本
       */
      const legacyKeys: Record<string, () => void> = {
        b: () => ctx.get(commandsCtx).call(toggleStrongCommand.key),
        i: () => ctx.get(commandsCtx).call(toggleEmphasisCommand.key),
        s: () => ctx.get(commandsCtx).call(toggleStrikethroughCommand.key),
        e: () => ctx.get(commandsCtx).call(toggleInlineCodeCommand.key),
        t: () => ctx.get(commandsCtx).call(insertTableCommand.key, { row: 3, col: 3 })
      }

      return new Plugin({
        key,
        props: {
          handleKeyDown: (_view, event) => {
            const mod = event.ctrlKey || event.metaKey
            const alt = event.altKey
            /*
             * ⚠️ 判断字母键必须用 `event.code`，不能用 `event.key`：
             * macOS 上 Option + 字母会产出 `∫`(B) / `µ`(M) / `˚`(K) 这类特殊字符，
             * `event.key` 已经不是字母了，Alt+M 插图 / Alt+K 链接 / Alt+T 表格
             * 在 mac 上会完全没有反应。`event.code` 是物理键位（KeyM / KeyK），
             * 不受修饰键与输入法影响。
             */
            const keyLower = event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.key.toLowerCase()

            // Alt + M / Alt + K 需要弹窗，交给页面处理
            if (alt && !mod && (keyLower === 'm' || keyLower === 'k')) {
              event.preventDefault()
              const detail: EditorRequestDetail = { type: keyLower === 'm' ? 'image' : 'link' }
              root.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail, bubbles: true }))
              return true
            }

            // Alt + B / I / S / E / T 传统格式快捷键
            if (alt && !mod && legacyKeys[keyLower]) {
              event.preventDefault()
              legacyKeys[keyLower]()
              return true
            }

            return false
          }
        }
      })
    })

    /**
     * 链接浮层的两处定制
     *
     * 1. 文案中文化（官方默认是英文 + emoji 图标）
     * 2. 用 `plugins/link-edit.ts` 的实现替换官方的编辑浮层：
     *    同样是「就地变成输入框」，但会保留 `[文字](地址 "标题")` 的 title，
     *    也不会把正文里的链接整段选中（避免把格式工具条顶出来）。
     */
    const configureLinkTooltipChinese = (ctx: any) => {
      ctx.set(linkTooltipConfig.key, {
        ...ctx.get(linkTooltipConfig.key),
        inputPlaceholder: '输入链接地址，回车确认',
        confirmButton: '⏎',
        // 预览浮层最左边的「复制地址」按钮：换成 blossom 图标字体里的图标
        // （官方默认是 🔗 emoji，图标内容走 innerHTML，所以这里可以塞 span）
        linkIcon: '<span class="iconbl bl-a-texteditorstickup-line"></span>',
        editButton: '✎',
        removeButton: '✕',
        onCopyLink: () => {}
      })
    }

    this.editor = await Editor.make()
      // ---------- 基础配置 ----------
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, defaultValue)
        ctx.set(editorViewOptionsCtx, {
          attributes: {
            // 这两个 class 是样式挂载点：bl-preview 复用旧预览样式，bl-milkdown 是编辑器专属样式
            class: 'bl-milkdown bl-preview',
            spellcheck: 'false'
          },
          /*
           * 从 VSCode 复制的内容按普通文本黏贴。
           *
           * 放在这里而不是写成 `$prose` 插件：`EditorView.someProp` 先看编辑器自身的 props、
           * 再按顺序看插件 props，所以它一定排在 milkdown 的 clipboard 插件之前
           *（那个插件里有一段写死的 VSCode 分支，会把内容包成代码块）。
           * 其它黏贴它返回 false，交回 milkdown 原流程。详见 plugins/paste.ts。
           */
          handlePaste: handleVSCodePaste
        })

        // ---------- 文档变化回调 ----------
        ctx
          .get(listenerCtx)
          .updated((editorCtx: any, doc: any) => {
            if (this.applying) return
            /*
             * ⚠️ `listener.updated` 是 **200ms 防抖**的，而 `applying` 一个微任务就复位了。
             * 「刚打完字就切文章」时，回调会在 200ms 后才执行，手里拿着**上一篇**的
             * 事务（`doc` 是旧文档）；此时 `applying` 早已是 false，于是这篇刚打开、
             * 一个字没改的文章会被标成「有未保存内容」，还会触发一次多余保存。
             *
             * 判据：回调里的 doc 必须就是当前文档，否则说明这是整篇替换前残留的事务。
             */
            if (doc !== editorCtx.get(editorViewCtx).state.doc) return
            this.dirty = true
            onChange?.()
          })
          .blur(() => {
            // 失焦时不做处理，保留扩展点
          })
      })

      // ---------- 预设 ----------
      .use(commonmark)
      .use(gfm)

      // ---------- 官方插件 ----------
      .use(history)
      .use(listener)
      .use(clipboard)
      .use(indent)
      .use(cursor)
      .use(trailing)
      .use(upload)
      .config((ctx) => {
        ctx.set(uploadConfig.key, {
          /**
           * 拖拽 / 黏贴图片：上传到文档库后返回图片文件名，插入 image 节点。
           * 注意 src 保存的是**文件名**，与旧格式 `![](图片名.png)` 完全一致。
           */
          uploader: async (files: FileList, schema: any) => {
            const nodes: any[] = []
            for (const file of Array.from(files)) {
              if (!file.type.startsWith('image/')) continue
              if (!uploadImage) continue
              try {
                const fileName = await uploadImage(file)
                if (!fileName) continue
                nodes.push(schema.nodes.image.create({ src: fileName, alt: file.name }))
              } catch (e) {
                console.error('图片上传失败', e)
              }
            }
            return nodes
          },
          enableHtmlFileUploader: false,
          // 上传中的占位提示
          uploadWidgetFactory: (pos: number, spec: any) => {
            return Decoration.widget(
              pos,
              () => {
                const el = document.createElement('span')
                el.className = 'bl-uploading'
                el.textContent = '图片上传中…'
                return el
              },
              spec
            )
          }
        })
      })

      // ---------- 自定义插件 ----------
      .use(supSubPlugins)
      .use(fontColorPlugins)
      .use(mathPlugins)
      .use(blockDecoratorPlugin)
      // 表格 / 代码块 / 列表：直接使用官方组件，交互与 playground 一致
      .use(tablePlugins)
      .use(codeBlockPlugins)
      .use(listItemPlugins)
      .use(imageNodeView)
      // 禁止拖动正文内容（文字 / 图片），避免选字时误把段落搬走
      .use(dragGuardPlugins)
      // 从空行（空段落）按下拖动时，浏览器不会原生划选，这里补一段
      .use(emptyBlockDragPlugins)
      .use(linkPlugins)
      // 空段落紧跟在分割线 / 公式块后面时，Backspace 删掉空段落并选中上方节点
      .use(backspacePlugins)
      // 官方链接浮层（playground 同款）：悬停显示「复制 / 编辑 / 删除」，
      // 选中文字后由「设为链接」按钮 / Alt+K 在选区上方弹出输入框
      .use(linkTooltipPlugin)
      .use(shortcutPlugin)
      .use(slashPlugins)
      .use(selectionTooltipPlugins)
      .use(searchPlugins)

      // ---------- 需要 UI 的插件：注入 PluginSpec ----------
      // 这里的 config 必须在 use 之后执行，保证对应的 ctx slice 已注册
      .config(configureSlash)
      .config(configureSelectionTooltip)
      // 链接 mark 默认 inclusive=true（结束位置之后仍然生效），
      // 会让链接末尾接着输入的文字也被包进 <a>；这里在 schema 构建前改掉
      .config(configureLinkMark)
      // 官方链接浮层必须先注册，再覆盖它自己的编辑浮层（顺序不能反）
      .config(configureLinkTooltip)
      .config(configureLinkTooltipChinese)
      .config(configureBlLinkEdit)
      .config(configureTable)
      .config(configureCodeBlock)
      .config(configureListItem)

      .create()
  }

  //#region ------------------------------------------------ 内容读写 -------------------------------------------------

  /**
   * 读取当前 markdown
   *
   * 注意：这里做了一次 URL 归一化，把可能混进文档的
   * `blossom:\xxx.png?t=123` 还原成 `xxx.png`，
   * 保证保存到磁盘的内容始终是文档库中的相对引用。
   *
   * @returns markdown 文本；**序列化失败时返回 null**（调用方必须判空）
   *
   * 失败时绝不能返回空串：保存流程会直接把它写盘，一次序列化异常就等于
   * 把整篇文章清空（且此时「已保存」标记已经落下，无法补救）。
   * 这里返回 null 让调用方保留原内容并发提示，宁可这次不保存。
   */
  getMarkdown(): string | null {
    try {
      const md = this.editor.action((ctx) => ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc))
      return normalizeMarkdown(md ?? '')
    } catch (e) {
      console.error('导出 markdown 失败，本次内容不会被保存', e)
      return null
    }
  }

  /**
   * 整体替换内容（切换文章时使用）
   *
   * `replaceAll(md, true)` 会重建 EditorState，从而清空撤销历史，
   * 避免把上一篇文章的撤销记录带到新文章里。
   */
  setMarkdown(markdown: string) {
    this.applying = true
    try {
      this.editor.action(replaceAll(markdown ?? '', true))
      this.dirty = false
    } finally {
      // 等一次微任务，确保 listener 的同步回调已经执行完
      setTimeout(() => (this.applying = false), 0)
    }
  }

  /** 是否有未保存的改动 */
  isDirty() {
    return this.dirty
  }

  /** 手动标记为已保存 */
  markClean() {
    this.dirty = false
  }

  /** 在当前选区插入 markdown 片段 */
  insertMarkdown(markdown: string) {
    insertMarkdownCommand(this.editor, markdown)
  }

  /**
   * 以「和 Ctrl+V 完全一致」的方式黏贴纯文本
   *
   * 右键菜单里的「黏贴」以前是直接把剪贴板文本丢给 markdown 解析器，
   * 结果与真正的 Ctrl+V 不一致（代码块、表格里的表现尤其明显，
   * 内容可能落到代码块外面）。这里构造一个原生 paste 事件，
   * 让 milkdown 的 clipboard 插件走它自己的黏贴流程。
   *
   * @param text 剪贴板纯文本
   */
  pasteText(text: string) {
    if (!text) return
    let pasted = false
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.focus()
      try {
        const data = new DataTransfer()
        data.setData('text/plain', text)
        const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
        view.dom.dispatchEvent(event)
        pasted = true
      } catch (e) {
        console.error('模拟黏贴失败，退回 markdown 插入', e)
      }
    })
    // 浏览器不支持构造 ClipboardEvent 时退回原来的解析插入
    if (!pasted) insertMarkdownCommand(this.editor, text)
  }

  //#endregion

  //#region ------------------------------------------------ 命令 -------------------------------------------------

  /** 执行工具栏命令 */
  run(name: EditorCommandName, payload?: any) {
    runCommand(this.editor, name, payload)
  }

  /** 选中内容转大写 / 小写（右键菜单用） */
  toCase(upper: boolean) {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { state } = view
      const { from, to } = state.selection
      if (from === to) return
      const text = state.doc.textBetween(from, to, '\n')
      const next = upper ? text.toLocaleUpperCase() : text.toLocaleLowerCase()
      if (text === next) return
      view.dispatch(state.tr.replaceWith(from, to, state.schema.text(next)))
    })
  }

  /**
   * 打开链接输入浮层（Alt+K 走这里）
   *
   * 两种情况，用的是同一个 inline 输入框（plugins/link-edit.ts）：
   *
   * - 选区 / 光标已经在链接内 -> 直接进入「编辑」态。
   *   不能沿用官方的 `toggleLinkCommand`：它是 toggle 语义，再按一次会把链接**删掉**。
   * - 否则 -> 进入「新增」态，在选区上方弹出空输入框；没有选区时输入的地址会作为链接文字插入。
   */
  openLinkTooltip() {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const linkType = view.state.schema.marks.link
      const found = linkType ? findLinkRange(view.state, linkType) : null
      if (found) {
        ctx.get(linkTooltipAPI.key).editLink(found.mark, found.from, found.to)
        return
      }
      ctx.get(commandsCtx).call(linkTooltipToggleCommand.key)
    })
  }

  //#region ------------------------------------------------ 正文查找 -------------------------------------------------

  /** 读取当前查找结果 */
  getSearchResult(): SearchResult {
    const state: any = this.editor.action((ctx) => searchPluginKey.getState(ctx.get(editorViewCtx).state))
    return { total: state?.matches?.length ?? 0, current: state?.current ?? -1 }
  }

  /** 设置查找关键字（空字符串等于清空） */
  search(query: string): SearchResult {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr.setMeta(searchPluginKey, { type: 'set', query: query ?? '' }))
    })
    this.scrollToCurrentMatch()
    return this.getSearchResult()
  }

  /** 跳到下一个 / 上一个命中（dir: 1 下一个，-1 上一个） */
  searchStep(dir: 1 | -1): SearchResult {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr.setMeta(searchPluginKey, { type: dir > 0 ? 'next' : 'prev' }))
    })
    this.scrollToCurrentMatch()
    return this.getSearchResult()
  }

  /** 清空查找与高亮 */
  clearSearch() {
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr.setMeta(searchPluginKey, { type: 'clear' }))
    })
  }

  /**
   * 把当前命中滚动到视野中间
   *
   * 装饰是在下一帧才渲染成 DOM 的，所以这里等一帧再查找
   * `.bl-search-match-current`，否则拿到的还是上一轮的元素。
   *
   * 同样不用 `scrollIntoView`（原因见 `scrollToHeading`），只滚自己的容器。
   */
  private scrollToCurrentMatch() {
    requestAnimationFrame(() => {
      const el = this.root.querySelector<HTMLElement>('.bl-search-match-current')
      if (!el) return
      const container = this.root
      const rect = el.getBoundingClientRect()
      const current = container.scrollTop
      // 让命中的正中与容器正中重合
      const centered = rect.top - container.getBoundingClientRect().top + current - (container.clientHeight - rect.height) / 2
      container.scrollTo({ top: Math.min(Math.max(centered, 0), this.maxContentScrollTop()) })
    })
  }

  //#endregion

  /**
   * 修改图片节点属性
   *
   * 宽度与阴影都写在 markdown 的 alt 里（`![名称##shadow##w100](a.png)`），
   * 所以这里直接改 `alt`，保存时由 milkdown 序列化回标准图片语法。
   *
   * @param pos   图片节点在文档中的位置
   * @param attrs 需要覆盖的属性
   */
  updateImageAttrs(pos: number, attrs: Record<string, any>) {
    if (pos < 0) return
    this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const node = view.state.doc.nodeAt(pos)
      if (!node || node.type.name !== 'image') return
      view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }))
    })
  }

  /**
   * 复制当前选区
   *
   * 用 `document.execCommand('copy')` 而不是自己拼文本：
   * 这样触发的是浏览器 / ProseMirror 原生的 copy 事件处理，
   * 结果与 Ctrl+C 完全一致（同时写入 text/plain 与 text/html），
   * 黏贴到其它富文本编辑器时格式不会丢。
   */
  copySelection(): boolean {
    return this.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const { from, to } = view.state.selection
      if (from === to) return false
      view.focus()
      try {
        return document.execCommand('copy')
      } catch (e) {
        console.error('复制失败', e)
        return false
      }
    })
  }

  /** 聚焦编辑器 */
  focus() {
    this.editor.action((ctx) => ctx.get(editorViewCtx).focus())
  }

  /** 拿到 ProseMirror 的 EditorView（右键菜单等场景需要） */
  getView(): any {
    return this.editor.action((ctx) => ctx.get(editorViewCtx))
  }

  //#endregion

  //#region ------------------------------------------------ 目录 -------------------------------------------------

  /**
   * 获取标题列表（用于右侧目录）
   *
   * 直接读渲染后的 DOM 而不是文档模型，因为点击目录需要滚动到**真实元素**，
   * 用 DOM 顺序做索引最稳妥（不需要给 heading 维护 id）。
   */
  getHeadings(): HeadingItem[] {
    const nodes = this.root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
    return Array.from(nodes).map((el, index) => ({
      level: Number(el.tagName.substring(1)),
      text: el.textContent ?? '',
      index,
      // 正文里给标题上的局部文字颜色，按段带到目录
      runs: headingRuns(el)
    }))
  }

  /**
   * 滚动到正文顶部
   *
   * 与 `scrollToHeading` 一样只滚自己的容器（`.editor-wysiwyg`），不碰祖先。
   */
  scrollToTop() {
    this.root.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * 滚动到正文底部
   *
   * 上限同样用 `maxContentScrollTop()`：停在正文最后一行下方 40px 处，
   * 不会把那 40vh 的书写余量整片翻出来。
   */
  scrollToBottom() {
    this.root.scrollTo({ top: this.maxContentScrollTop(), behavior: 'smooth' })
  }

  /**
   * 容器还能往下滚多少
   *
   * `.bl-milkdown` 的底部留了 40vh 的「书写余量」（见 bl-milkdown.css），
   * 那是给打字时留的呼吸空间，不能让「跳转 / 查找」把它翻出来 ——
   * 否则一跳到文末，屏幕上就会多出一大片空白。
   *
   * @returns 允许滚动到的最大 scrollTop
   */
  private maxContentScrollTop(): number {
    const container = this.root
    const content = container.querySelector<HTMLElement>('.bl-milkdown')
    const paddingBottom = content ? parseFloat(getComputedStyle(content).paddingBottom) || 0 : 0
    // 保留 40px 呼吸空间，超出的书写余量不计入可滚动范围
    const BOTTOM_GAP = 40
    return Math.max(0, container.scrollHeight - container.clientHeight - Math.max(0, paddingBottom - BOTTOM_GAP))
  }

  /**
   * 滚动到第 index 个标题
   *
   * ⚠️ 这里**不能**用 `el.scrollIntoView()`：
   *
   * 1. `scrollIntoView` 会滚动**所有**可滚动的祖先（包括 `overflow: hidden` 的
   *    `.editor-body`），一旦某个祖先被滚走，整个编辑区 + 目录栏都会上移，
   *    底部露出一片空白，而且没有任何滚动条可以还原。
   * 2. 它也不认识底部那 40vh 的书写余量，跳到末尾几个标题时会一直滚到最底，
   *    把一大片空白翻出来（实测空白从 40px 变成 400+px）。
   *
   * 所以改成自己算：只滚 `this.root` 这个容器，并且把上限卡在「正文内容底部」。
   *
   * @param index 标题在 `getHeadings()` 结果中的下标
   */
  scrollToHeading(index: number) {
    const nodes = this.root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')
    const el = nodes[index]
    if (!el) return

    const container = this.root
    // 标题距离容器顶部留一点空隙，读起来更舒服
    const TOP_GAP = 12
    const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - TOP_GAP

    container.scrollTo({ top: Math.min(Math.max(offset, 0), this.maxContentScrollTop()), behavior: 'smooth' })
  }

  //#endregion

  /** 销毁编辑器 */
  async destroy() {
    try {
      await this.editor?.destroy()
    } catch (e) {
      console.error('销毁编辑器失败', e)
    }
    // milkdown 会把根节点里的内容清掉，这里再兜底一次
    this.root.innerHTML = ''
  }
}

/**
 * markdown 归一化：把编辑器内部用到的协议地址还原成文档库相对引用
 *
 * 例如 `![x](blossom:\a.png?t=1710000000)` => `![x](a.png)`
 */
export const normalizeMarkdown = (markdown: string): string => {
  let md = markdown

  // 1. 还原图片 / 链接里被写进来的自定义协议，保证磁盘上始终是文档库相对引用
  if (md.includes('blossom:')) {
    md = md.replace(
      /(!?\[[^\]]*\]\()\s*(blossom:\\?)([^)\s?]+)(\?[^)\s]*)?\s*(\))/g,
      (_m, prefix, _proto, path, _query, suffix) => `${prefix}${path}${suffix}`
    )
  }

  // 2. remark-stringify 会把行首的 `##` 转义成 `\##`（避免被解析成标题），
  //    而 `##green##` 是 Blossom 的引用颜色标记，必须原样写回文件，
  //    否则旧版客户端或直接看源码时会多出一个反斜杠。
  md = md.replace(/^((?:\s*>)*\s*)\\{1,2}##/gm, '$1##')

  return md
}
