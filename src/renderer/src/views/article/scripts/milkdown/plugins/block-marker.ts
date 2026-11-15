/**
 * ============================================================================
 * Blossom 语法糖装饰插件
 * ============================================================================
 *
 * Blossom 的历史文章里有两类「用特殊标记包裹的语法」，它们不是标准 markdown，
 * 而是由旧的 marked 渲染器识别并转成 class / 样式：
 *
 * 1. 彩色引用
 *    ```md
 *    > ##green##
 *    > 这是一段绿色引用
 *    ```
 *    旧渲染器会把 `##green##` 去掉，并给 blockquote 加 `bl-blockquote-green`。
 *
 * 2. 容器表格（无表头、无边框的排版用表格）
 *    ```md
 *    | ##container## | ##container## |
 *    | --- | --- |
 *    | A | B |
 *    ```
 *
 * 在所见即所得编辑器里，如果直接保留标记文本，用户会看到 `##green##` 这种噪声。
 * 这里选择**不修改文档内容**（保证保存回 .md 时格式完全不变），而是用
 * ProseMirror 的 Decoration 把标记「视觉隐藏」并把 class 打到对应节点上。
 *
 * 这样做的好处：
 * - 保存后的 markdown 与原文完全一致，双链 / 图片引用解析逻辑零改动
 * - 不需要覆盖 milkdown 内置的 blockquote / table schema（覆盖风险很高）
 */

import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'

/** 引用颜色，与旧渲染器（scripts/markedjs.ts）保持一致 */
export const QUOTE_COLORS = ['black', 'green', 'yellow', 'red', 'blue', 'purple'] as const
export type QuoteColor = (typeof QUOTE_COLORS)[number]

/** `##green##` 形式的引用颜色标记 */
export const QUOTE_MARKER_RE = new RegExp(`^##(${QUOTE_COLORS.join('|')})##`)

/** 容器表格标记 */
export const CONTAINER_MARKER = '##container##'

/** 标记文本的装饰 class，样式在 bl-milkdown.css 中定义（视觉隐藏但保留文档内容） */
export const MARKER_CLASS = 'bl-md-marker'

/**
 * 找到某个节点内部第一个文本节点，并返回它在文档中的起始位置
 *
 * @param parent 父节点
 * @param parentPos 父节点在文档中的位置
 */
const findFirstText = (parent: any, parentPos: number): { from: number; text: string } | null => {
  // 节点的内容从 parentPos + 1 开始
  let pos = parentPos + 1
  let node = parent.firstChild
  while (node) {
    if (node.isText) return { from: pos, text: (node.text as string) ?? '' }
    node = node.firstChild
    pos += 1
  }
  return null
}

/**
 * 生成全部装饰
 */
export const buildBlockDecorations = (doc: any): DecorationSet => {
  const decorations: Decoration[] = []

  doc.descendants((node: any, pos: number) => {
    // ==========================================================
    // 彩色引用
    // ==========================================================
    if (node.type.name === 'blockquote') {
      const first = findFirstText(node, pos)
      if (first) {
        const matched = QUOTE_MARKER_RE.exec(first.text)
        if (matched) {
          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              class: `bl-blockquote bl-blockquote-${matched[1]}`
            })
          )
          decorations.push(Decoration.inline(first.from, first.from + matched[0].length, { class: MARKER_CLASS }))
        }
      }
      return true
    }

    // ==========================================================
    // 容器表格
    // ----------------------------------------------------------
    // 旧语法：表头每个单元格都写 `##container##`，渲染成无边框、无表头的排版表格。
    // 这里把表头行的所有标记都隐藏，并给 table 打上 class，
    // 由 bl-milkdown.css 负责隐藏表头行与边框。
    // ==========================================================
    if (node.type.name === 'table') {
      const headerRow = node.firstChild
      const isContainer =
        headerRow != null && headerRow.textContent.replace(/\s/g, '').startsWith(CONTAINER_MARKER)

      if (isContainer) {
        decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: 'bl-table-container' }))

        // 表头行位于 pos + 1，逐个单元格隐藏标记
        let cellPos = pos + 2
        headerRow.forEach((cell: any) => {
          const cellStart = cellPos
          const text = findFirstText(cell, cellStart)
          if (text && text.text.startsWith(CONTAINER_MARKER)) {
            decorations.push(Decoration.inline(text.from, text.from + CONTAINER_MARKER.length, { class: MARKER_CLASS }))
          }
          cellPos += cell.nodeSize
        })
      }
      return true
    }

    return true
  })

  return DecorationSet.create(doc, decorations)
}

/** 装饰插件 */
export const blockDecoratorPlugin = $prose(() => {
  const key = new PluginKey('BL_BLOCK_DECORATOR')
  return new Plugin({
    key,
    state: {
      init: (_config, state) => buildBlockDecorations(state.doc),
      apply: (tr, old) => (tr.docChanged ? buildBlockDecorations(tr.doc) : old)
    },
    props: {
      decorations(state) {
        return key.getState(state)
      }
    }
  })
})

/** 判断颜色是否合法 */
export const isQuoteColor = (color: string): color is QuoteColor => QUOTE_COLORS.includes(color as QuoteColor)
