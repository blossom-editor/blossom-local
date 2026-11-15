/**
 * ============================================================================
 * 文字颜色插件（`<font color="...">`）
 * ============================================================================
 *
 * Blossom 的历史文章里，文字颜色一直是**行内 HTML**：
 *
 * ```md
 * 这是 <font color="#e74c3c">红色</font> 文字
 * ```
 *
 * 旧版 marked 会把行内 HTML 原样输出，所以这个格式在旧客户端、只读预览窗口
 * （ArticleViewWindow）里都能正常显示。为了不破坏这些既有内容和跨端兼容性，
 * 这里继续沿用 `<font>` 标签，而不是换成 `<span style="color:xxx">`。
 *
 * 实现方式与上标/下标完全一致（解析合并 + 序列化写回），见 plugins/html-pair.ts：
 *
 * 1. 解析：`html(<font color="x">)` + 文本 + `html(</font>)` -> mdast `{type:'fontColor', attrs:{color}}`
 * 2. 序列化：`toMarkdownExtensions` 注册 handler，写回 `<font color="x">...</font>`
 *
 * 中间层是一个带 `color` 属性的 mark，所以可以像加粗一样对任意选区应用/取消。
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $command, $markSchema, $remark } from '@milkdown/kit/utils'
import { toggleMark } from '@milkdown/kit/prose/commands'
import { createInlineHtmlHandler, pairHtmlTags } from './html-pair'
import type { TagMatch } from './html-pair'

/**
 * 预设颜色，UI（浮动工具条 / 右键菜单）直接复用这份数据
 * 选择一些在明暗主题下都能看清的颜色
 */
export const FONT_COLORS: { name: string; value: string }[] = [
  { name: '红色', value: '#e74c3c' },
  { name: '橙色', value: '#e67e22' },
  { name: '黄色', value: '#d4a017' },
  { name: '绿色', value: '#27ae60' },
  { name: '蓝色', value: '#2980b9' },
  { name: '紫色', value: '#8e44ad' },
  { name: '灰色', value: '#7f8c8d' }
]

/** mdast 节点类型名 */
const MD_NODE_TYPE = 'fontColor'

/** 匹配 `<font color="xxx">` / `<font color=xxx>` */
const OPEN_TAG_RE = /^<font\s+color\s*=\s*["']?([^"'>\s]+)["']?\s*>$/i
/** 匹配 `</font>` */
const CLOSE_TAG_RE = /^<\/font\s*>$/i

/**
 * 判断 html 节点是否为 font 的开闭标签
 */
const matchTag = (value: string): TagMatch => {
  const open = OPEN_TAG_RE.exec(value)
  // tag 供 html-pair 校验闭标签同名（`</font>` 只闭合 `<font color>`）
  if (open) return { type: MD_NODE_TYPE, tag: 'font', attrs: { color: open[1] } }
  if (CLOSE_TAG_RE.test(value)) return { close: 'font' }
  return null
}

/** remark 插件：解析合并 + 序列化写回 */
export const remarkFontColor = function (this: any) {
  const data = this.data()

  const toMarkdownExtensions = (data.toMarkdownExtensions ||= [])
  toMarkdownExtensions.push({
    handlers: {
      [MD_NODE_TYPE]: createInlineHtmlHandler((node, content) => `<font color="${node.color ?? ''}">${content}</font>`)
    }
  })

  return (tree: any) => {
    tree.children = pairHtmlTags(tree.children, matchTag)
  }
}

export const fontColorRemarkPlugin = $remark('blFontColor', () => remarkFontColor)

/** mark schema */
export const fontColorSchema = $markSchema('font_color', () => ({
  attrs: {
    color: { default: '', validate: 'string' }
  },
  /*
   * 只识别 `<font color>`（本项目的存储格式）。
   *
   * ⚠️ 不要加 `{ style: 'color' }` 规则：那会把任意网页 / VS Code / Word 里
   * 带 `style="color:#xxx"` 的文本都转成 font_color，黏贴后 markdown 里会多出
   * 一堆 `<font color="rgb(...)">`，既污染正文也让黏贴结果看起来「格式乱掉」。
   */
  parseDOM: [
    {
      tag: 'font[color]',
      getAttrs: (dom: HTMLElement) => ({ color: dom.getAttribute('color') ?? '' })
    }
  ],
  toDOM: (mark: any) => ['font', { color: mark.attrs.color }, 0],
  parseMarkdown: {
    match: (node: any) => node.type === MD_NODE_TYPE,
    runner: (state: any, node: any, markType: any) => {
      state.openMark(markType, { color: node.color ?? '' })
      state.next(node.children)
      state.closeMark(markType)
    }
  },
  toMarkdown: {
    match: (mark: any) => mark.type.name === 'font_color',
    runner: (state: any, mark: any) => {
      // 第 4 个参数会直接展开进 mdast 节点，所以最终得到 { type:'fontColor', color, children }
      state.withMark(mark, MD_NODE_TYPE, undefined, { color: mark.attrs.color })
    }
  }
}))

/** 给选区设置颜色 */
export const setFontColorCommand = $command('SetFontColor', (ctx) => (color?: string) => {
  return (state: any, dispatch?: any) => {
    if (!color) return false
    return toggleMark(fontColorSchema.type(ctx), { color })(state, dispatch)
  }
})

/** 清除选区颜色 */
export const unsetFontColorCommand = $command('UnsetFontColor', (ctx) => () => (state: any, dispatch?: any) => {
  const type = fontColorSchema.type(ctx)
  const { from, to } = state.selection
  if (from === to) return false
  // 找出选区里所有 font_color mark 的区间，逐一移除
  const tr = state.tr
  state.doc.nodesBetween(from, to, (node: any, pos: number, parent: any) => {
    if (!node.isText) return
    const mark = type.isInSet(node.marks)
    if (!mark) return
    tr.removeMark(Math.max(pos, from), Math.min(pos + node.nodeSize, to), type)
  })
  if (!tr.docChanged) return false
  dispatch?.(tr)
  return true
})

/** 插件集合 */
export const fontColorPlugins = [fontColorRemarkPlugin, fontColorSchema, setFontColorCommand, unsetFontColorCommand].flat() as unknown as MilkdownPlugin[]
