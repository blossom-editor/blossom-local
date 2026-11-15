/**
 * ============================================================================
 * 正文查找（Ctrl + F）
 * ============================================================================
 *
 * ProseMirror 没有内置的「查找」能力，这里用**装饰（Decoration）**实现：
 * 命中片段只是视觉上高亮，不写入文档，因此不会污染 markdown，也不会触发保存。
 *
 * ## 状态机
 *
 * 插件自身维护一个 PluginState：
 *
 * ```ts
 * { query: string, matches: {from,to}[], current: number, decos: DecorationSet }
 * ```
 *
 * 外部（WysiwygEditor）通过 `tr.setMeta(searchPluginKey, { type })` 驱动：
 *
 * | type    | 作用 |
 * | ------- | ---- |
 * | `set`   | 设置关键字并跳到第一个命中 |
 * | `next`  | 跳到下一个命中（循环） |
 * | `prev`  | 跳到上一个命中（循环） |
 * | `clear` | 清空关键字与高亮 |
 *
 * 文档发生变化时（边搜边改）会自动重算命中位置。
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'

/** PluginKey，编辑器封装层通过它派发 meta 与读取状态 */
export const searchPluginKey = new PluginKey('BL_SEARCH')

/** 单个命中 */
export interface SearchMatch {
  from: number
  to: number
}

/** 查找状态 */
export interface SearchState {
  query: string
  matches: SearchMatch[]
  /** 当前命中下标，-1 表示没有命中 */
  current: number
  decos: DecorationSet
}

/** 命中高亮的 class（当前项额外带 current） */
const MATCH_CLASS = 'bl-search-match'
const CURRENT_CLASS = 'bl-search-match-current'

/**
 * 收集命中位置
 *
 * 只做「单个文本节点内」的匹配：跨加粗 / 链接等 mark 边界的关键字不会命中，
 * 这对正文查找来说已经足够（浏览器查找也是按文本流分段处理的降级方案类似）。
 */
const collectMatches = (doc: any, query: string): SearchMatch[] => {
  const matches: SearchMatch[] = []
  const keyword = query.trim().toLowerCase()
  if (!keyword) return matches

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return true
    const text = (node.text as string)?.toLowerCase() ?? ''
    if (!text) return false
    let index = text.indexOf(keyword)
    while (index >= 0) {
      matches.push({ from: pos + index, to: pos + index + keyword.length })
      index = text.indexOf(keyword, index + keyword.length)
    }
    return false
  })
  return matches
}

/** 根据命中列表生成装饰 */
const buildDecorations = (doc: any, matches: SearchMatch[], current: number) => {
  if (matches.length === 0) return DecorationSet.empty
  return DecorationSet.create(
    doc,
    matches.map((match, index) =>
      Decoration.inline(match.from, match.to, {
        class: index === current ? `${MATCH_CLASS} ${CURRENT_CLASS}` : MATCH_CLASS
      })
    )
  )
}

/** 查找插件 */
export const searchPlugin = $prose(
  () =>
    new Plugin<SearchState>({
      key: searchPluginKey,
      state: {
        init: () => ({ query: '', matches: [], current: -1, decos: DecorationSet.empty }),
        apply(tr, prev, _oldState, newState) {
          const meta = tr.getMeta(searchPluginKey) as { type: string; query?: string } | undefined
          let { query, matches, current } = prev

          if (meta) {
            switch (meta.type) {
              case 'set':
                query = meta.query ?? ''
                matches = collectMatches(newState.doc, query)
                current = matches.length > 0 ? 0 : -1
                break
              case 'next':
                if (matches.length > 0) current = (current + 1) % matches.length
                break
              case 'prev':
                if (matches.length > 0) current = (current - 1 + matches.length) % matches.length
                break
              case 'clear':
                query = ''
                matches = []
                current = -1
                break
            }
          } else if (tr.docChanged && query) {
            // 边搜边改：命中位置需要跟着文档重新计算
            matches = collectMatches(newState.doc, query)
            current = matches.length > 0 ? Math.min(Math.max(current, 0), matches.length - 1) : -1
          } else {
            // 选区变化等不影响高亮
            return prev
          }

          return { query, matches, current, decos: buildDecorations(newState.doc, matches, current) }
        }
      },
      props: {
        decorations(state) {
          return searchPluginKey.getState(state)?.decos ?? DecorationSet.empty
        }
      }
    })
)

/** 插件集合 */
export const searchPlugins = [searchPlugin].flat() as unknown as MilkdownPlugin[]
