/**
 * ============================================================================
 * LaTeX 数学公式插件
 * ============================================================================
 *
 * Milkdown 7.23 起官方不再提供 `@milkdown/plugin-math`（该包停留在 7.5.x，
 * 与当前 ctx API 不兼容），因此这里基于官方推荐的组合自行实现：
 *
 * - `remark-math`：负责 markdown 里 `$行内公式$` 与 `$$块级公式$$` 的解析与序列化
 * - `katex`：负责把 LaTeX 渲染成 HTML
 * - 自定义 node + NodeView：在编辑器内直接显示渲染结果
 *
 * ## 交互约定
 *
 * 公式节点是 `atom`（整体不可拆分），**双击**公式会派发 `bl-math-edit` 事件，
 * 由 Vue 层（ArticleIndex.vue）弹出编辑框，确认后通过事件里带回的 `apply`
 * 回调写回节点属性。这样 NodeView 与 UI 层完全解耦，不依赖任何 UI 框架。
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $inputRule, $nodeSchema, $remark, $view } from '@milkdown/kit/utils'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import remarkMath from 'remark-math'
import katex from 'katex'
import 'katex/dist/katex.min.css'

import { MATH_EDIT_EVENT } from '../constants'

export { MATH_EDIT_EVENT }

/** 事件 detail 结构 */
export interface MathEditDetail {
  /** 当前 LaTeX 源码 */
  value: string
  /** 是否块级公式 */
  display: boolean
  /** 写回公式内容的回调（内部会 setNodeMarkup） */
  apply: (value: string) => void
  /** 弹窗定位用的锚点元素 */
  anchor: HTMLElement
}

/** remark-math 插件（同时注册解析与序列化的 handler） */
export const mathRemarkPlugin = $remark('blRemarkMath', () => remarkMath)

/**
 * 渲染 LaTeX 到指定容器，失败时展示原始源码而不是抛错
 */
const renderMath = (container: HTMLElement, value: string, display: boolean) => {
  container.textContent = ''
  if (!value.trim()) {
    container.textContent = display ? '$$ ... $$' : '$ ... $'
    container.classList.add('bl-math-empty')
    return
  }
  container.classList.remove('bl-math-empty')
  try {
    katex.render(value, container, {
      displayMode: display,
      throwOnError: false,
      output: 'html',
      strict: false
    })
  } catch (e) {
    container.textContent = `公式解析失败: ${value}`
    container.classList.add('bl-math-error')
  }
}

/**
 * 公式节点的 NodeView
 *
 * - 负责渲染、双击编辑、空公式占位
 * - `ignoreMutation` 恒为 true：katex 生成的 DOM 变动不应被 ProseMirror 当成文档修改
 */
class MathNodeView {
  dom: HTMLElement
  private node: any
  private view: any
  private getPos: () => number | undefined
  private display: boolean

  constructor(node: any, view: any, getPos: () => number | undefined, display: boolean) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.display = display

    this.dom = document.createElement(display ? 'div' : 'span')
    this.dom.className = `bl-math ${display ? 'bl-math-block' : 'bl-math-inline'}`
    this.dom.setAttribute('data-type', display ? 'math_block' : 'math_inline')
    this.dom.setAttribute('contenteditable', 'false')

    this.dom.addEventListener('dblclick', this.handleDblClick)
    this.render()
  }

  /** 双击：把编辑请求交给外部 UI */
  private handleDblClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const detail: MathEditDetail = {
      value: this.node.attrs.value ?? '',
      display: this.display,
      anchor: this.dom,
      apply: (value: string) => {
        const pos = this.getPos()
        if (typeof pos !== 'number') return
        const { state, dispatch } = this.view
        dispatch(state.tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, value }))
      }
    }
    this.dom.dispatchEvent(new CustomEvent(MATH_EDIT_EVENT, { detail, bubbles: true, composed: true }))
  }

  private render() {
    this.dom.dataset.value = this.node.attrs.value ?? ''
    renderMath(this.dom, this.node.attrs.value ?? '', this.display)
  }

  /** 节点属性变化时增量更新 */
  update(node: any) {
    if (node.type !== this.node.type) return false
    this.node = node
    this.render()
    return true
  }

  selectNode() {
    this.dom.classList.add('is-selected')
  }

  deselectNode() {
    this.dom.classList.remove('is-selected')
  }

  stopEvent() {
    return false
  }

  ignoreMutation() {
    return true
  }

  destroy() {
    this.dom.removeEventListener('dblclick', this.handleDblClick)
  }
}

/** 行内公式 `$...$` */
export const mathInlineSchema = $nodeSchema('math_inline', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  marks: '',
  attrs: { value: { default: '', validate: 'string' } },
  parseDOM: [
    {
      tag: 'span[data-type="math_inline"]',
      getAttrs: (dom: HTMLElement) => ({ value: dom.dataset.value ?? '' })
    }
  ],
  toDOM: (node: any) => ['span', { 'data-type': 'math_inline', 'data-value': node.attrs.value, class: 'bl-math bl-math-inline' }],
  parseMarkdown: {
    match: (node: any) => node.type === 'inlineMath',
    runner: (state: any, node: any, type: any) => state.addNode(type, { value: node.value ?? '' })
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'math_inline',
    runner: (state: any, node: any) => state.addNode('inlineMath', undefined, node.attrs.value)
  }
}))

/** 块级公式 `$$...$$` */
export const mathBlockSchema = $nodeSchema('math_block', () => ({
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  attrs: { value: { default: '', validate: 'string' } },
  parseDOM: [
    {
      tag: 'div[data-type="math_block"]',
      getAttrs: (dom: HTMLElement) => ({ value: dom.dataset.value ?? '' })
    }
  ],
  toDOM: (node: any) => ['div', { 'data-type': 'math_block', 'data-value': node.attrs.value, class: 'bl-math bl-math-block' }],
  parseMarkdown: {
    match: (node: any) => node.type === 'math',
    runner: (state: any, node: any, type: any) => state.addNode(type, { value: node.value ?? '' })
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'math_block',
    runner: (state: any, node: any) => state.addNode('math', undefined, node.attrs.value)
  }
}))

/**
 * 行内公式输入规则：输入 `$E=mc^2$` 后自动转成行内公式节点
 *
 * remark-math 只负责「解析已有的 $...$」，不会把实时输入的内容变成节点，
 * 所以必须再补一条 ProseMirror 的 input rule，否则只能通过菜单插入。
 */
export const mathInlineInputRule = $inputRule((ctx) => {
  return new InputRule(/\$([^$\n]+)\$$/, (state, match, start, end) => {
    const value = match[1]
    if (!value) return null
    return state.tr.replaceWith(start, end, mathInlineSchema.type(ctx).create({ value }))
  })
})

/** 挂载 NodeView */
export const mathInlineView = $view(
  mathInlineSchema.node,
  () => (node: any, view: any, getPos: () => number | undefined) => new MathNodeView(node, view, getPos, false)
)
export const mathBlockView = $view(
  mathBlockSchema.node,
  () => (node: any, view: any, getPos: () => number | undefined) => new MathNodeView(node, view, getPos, true)
)

export const mathPlugins = [
  mathRemarkPlugin,
  mathInlineSchema,
  mathBlockSchema,
  mathInlineInputRule,
  mathInlineView,
  mathBlockView
].flat() as unknown as MilkdownPlugin[]
