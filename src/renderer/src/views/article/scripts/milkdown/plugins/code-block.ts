/**
 * ============================================================================
 * 多行代码块：官方 code-block 组件（CodeMirror）
 * ============================================================================
 *
 * Milkdown 官方 playground / Crepe 的代码块并不是简单的 `<pre><code>`，
 * 而是 `@milkdown/components` 提供的 `codeBlockComponent`：
 *
 * - 内部用 CodeMirror 6 渲染，光标、选区、缩进、搜索都是编辑器级别的完整能力
 *   （之前用 `<pre>` + 装饰按钮时，空代码块点不进去、光标看不见，就是因为
 *    `<pre>` 里塞了 `contenteditable=false` 的挂件）
 * - 语言选择器带搜索，语言列表来自 `@codemirror/language-data`，语法高亮由
 *   CodeMirror 的 `HighlightStyle` 完成
 * - 右上角自带复制按钮
 *
 * 我们只做三件事：
 * 1. 传入语言列表与中文文案
 * 2. 用「CSS 变量」写一套 CodeMirror 主题，让明暗主题切换时自动变色
 * 3. 语法高亮配色同样走 CSS 变量（见 styles/bl-milkdown.css 的 `--bl-code-*`）
 */

import type { Ctx } from '@milkdown/kit/ctx'
import { codeBlockComponent, codeBlockConfig } from '@milkdown/kit/component/code-block'
import { basicSetup } from 'codemirror'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { tags as t } from '@lezer/highlight'

/**
 * CodeMirror 主题
 *
 * 颜色全部使用 CSS 变量，属于「运行时取值」，所以不需要在切换明暗主题时重建编辑器。
 */
const cmTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--bl-code-text)',
    // 字号跟随「设置 - 编辑器 - 代码块字体大小」，由 ArticleIndex 以内联 CSS 变量下发
    fontSize: 'var(--bl-code-font-size, 13px)'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '.cm-content': {
    fontFamily: 'var(--bl-code-font-family)',
    padding: '2px 0',
    caretColor: 'var(--bl-code-caret)'
  },
  '.cm-line': {
    padding: '0 2px'
  },
  '.cm-scroller': {
    fontFamily: 'var(--bl-code-font-family)',
    lineHeight: '1.6'
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--bl-code-gutter)'
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent'
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--bl-editor-selection-bg-color) !important'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--bl-code-caret)'
  }
})

/** 语法高亮配色（Darcula 风格，明暗两套由 CSS 变量提供） */
const cmHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--bl-code-comment)', fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword, t.moduleKeyword], color: 'var(--bl-code-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--bl-code-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--bl-code-number)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: 'var(--bl-code-function)' },
  { tag: [t.className, t.typeName, t.namespace, t.definition(t.className)], color: 'var(--bl-code-type)' },
  { tag: [t.variableName, t.propertyName, t.attributeName], color: 'var(--bl-code-variable)' },
  { tag: [t.tagName, t.angleBracket, t.processingInstruction], color: 'var(--bl-code-tag)' },
  { tag: [t.heading, t.strong], color: 'var(--bl-code-heading)', fontWeight: '600' },
  { tag: [t.emphasis], color: 'var(--bl-code-heading)', fontStyle: 'italic' },
  { tag: [t.link, t.url], color: 'var(--bl-code-link)', textDecoration: 'underline' },
  { tag: [t.meta, t.annotation], color: 'var(--bl-code-comment)' },
  { tag: t.invalid, color: 'var(--el-color-danger)' }
])

/** 配置代码块（必须在 `.use(codeBlockComponent)` 之后调用） */
export const configureCodeBlock = (ctx: Ctx) => {
  ctx.update(codeBlockConfig.key, (prev) => ({
    ...prev,
    // 语言列表：官方打包好的全部语言，按需懒加载对应语法
    languages,
    extensions: [basicSetup, keymap.of([...defaultKeymap, indentWithTab]), cmTheme, syntaxHighlighting(cmHighlight)],
    searchPlaceholder: '搜索语言',
    noResultText: '没有匹配的语言',
    copyText: '复制',
    // 复制按钮只要文字，不要官方默认的 📋 图标（空字符串 → 图标位不渲染内容）
    copyIcon: '',
    previewLabel: '预览',
    // 代码块里的「仅预览」按钮文案（mermaid 等场景才会有）
    previewToggleButton: (previewOnlyMode: boolean) => (previewOnlyMode ? '编辑' : '隐藏')
  }))
}

/** 代码块插件集合 */
export const codeBlockPlugins = codeBlockComponent
