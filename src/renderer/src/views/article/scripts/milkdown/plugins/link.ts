/**
 * ============================================================================
 * 链接处理插件
 * ============================================================================
 *
 * 包含两件事：
 *
 * 1. **点击拦截**
 *    在所见即所得编辑器里，链接渲染成真正的 `<a href>`。Electron 里点击它
 *    可能让整个窗口跳走，这显然不行。
 *
 *    - **普通单击**：只把光标放进链接（不跳转、不弹预览），像点普通文字一样，
 *      可以直接接着往下编辑；
 *    - **Ctrl / Cmd + 单击**：派发 `bl-link-click`，由 Vue 层决定「用浏览器打开」
 *      还是「弹出文章引用浮层」（保留原来的能力，但必须显式按住修饰键）。
 *
 *    只有在没有拖拽选中文字时才拦截，保证跨链接选择文本仍然可用。
 *
 * 2. **markdown 语法输入规则**
 *    输入 `[文字](https://example.com)`（可带可选标题 `"标题"`）后，
 *    自动转成真正的链接。milkdown 的 commonmark 预设只提供解析能力
 *    （读已有 markdown），没有「打字时识别」的规则，所以这里自己补一条。
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $inputRule, $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state'
import { InputRule } from '@milkdown/kit/prose/inputrules'
import { linkSchema } from '@milkdown/kit/preset/commonmark'

import { LINK_CLICK_EVENT } from '../constants'

export interface LinkClickDetail {
  /** 链接地址（markdown 中的原始地址） */
  href: string
  /** 是否外部链接 */
  isExternal: boolean
  /** 原始事件 */
  event: MouseEvent
}

/** 判断是否为外部链接 */
export const isExternalLink = (href: string) => /^(https?:)?\/\//i.test(href) || /^(mailto|tel):/i.test(href)

/** 拖拽容差：超过该像素认为是「选择文字」而不是「点击」 */
const DRAG_TOLERANCE = 4

/**
 * 派发「链接被点击」事件，交给页面决定怎么打开
 *
 * @param el     事件源（编辑器里的 `<a>` 或链接浮层里的地址）
 * @param href   链接地址
 * @param event  原始鼠标事件（页面用它定位引用预览浮层）
 */
const emitLinkClick = (el: HTMLElement, href: string, event: MouseEvent) => {
  const detail: LinkClickDetail = { href, isExternal: isExternalLink(href), event }
  el.dispatchEvent(new CustomEvent(LINK_CLICK_EVENT, { detail, bubbles: true, composed: true }))
}

export const linkClickPlugin = $prose(() => {
  const key = new PluginKey('BL_LINK_CLICK')
  let downX = 0
  let downY = 0

  /**
   * 链接浮层里那一行地址（`.link-display`）的点击
   *
   * 官方组件把它渲染成 `<a target="_blank">`，点一下就走 `window.open` →
   * 系统浏览器。对外部链接没问题，但**内部文章链接**应该打开应用内的引用预览，
   * 所以这里只拦「非外部链接」，把它们引到与编辑器内链接同一套处理上。
   */
  const onDocumentClick = (event: MouseEvent) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.('.milkdown-link-preview .link-display') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href') ?? ''
    if (!href || isExternalLink(href)) return

    event.preventDefault()
    event.stopPropagation()
    emitLinkClick(anchor, href, event)
  }

  return new Plugin({
    key,
    view: () => {
      document.addEventListener('click', onDocumentClick, true)
      return {
        destroy: () => document.removeEventListener('click', onDocumentClick, true)
      }
    },
    props: {
      handleDOMEvents: {
        mousedown(_view, event) {
          downX = event.clientX
          downY = event.clientY
          return false
        },
        click(view, event: MouseEvent) {
          const target = event.target as HTMLElement | null
          const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
          if (!anchor) return false

          // 拖拽选择文字的场景交给浏览器 / ProseMirror 处理
          if (Math.abs(event.clientX - downX) > DRAG_TOLERANCE || Math.abs(event.clientY - downY) > DRAG_TOLERANCE) {
            return false
          }

          const href = anchor.getAttribute('href') ?? ''
          if (!href) return false

          // 无论哪种情况都不让浏览器执行 <a> 的默认跳转
          event.preventDefault()

          /*
           * 内部文章链接：单击就打开引用预览。
           *
           * 它并没有「跳转出去」，打开的是应用内的浮层 / 只读窗口，所以不需要按修饰键；
           * 外部链接才需要 Ctrl / Cmd + 单击（避免写东西时误触把浏览器弹出来）。
           */
          if (!isExternalLink(href) || event.ctrlKey || event.metaKey) {
            emitLinkClick(anchor, href, event)
            return true
          }

          /*
           * 外部链接 + 普通单击：只把光标放到点击位置。
           *
           * mousedown 已经被 ProseMirror 处理过一次（光标通常已经就位），
           * 这里补一次是为了覆盖「点在链接的内边距上」这种落点算不出来的边界情况，
           * 同时避免产生无意义的空事务（会让文章被标记成「有改动」）。
           */
          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (coords) {
            const next = TextSelection.create(view.state.doc, coords.pos)
            if (!view.state.selection.eq(next)) view.dispatch(view.state.tr.setSelection(next))
          }
          view.focus()
          return true
        }
      }
    }
  })
})

/**
 * `[文字](地址 "标题")` => 链接 mark
 *
 * 规则在**输入右括号时**触发，此时整段文字已经在文档里，
 * 直接用一个事务把它替换成「纯文字 + link mark」。
 */
export const linkInputRule = $inputRule((ctx) => {
  return new InputRule(
    /\[([^[\]\n]+)\]\(\s*([^()\s]+)(?:\s+["']([^"'\n]*)["'])?\s*\)$/,
    (state, match, start, end) => {
      const [, text, href, title] = match
      if (!text || !href) return null
      const mark = linkSchema.type(ctx).create({ href, title: title || null })
      return state.tr.replaceWith(start, end, state.schema.text(text, [mark]))
    }
  )
})

/** 插件集合（`$prose` / `$inputRule` 返回的不是数组，统一 flat 一层） */
export const linkPlugins = [linkClickPlugin, linkInputRule].flat() as unknown as MilkdownPlugin[]
