/**
 * ============================================================================
 * 上标 / 下标 插件
 * ============================================================================
 *
 * ## 为什么需要自己实现
 *
 * CommonMark / GFM 都没有上标、下标语法, Blossom 历史文章使用的是**行内 HTML**：
 *
 * ```md
 * 水的化学式是 H<sub>2</sub>O，平方是 x<sup>2</sup>
 * ```
 *
 * Milkdown 的 commonmark preset 会把行内 HTML 解析成 `html` 节点，并在编辑器里
 * **原样显示 `<sub>` 这几个字符**。这显然不符合所见即所得的要求。
 *
 * ## 实现思路（两条链路）
 *
 * 1. **解析链路**：remark 转换器把 `html(<sup>) + text(...) + html(</sup>)`
 *    这一组兄弟节点合并成自定义 mdast 节点 `{ type: 'sup', children }`，
 *    合并逻辑复用 plugins/html-pair.ts。
 *
 * 2. **序列化链路**：mdast 里没有 `sup` / `sub` 节点类型，
 *    `mdast-util-to-markdown` 遇到未知节点会直接抛错。所以通过 unified 官方的
 *    `toMarkdownExtensions` 机制注册 handler，把节点重新写回 `<sup>...</sup>`。
 *
 * 中间层（ProseMirror）是两个普通 mark，DOM 分别是 `<sup>` 与 `<sub>`。
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $command, $markSchema, $remark } from '@milkdown/kit/utils'
import { toggleMark } from '@milkdown/kit/prose/commands'
import { createInlineHtmlHandler, pairHtmlTags } from './html-pair'
import type { TagMatch } from './html-pair'

/** 支持的标签与对应的 mdast 节点名（两者保持一致，便于 handler 复用） */
const TAGS = ['sup', 'sub'] as const
type TagName = (typeof TAGS)[number]

const isTag = (value: string): value is TagName => TAGS.includes(value as TagName)

/**
 * 判断一个 html 节点是不是上标/下标的开闭标签
 */
const matchTag = (value: string): TagMatch => {
  // <sup> / <sub>
  const open = /^<([a-z]+)\s*>$/i.exec(value)
  if (open) {
    const tag = open[1].toLowerCase()
    // tag 字段供 html-pair 校验闭标签同名：`<sup>2<sub>i</sub></sup>` 不能提前闭合
    return isTag(tag) ? { type: tag, tag } : null
  }
  // </sup> / </sub>
  const close = /^<\/([a-z]+)\s*>$/i.exec(value)
  if (close) {
    const tag = close[1].toLowerCase()
    return isTag(tag) ? { close: tag } : null
  }
  return null
}

/**
 * remark 插件：
 * 解析时把 `<sup>`/`<sub>` 合并为 mdast 节点；序列化时把它们写回行内 HTML。
 */
export const remarkSupSub = function (this: any) {
  const data = this.data()

  const toMarkdownExtensions = (data.toMarkdownExtensions ||= [])
  toMarkdownExtensions.push({
    handlers: {
      sup: createInlineHtmlHandler((_node, content) => `<sup>${content}</sup>`),
      sub: createInlineHtmlHandler((_node, content) => `<sub>${content}</sub>`)
    }
  })

  return (tree: any) => {
    tree.children = pairHtmlTags(tree.children, matchTag)
  }
}

/** remark 插件实例，供编辑器 use */
export const supSubRemarkPlugin = $remark('blSupSub', () => remarkSupSub)

/** 生成上标 / 下标的 mark schema */
const createSchema = (name: TagName) =>
  $markSchema(name, () => ({
    // 从富文本粘贴进来的 <sup> / <sub>
    parseDOM: [{ tag: name }],
    toDOM: () => [name, 0],
    parseMarkdown: {
      match: (node: any) => node.type === name,
      runner: (state: any, node: any, markType: any) => {
        state.openMark(markType)
        state.next(node.children)
        state.closeMark(markType)
      }
    },
    toMarkdown: {
      match: (mark: any) => mark.type.name === name,
      runner: (state: any, mark: any) => {
        // 生成 mdast 节点 { type: 'sup' }，由上面的 handler 写回 HTML
        state.withMark(mark, name)
      }
    }
  }))

export const superscriptSchema = createSchema('sup')
export const subscriptSchema = createSchema('sub')

/** 工具栏 / 快捷键使用的命令 */
export const toggleSuperscriptCommand = $command('ToggleSuperscript', (ctx) => () => toggleMark(superscriptSchema.type(ctx)))
export const toggleSubscriptCommand = $command('ToggleSubscript', (ctx) => () => toggleMark(subscriptSchema.type(ctx)))

/** 插件集合（`$remark` 返回的是元组，需要 flat 一层） */
export const supSubPlugins = [
  supSubRemarkPlugin,
  superscriptSchema,
  subscriptSchema,
  toggleSuperscriptCommand,
  toggleSubscriptCommand
].flat() as unknown as MilkdownPlugin[]
