/**
 * ============================================================================
 * 编辑器命令集合
 * ============================================================================
 *
 * 把「工具栏 / 快捷键 / 右键菜单」需要的能力集中在这里，页面（ArticleIndex.vue）
 * 只需要调用 `runCommand(editor, 'bold')` 这样的语义化命令，不关心
 * milkdown / ProseMirror 的实现细节，做到高内聚低耦合。
 *
 * 命令分两类：
 *
 * 1. **milkdown 内置命令**：直接 `ctx.get(commandsCtx).call(xxxCommand.key)`
 * 2. **需要访问 ProseMirror 事务的命令**：例如「给引用设置颜色」「切换任务列表」，
 *    这类命令 milkdown 没有提供，用 `view.dispatch(tr)` 手写
 */

import type { Editor } from '@milkdown/kit/core'
import { commandsCtx, editorViewCtx, parserCtx, schemaCtx } from '@milkdown/kit/core'
import {
  createCodeBlockCommand,
  insertHrCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand
} from '@milkdown/kit/preset/commonmark'
import { insertTableCommand, toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { toggleSubscriptCommand, toggleSuperscriptCommand } from './plugins/sup-sub'
import { QUOTE_MARKER_RE, isQuoteColor } from './plugins/block-marker'
import type { QuoteColor } from './plugins/block-marker'
import { insert as insertMacro } from '@milkdown/kit/utils'
import { Fragment } from '@milkdown/kit/prose/model'

/**
 * 工具栏命令名，与 EditorTools.vue 中的图标一一对应
 */
export type EditorCommandName =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'sup'
  | 'sub'
  | 'separator'
  | 'blockquote'
  | 'blockquoteBlack'
  | 'blockquoteGreen'
  | 'blockquoteYellow'
  | 'blockquoteRed'
  | 'blockquoteBlue'
  | 'blockquotePurple'
  | 'code'
  | 'pre'
  | 'checkbox'
  | 'unordered'
  | 'ordered'
  | 'table'
  | 'image'

/** 彩色引用命令与颜色的映射 */
const QUOTE_COLOR_MAP: Record<string, QuoteColor> = {
  blockquoteBlack: 'black',
  blockquoteGreen: 'green',
  blockquoteYellow: 'yellow',
  blockquoteRed: 'red',
  blockquoteBlue: 'blue',
  blockquotePurple: 'purple'
}

/**
 * 找到选区所在的 blockquote
 * @returns 节点自身与它在文档中的位置
 */
const findBlockquote = (state: any) => {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'blockquote') {
      return { node: $from.node(depth), pos: $from.before(depth) }
    }
  }
  return null
}

/**
 * 找到节点内部第一个文本节点的起始位置（blockquote 内容从 pos+2 开始）
 */
const firstTextPos = (node: any, pos: number) => {
  let cursor = pos + 1
  let child = node.firstChild
  while (child) {
    if (child.isText) return cursor
    child = child.firstChild
    cursor += 1
  }
  return pos + 2
}

/**
 * 给当前引用设置颜色
 *
 * 实现约定与旧版一致：颜色以 `> ##green##` 的标记形式写在引用第一行，
 * 编辑器里通过 Decoration 把该标记隐藏（见 plugins/block-marker.ts）。
 */
const setQuoteColor = (ctx: any, color: QuoteColor) => {
  const view = ctx.get(editorViewCtx)
  const schema = ctx.get(schemaCtx)

  // 1. 如果选区不在引用内，先包一层引用
  if (!findBlockquote(view.state)) {
    ctx.get(commandsCtx).call(wrapInBlockquoteCommand.key)
  }

  const found = findBlockquote(view.state)
  if (!found) return

  const marker = `##${color}##`
  const textPos = firstTextPos(found.node, found.pos)
  const firstText = found.node.textBetween(0, Math.min(found.node.content.size, 40), '\n', '\n')
  const existed = QUOTE_MARKER_RE.exec(firstText)

  const tr = view.state.tr
  if (existed) {
    // 已有颜色标记：原地替换
    tr.replaceWith(textPos, textPos + existed[0].length, schema.text(marker))
  } else {
    // 没有颜色标记：插到引用第一行最前面
    tr.insert(textPos, schema.text(marker))
  }
  view.dispatch(tr.scrollIntoView())
}

/**
 * 切换任务列表（复选框）
 *
 * - 光标在列表项内：在「普通列表项」与「未勾选任务项」之间切换
 * - 不在列表内：先创建无序列表，再转成任务项
 */
const toggleTaskList = (ctx: any) => {
  const view = ctx.get(editorViewCtx)
  const commands = ctx.get(commandsCtx)

  const findListItem = (state: any) => {
    const { $from } = state.selection
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === 'list_item') return $from.before(depth)
    }
    return -1
  }

  if (findListItem(view.state) < 0) {
    commands.call(wrapInBulletListCommand.key)
  }

  const pos = findListItem(view.state)
  if (pos < 0) return

  const node = view.state.doc.nodeAt(pos)
  if (!node) return

  // gfm 的任务列表项通过 checked 属性控制：null = 普通列表项, false = 未勾选
  const nextChecked = node.attrs.checked === false ? null : false
  view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: nextChecked }))
}

/**
 * 判断光标是否位于表格单元格内
 */
const isInTableCell = (state: any): boolean => {
  const { $from } = state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name
    if (name === 'table_cell' || name === 'table_header') return true
  }
  return false
}

/**
 * 以纯文本形式插入内容（保留换行，换行转成软换行节点）
 *
 * 表格单元格只允许段落内容，直接插入多块结构（第二个表格、标题、代码块等）
 * 会让 ProseMirror 的 slice 适配失败，导致结构错乱，因此单元格内统一走这里。
 */
const insertPlainText = (view: any, text: string) => {
  const { state } = view
  const { schema } = state
  const nodes: any[] = []

  text.split(/\r?\n/).forEach((line, index) => {
    if (index > 0 && schema.nodes.hardbreak) nodes.push(schema.nodes.hardbreak.create())
    if (line) nodes.push(schema.text(line))
  })
  if (nodes.length === 0) return

  const { from, to } = state.selection
  view.dispatch(state.tr.replaceWith(from, to, Fragment.fromArray(nodes)).scrollIntoView())
}

/**
 * 把 markdown 文本插入到当前选区（右键黏贴、右键插入图片等场景使用）
 *
 * 走一边 markdown 解析，因此黏贴 `![x](a.png)` 这类内容会得到真正的图片节点，
 * 而不是一段纯文本。`insert` 宏会根据当前选区计算 slice 的 openStart/openEnd，
 * 所以插入行内内容时不会把整个段落替换掉。
 *
 * 特殊处理：**表格单元格内**如果解析结果是多个块（例如整段复制过来的表格/列表），
 * 退回成纯文本插入，避免破坏表格结构。
 */
export const insertMarkdown = (editor: Editor, markdown: string) => {
  if (!markdown) return

  editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)

    if (isInTableCell(view.state)) {
      // 只允许「单个段落」的解析结果走富文本插入，其余一律按纯文本处理
      const parsed = ctx.get(parserCtx)(markdown)
      const simple = parsed && parsed.childCount <= 1 && (!parsed.firstChild || parsed.firstChild.type.name === 'paragraph')
      if (!simple) {
        insertPlainText(view, markdown)
        return
      }
    }

    insertMacro(markdown)(ctx)
  })

  editor.action((ctx) => ctx.get(editorViewCtx).focus())
}

/**
 * 执行工具栏命令
 *
 * @param editor milkdown Editor 实例
 * @param name   命令名
 * @param payload 附加参数（表格行数、代码块语言等）
 */
export const runCommand = (editor: Editor, name: EditorCommandName, payload?: any) => {
  editor.action((ctx) => {
    const commands = ctx.get(commandsCtx)

    switch (name) {
      // ---------------- 行内格式 ----------------
      case 'bold':
        commands.call(toggleStrongCommand.key)
        break
      case 'italic':
        commands.call(toggleEmphasisCommand.key)
        break
      case 'strike':
        commands.call(toggleStrikethroughCommand.key)
        break
      case 'sup':
        commands.call(toggleSuperscriptCommand.key)
        break
      case 'sub':
        commands.call(toggleSubscriptCommand.key)
        break
      case 'code':
        commands.call(toggleInlineCodeCommand.key)
        break

      // ---------------- 块级结构 ----------------
      case 'separator':
        commands.call(insertHrCommand.key)
        break
      case 'blockquote':
        commands.call(wrapInBlockquoteCommand.key)
        break
      case 'pre':
        commands.call(createCodeBlockCommand.key, payload ?? 'text')
        break
      case 'checkbox':
        toggleTaskList(ctx)
        break
      case 'unordered':
        commands.call(wrapInBulletListCommand.key)
        break
      case 'ordered':
        commands.call(wrapInOrderedListCommand.key)
        break
      case 'table':
        commands.call(insertTableCommand.key, payload ?? { row: 2, col: 2 })
        break

      // ---------------- 彩色引用 ----------------
      case 'blockquoteBlack':
      case 'blockquoteGreen':
      case 'blockquoteYellow':
      case 'blockquoteRed':
      case 'blockquoteBlue':
      case 'blockquotePurple': {
        const color = QUOTE_COLOR_MAP[name]
        if (isQuoteColor(color)) setQuoteColor(ctx, color)
        break
      }

      // image 需要 UI 交互（选择文件），由页面层处理；
      // 链接不再出现在工具栏里（改为选中文字后的浮动工具条 + Alt+K），因此没有对应命令
      case 'image':
        break

      default:
        break
    }
  })
}
