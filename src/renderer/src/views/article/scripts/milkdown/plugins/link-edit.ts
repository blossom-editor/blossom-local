/**
 * ============================================================================
 * 链接输入浮层（inline 输入框）
 * ============================================================================
 *
 * 完全照搬官方 `@milkdown/kit/component/link-tooltip` 的 **LinkEditTooltip**
 * （`node_modules/@milkdown/components/src/link-tooltip/edit/edit-view.ts`）：
 *
 * - 悬停链接 → 预览浮层（🔗 复制 / ✎ 编辑 / ✕ 删除，官方组件自带）
 * - 点 ✎ 或选中文字点「设为链接」 → 就地变成一行输入框，回车确认、Esc 取消、
 *   点外面自动收起 —— **不再弹任何 dialog**
 *
 * ## 为什么又自己实现了一遍
 *
 * 1. 官方的官方实现是 Vue 组件（`createApp`），而本项目的浮动 UI 全部是原生 DOM，
 *    只为这一个输入框引入一个 Vue 子应用没有必要，也与 selection-tooltip.ts 风格不一致。
 * 2. 官方 `#confirmEdit` 用 `type.create({ href })` 重建链接 mark，会把
 *    `[文字](地址 "标题")` 里的 **title 丢掉**。这里在重建时把原 title 带上，
 *    编辑地址不会让「悬停提示」消失。
 * 3. 官方 `#enterEditMode` 会把选区设成整个链接区间 —— 于是正文里的链接文字被整段选中，
 *    而且会顺带把「选中文字格式工具条」顶出来，两个浮层叠在一起。这里不碰选区。
 *
 * 与官方一致的语义（照抄）：
 *
 * | 行为 | 说明 |
 * | ---- | ---- |
 * | 数据 | `{ from, to, mark }`，新增链接时 mark 为 null（选区为空时用输入内容当链接文字）|
 * | 确认 | 先 removeMark 再 addMark；`from === to` 时用 `insertText + addMark` 插入文字 |
 * | 地址为空 | 收起浮层；已有链接时等于「移除链接」 |
 * | 切换 / 收起 | `linkTooltipState.mode` 在 `preview` / `edit` 之间切换，预览浮层据此自动隐藏 |
 * | 收起后 | 焦点还给编辑器（`provider.onHide`）|
 *
 * 样式沿用官方的 class 名（`.milkdown-link-edit > .link-edit > .input-area`），
 * 见 `styles/bl-milkdown.css` 的「链接浮层」小节。
 */

import type { EditorView } from '@milkdown/kit/prose/view'
import { editorViewCtx } from '@milkdown/kit/core'
import { posToDOMRect } from '@milkdown/kit/prose'
import { linkSchema, sanitizeLinkHref } from '@milkdown/kit/preset/commonmark'
import { TooltipProvider } from '@milkdown/kit/plugin/tooltip'
import { linkEditTooltip, linkTooltipAPI, linkTooltipConfig, linkTooltipState } from '@milkdown/kit/component/link-tooltip'
import { hideSelectionTooltip } from './selection-tooltip'

/** 正在编辑的链接 */
interface EditData {
  /** 链接在文档中的起止位置 */
  from: number
  to: number
  /** 已有的链接 mark；新增链接时为 null */
  mark: any | null
}

/** 空数据：`from < 0` 表示当前没有在编辑 */
const EMPTY_DATA: EditData = { from: -1, to: -1, mark: null }

export class BlLinkEditTooltip {
  private readonly ctx: any
  private readonly view: EditorView
  /** 浮层外层（挂到编辑器父元素上，由 floating-ui 定位） */
  private readonly content: HTMLElement
  /** 输入框 */
  private readonly input: HTMLInputElement
  /** 确认按钮（输入为空时隐藏，与官方一致） */
  private readonly confirmButton: HTMLElement
  private readonly provider: TooltipProvider
  private data: EditData = { ...EMPTY_DATA }
  /**
   * 打开编辑态时的那份文档
   *
   * 光标位置的 from / to 只对这份文档有效。切换文章走的是
   * `replaceAll → view.updateState`，文档被整体换掉，旧区间在新文章里
   * 可能依然「合法」（新文章更长时不会越界），回车确认就会把链接加到
   * 新文章的随机位置上。所以每次 update 都比对文档引用，换了就收起。
   */
  private doc: any = null
  /**
   * 本次收起是否要把焦点还给编辑器
   *
   * - 主动收起（回车确认 / Esc / 点确认按钮）：要还，否则光标停在已隐藏的输入框里，
   *   用户接着打字什么都打不出来
   * - 被外面的 pointerdown 收起：不还，因为用户正要点别的控件（见 onHide 的注释）
   */
  private focusOnHide = true

  constructor(ctx: any, view: EditorView) {
    this.ctx = ctx
    this.view = view

    // ---------------- DOM：一行输入框 + 确认按钮 ----------------
    const wrapper = document.createElement('div')
    wrapper.className = 'link-edit'

    this.input = document.createElement('input')
    this.input.className = 'input-area'
    this.input.type = 'text'
    this.input.spellcheck = false
    this.input.addEventListener('keydown', this.onKeydown)
    this.input.addEventListener('input', this.syncConfirmVisible)

    this.confirmButton = document.createElement('span')
    this.confirmButton.className = 'button confirm'
    // 阻止按下时抢走输入框焦点（否则点确认前 input 先失焦，部分环境会先触发 reset）
    this.confirmButton.addEventListener('mousedown', (e) => e.preventDefault())
    this.confirmButton.addEventListener('click', this.onConfirmClick)

    wrapper.appendChild(this.input)
    wrapper.appendChild(this.confirmButton)

    this.content = document.createElement('div')
    this.content.className = 'milkdown-link-edit'
    this.content.appendChild(wrapper)

    /*
     * 显隐完全由我们手动控制（show / hide），所以 `shouldShow` 恒为 false，
     * 只借用 TooltipProvider 的定位与 data-show 机制。
     */
    this.provider = new TooltipProvider({ content: this.content, debounce: 0, shouldShow: () => false })
    /*
     * 收起后把焦点还给编辑器，可以继续打字。
     *
     * 但有两个前提：
     * 1. 主动收起（Enter / Esc）一定要还 —— 否则光标停在隐藏的输入框里，接着打字没反应
     * 2. 被外面的 pointerdown 收起时不能抢 —— 用户可能正要点正文查找框 / 设置项里的
     *    输入框，抢回去会让它一个字都输不进去
     */
    this.provider.onHide = () => {
      const wantFocus = this.focusOnHide
      this.focusOnHide = true
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null
        const isInput = !!active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || active.isContentEditable)
        const outside = !!active && active !== document.body && !this.view.dom.contains(active)
        /*
         * 被动收起时，如果焦点已经落到别的输入控件上（查找框、设置项…），不要抢；
         * 主动收起（回车确认 / Esc）必须还焦点，否则输入框被隐藏后没法继续打字。
         */
        if (!wantFocus && outside && isInput) return
        this.view.dom.focus({ preventScroll: true })
      })
    }
    // 第一次 update 会把 content 挂到编辑器父元素上
    this.provider.update(view)
  }

  //#region ------------------------------------------------ 内部工具 -------------------------------------------------

  /** 输入内容为空时不显示确认按钮（官方行为） */
  private syncConfirmVisible = () => {
    this.confirmButton.style.display = this.input.value ? '' : 'none'
  }

  private onKeydown = (event: KeyboardEvent) => {
    // 不要惊动编辑器与页面级快捷键（Ctrl+F / Alt+1 等）
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      this.confirm(this.input.value)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      this.reset()
    }
  }

  private onConfirmClick = () => this.confirm(this.input.value)

  /** 点到浮层外面就收起 */
  private onOutsidePointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null
    if (target && this.content.contains(target)) return
    // 用户正要点别的控件，别把焦点抢回来（见 onHide 的注释）
    this.reset(false)
  }

  private startOutsideListener = () => document.addEventListener('pointerdown', this.onOutsidePointerDown, true)

  private stopOutsideListener = () => document.removeEventListener('pointerdown', this.onOutsidePointerDown, true)

  /**
   * 收起浮层，回到「预览」态
   *
   * @param restoreFocus 是否把焦点还给编辑器（主动收起时 true，被外面点掉时 false）
   */
  private reset = (restoreFocus: boolean = true) => {
    this.focusOnHide = restoreFocus
    this.stopOutsideListener()
    this.provider.hide()
    this.ctx.update(linkTooltipState.key, (state: any) => ({ ...state, mode: 'preview' }))
    this.data = { ...EMPTY_DATA }
  }

  /**
   * 进入编辑态
   *
   * @param value 输入框初始值（编辑已有链接时是它的地址）
   * @param from  链接起点
   * @param to    链接终点
   */
  private enterEditMode(value: string, from: number, to: number) {
    const config = this.ctx.get(linkTooltipConfig.key)
    // 记下当前文档，切换文章后旧区间立即失效（见 doc 字段的注释）
    this.doc = this.view.state.doc
    // 每次进入编辑态都恢复默认策略，避免上一次「被动收起」残留的标志影响本次
    this.focusOnHide = true
    this.input.value = value
    this.input.placeholder = config.inputPlaceholder ?? ''
    this.confirmButton.textContent = config.confirmButton ?? '⏎'
    this.syncConfirmVisible()

    // 让官方的预览浮层知道现在处于编辑态，它会立刻收起来（官方在其 constructor 里订阅了这个状态）
    this.ctx.update(linkTooltipState.key, (state: any) => ({ ...state, mode: 'edit' }))
    // 收起身下的「选中文字格式工具条」，两个浮层不能叠在一起
    hideSelectionTooltip()

    /*
     * 注意：这里**刻意不调用 `setSelection(from, to)`**。
     * 官方会这么做，代价是正文里的链接被整段选中（看起来像误触全选），
     * 而且选区变化会把格式工具条顶出来。
     */
    this.provider.show({ getBoundingClientRect: () => posToDOMRect(this.view, from, to) }, this.view)
    this.startOutsideListener()

    requestAnimationFrame(() => {
      this.input.focus()
      // 整段选中地址，方便直接覆盖输入
      this.input.select()
    })
  }

  /**
   * 应用输入框里的地址
   *
   * @param raw 用户输入的原始文本
   */
  private confirm(raw: string) {
    // 过滤 javascript: / data: 等不安全协议（官方同款工具函数）
    const href = sanitizeLinkHref(raw)
    const { from, to, mark } = this.data
    if (from < 0) return

    const view = this.ctx.get(editorViewCtx) as EditorView
    const linkType = linkSchema.type(this.ctx)
    const tr = view.state.tr
    if (mark) tr.removeMark(from, to, mark)

    // 地址被清空：已有链接时等于「移除链接」，否则什么也不用做
    if (!href) {
      if (tr.docChanged) view.dispatch(tr)
      this.reset()
      return
    }

    // 地址没变：直接收起，不产生无意义的事务
    if (mark && mark.attrs.href === href) {
      this.reset()
      return
    }

    if (from === to) {
      // 没有选区：把地址本身插进去当链接文字
      tr.insertText(href, from)
      tr.addMark(from, from + href.length, linkType.create({ href }))
    } else {
      // 有选区：保留原有 title，避免编辑地址后「悬停提示」丢失
      const attrs: Record<string, any> = { href }
      if (mark?.attrs?.title) attrs.title = mark.attrs.title
      tr.addMark(from, to, linkType.create(attrs))
    }

    view.dispatch(tr)
    this.reset()
  }

  //#endregion

  //#region ------------------------------------------------ 官方 API 的三个入口 -------------------------------------------------

  /** 为选区添加链接（「设为链接」按钮 / Alt+K / 输入规则都会走到这里） */
  addLink = (from: number, to: number) => {
    this.data = { from, to, mark: null }
    this.enterEditMode('', from, to)
  }

  /** 编辑已有链接（预览浮层的 ✎） */
  editLink = (mark: any, from: number, to: number) => {
    this.data = { from, to, mark }
    this.enterEditMode(mark?.attrs?.href ?? '', from, to)
  }

  /** 移除链接（预览浮层的 ✕） */
  removeLink = (from: number, to: number) => {
    const view = this.ctx.get(editorViewCtx) as EditorView
    view.dispatch(view.state.tr.removeMark(from, to, linkSchema.type(this.ctx)))
    this.reset()
  }

  //#endregion

  //#region ------------------------------------------------ PluginView -------------------------------------------------

  /** 文档被整体替换（切换文章）后旧位置失效，直接收起 */
  update = (view: EditorView) => {
    if (this.data.from < 0) return
    // 文档换了一份：from / to 指向的是上一篇文章，绝不能拿来改新文章
    if (view.state.doc !== this.doc) {
      this.reset()
      return
    }
    if (this.data.to > view.state.doc.content.size) this.reset()
  }

  destroy = () => {
    this.stopOutsideListener()
    this.provider.destroy()
    this.content.remove()
  }

  //#endregion
}

/**
 * 用本实现替换官方 LinkEditTooltip
 *
 * 与官方 `configureLinkEditTooltip` 做的事情完全一样：
 * 覆盖 `linkEditTooltip` 的 PluginView，并把 `linkTooltipAPI` 的三个方法指向它。
 * 必须在 `.config(configureLinkTooltip)` **之后**执行（后者会重新注册官方实现）。
 */
export const configureBlLinkEdit = (ctx: any) => {
  let viewInstance: BlLinkEditTooltip | null = null

  ctx.set(linkEditTooltip.key, {
    view: (view: EditorView) => {
      viewInstance = new BlLinkEditTooltip(ctx, view)
      return viewInstance
    }
  })

  ctx.update(linkTooltipAPI.key, (api: any) => ({
    ...api,
    addLink: (from: number, to: number) => viewInstance?.addLink(from, to),
    editLink: (mark: any, from: number, to: number) => viewInstance?.editLink(mark, from, to),
    removeLink: (from: number, to: number) => viewInstance?.removeLink(from, to)
  }))
}
