/**
 * ============================================================================
 * 黏贴：从 VSCode 复制的内容按普通文本插入
 * ============================================================================
 *
 * ## 现象
 *
 * 从 VSCode 复制代码后黏贴，内容会被自动包进一个多行代码块（```），
 * 期望是按普通文本插入。
 *
 * ## 根因（第三方既有行为，没有开关可配）
 *
 * `@milkdown/plugin-clipboard` 的 `handlePaste` 里有一段 **VSCode 专用分支**：
 * 只要剪贴板里带 `vscode-editor-data` 这个私有格式（VSCode 复制任何内容都会写入，
 * JSON 里带 `mode`，也就是当前文件类型），就把 `text/plain` 整段塞进 `code_block`
 * 节点，并把 `mode` 当作代码块语言。见
 * `node_modules/@milkdown/plugin-clipboard/lib/index.js` 的 `handlePaste`：
 *
 * ```js
 * const vscodeData = clipboardData.getData('vscode-editor-data')
 * if (vscodeData) { ... tr.replaceSelectionWith(codeBlock.create({ language })) ... }
 * ```
 *
 * 这段逻辑在插件内部硬编码：既没有配置项能关掉，也不会因为剪贴板里同时存在
 * `text/html` 而跳过，所以只能在集成层接管这一次黏贴。
 *
 * ## 处理方式
 *
 * 挂在 `editorViewOptionsCtx.handlePaste` 上，而不是再写一个 `$prose` 插件：
 * `EditorView.someProp` 先查编辑器自身的 props、再按顺序查插件 props，
 * 所以这个 handler 一定排在 milkdown 的 clipboard 插件之前，与 `.use()` 的顺序无关。
 *
 * 只有「带 VSCode 私有格式 + 有纯文本」这一种黏贴返回 true；
 * 其它黏贴（图片、网页富文本、从本编辑器或其它编辑器复制）一律返回 false，
 * 完全交回 milkdown 原来的流程。
 *
 * ## 触发条件与影响范围
 *
 * - 触发：剪贴板里存在 `vscode-editor-data`，且 `text/plain` 非空
 * - 影响：只有这一种黏贴变成纯文本；代码块内（CodeMirror 自己的 contenteditable）不接管
 * - 不触发：浏览器 / 其它编辑器 / 从本编辑器复制 —— 它们不带这个私有格式
 */

import type { Schema } from '@milkdown/kit/prose/model'
import { Fragment, Slice } from '@milkdown/kit/prose/model'
import type { EditorView } from '@milkdown/kit/prose/view'

/** VSCode 写在剪贴板里的私有格式，内容是 JSON：`{ version, mode, ... }` */
const VSCODE_FLAVOR = 'vscode-editor-data'

/**
 * 纯文本 => 一段一行
 *
 * 与 ProseMirror 自己的纯文本黏贴保持一致：`\r\n` / `\r` 归一化后按行切开，
 * 每行一个段落，空行跳过（`Slice.maxOpen` 让首尾段可以与上下文合并，
 * 在段落中间黏贴时不会硬生生把段落切开）。
 *
 * 这里**刻意不做 markdown 解析**：代码里的 `#`、`-`、`*`、`>` 只是普通字符，
 * 一旦被当成标题 / 列表 / 引用写进文档，就再也还原不回原来的代码了。
 *
 * @param schema 当前文档的 schema
 * @param text   剪贴板里的纯文本
 */
const plainTextSlice = (schema: Schema, text: string): Slice => {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0)
  const blocks = lines.map((line) => schema.nodes.paragraph.create(null, schema.text(line)))
  return Slice.maxOpen(Fragment.fromArray(blocks), true)
}

/**
 * 接管「从 VSCode 复制」的黏贴，按普通文本插入
 *
 * @param view  ProseMirror 的 EditorView
 * @param event 原生 paste 事件
 * @returns 是否已经处理（false 表示交回 milkdown 的黏贴流程）
 */
export const handleVSCodePaste = (view: EditorView, event: ClipboardEvent): boolean => {
  const data = event.clipboardData
  if (!data) return false

  // 黏贴的是文件（图片等）：交给 milkdown 的 upload 插件，别抢
  if (data.files?.length) return false

  // 没有 VSCode 私有格式：不是从 VSCode 复制的，别插手
  if (!data.getData(VSCODE_FLAVOR)) return false

  // 代码块内是 CodeMirror 自己的 contenteditable，黏贴交给它处理（与 milkdown 的判断一致）
  if (view.state.selection.$from.node().type.spec.code) return false

  const text = data.getData('text/plain')
  if (!text) return false

  const slice = plainTextSlice(view.state.schema, text)
  // 只有空行：没有可插入的内容，吃掉这次黏贴即可（否则会落进 milkdown 的代码块分支）
  if (!slice.size) return true

  const tr = view.state.tr.replaceSelection(slice)
  if (tr.docChanged) {
    view.dispatch(tr.scrollIntoView())
    return true
  }

  /*
   * 块级内容放不进去，典型场景是光标在标题里（标题只接受行内内容）。
   * 退化成一行纯文本插进去，至少不会把代码块塞进标题。
   */
  view.dispatch(view.state.tr.insertText(text.replace(/\s*\n\s*/g, ' ')))
  return true
}
