/**
 * ============================================================================
 * 选中文字后的浮动工具条
 * ============================================================================
 *
 * 基于 `@milkdown/kit/plugin/tooltip` 的 TooltipProvider（内部用 floating-ui 定位），
 * 内容是自己拼的原生 DOM，不依赖任何 UI 框架，因此与 Vue 层完全解耦。
 *
 * 出现条件由 TooltipProvider 默认策略决定：有非空选区 + 编辑器有焦点，
 * 在此基础上再补几条（见 `configureSelectionTooltip` 里的注释）。
 *
 * ## 两行布局
 *
 * ```
 * ● ● ● ● ● ● ●  清除          <- 第一行：预设文字颜色（直接点，不再展开二级面板）
 * B  I  U  </>  |  🔗          <- 第二行：加粗 / 斜体 / 下划线 / 行内代码 / 设为链接
 * ```
 *
 * 工具栏出现的每一帧都会同步「已生效」的状态：加粗过的文字，B 按钮是高亮的；
 * 设置了颜色的文字，对应色点外面有一圈描边。
 *
 * 「设为链接」与工具栏、Alt+K 走同一套逻辑（`linkTooltipAPI.addLink`），
 * 会在选区上方弹出链接输入框，见 plugins/link-edit.ts。
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { commandsCtx, editorViewCtx } from '@milkdown/kit/core'
import { tooltipFactory, TooltipProvider } from '@milkdown/kit/plugin/tooltip'
import { toggleEmphasisCommand, toggleInlineCodeCommand, toggleStrongCommand } from '@milkdown/kit/preset/commonmark'
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { CellSelection } from '@milkdown/kit/prose/tables'
import { NodeSelection } from '@milkdown/kit/prose/state'
import { linkTooltipAPI, linkTooltipState } from '@milkdown/kit/component/link-tooltip'
import { FONT_COLORS, setFontColorCommand, unsetFontColorCommand } from './font-color'

/** tooltip 插件的 spec 容器 */
export const selectionTooltip = tooltipFactory('BL_SELECTION_TOOLTIP')

/**
 * 当前存活的工具条 provider
 *
 * 链接输入框（plugins/link-edit.ts）打开时需要主动把它收起来，否则两个浮层会叠在
 * 一起互相遮挡。TooltipProvider 的 update 是「文档 / 选区没变就直接返回」的节流实现，
 * 而「只切换了链接编辑态」这种场景等不到下一次 update，只能由外部显式收起。
 */
let activeProvider: TooltipProvider | null = null

/** 收起选区工具条（供链接编辑浮层等外部调用） */
export const hideSelectionTooltip = () => activeProvider?.hide()

/**
 * 第二行按钮 => 命令 / mark 名
 *
 * ⚠️ 这里存的是 **`$command` 对象本身，不是 `command.key`**。
 * milkdown 的 `$command` 是在插件执行（`editor.create()`）时才把 `key` 挂到对象上的：
 *
 * ```ts
 * const plugin = (ctx) => async () => {
 *   plugin.key = cmdKey        // ← 创建编辑器之后才有值
 *   ...
 * }
 * ```
 *
 * 如果在本模块加载时就把 `.key` 读出来存进常量，拿到的是 `undefined`，
 * 点击时会抛 `Cannot read properties of undefined (reading 'id')`（Commands 容器查表）。
 * 所以统一在点击时再取 `command.key`。
 *
 * `mark` 是 schema 里的 mark 名，用于判断按钮是否处于激活态；
 * 与按钮名不一致的几个单独写在这里。
 */
const FORMAT_BUTTONS: { name: string; label: string; icon: string; command: any; mark: string }[] = [
  { name: 'bold', label: '加粗', icon: 'bl-bold', command: toggleStrongCommand, mark: 'strong' },
  { name: 'italic', label: '斜体', icon: 'bl-italic', command: toggleEmphasisCommand, mark: 'emphasis' },
  { name: 'strike', label: '删除线', icon: 'bl-strikethrough', command: toggleStrikethroughCommand, mark: 'strike_through' },
  { name: 'code', label: '行内代码', icon: 'bl-single-quotes-r', command: toggleInlineCodeCommand, mark: 'inlineCode' }
]

/** 判断某个 mark 是否作用于当前选区 */
const isMarkActive = (state: any, name: string): boolean => {
  const type = state.schema.marks[name]
  if (!type) return false
  const { from, to, empty, $from } = state.selection
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks())
  return state.doc.rangeHasMark(from, to, type)
}

/** 读取选区上的文字颜色（没有则返回空串） */
const currentColor = (state: any): string => {
  const type = state.schema.marks.font_color
  if (!type) return ''
  const { from, to, empty, $from } = state.selection
  if (empty) return type.isInSet(state.storedMarks || $from.marks())?.attrs.color ?? ''
  let color = ''
  state.doc.nodesBetween(from, to, (node: any) => {
    if (!node.isText) return
    const mark = type.isInSet(node.marks)
    if (mark) {
      color = mark.attrs.color
      return false
    }
    return
  })
  return color
}

/**
 * 把选区设为链接
 *
 * 调用官方 API：它会记住区间，并在选区上方弹出链接输入框；输入框获得焦点时，
 * 链接编辑浮层会顺手把本工具条收起来（见 plugins/link-edit.ts）。
 */
const runLink = (ctx: any) => {
  const view = ctx.get(editorViewCtx)
  const { from, to, empty } = view.state.selection
  if (empty) return
  ctx.get(linkTooltipAPI.key).addLink(from, to)
}

/**
 * 构建工具条 DOM
 *
 * @param ctx milkdown 上下文
 */
const createToolbar = (ctx: any): { element: HTMLElement; syncActive: (view: any) => void } => {
  const el = document.createElement('div')
  el.className = 'bl-selection-tooltip'

  // ---------------- 第一行：预设文字颜色 ----------------
  const colorRow = document.createElement('div')
  colorRow.className = 'bl-tooltip-colors'

  const dots: { color: string; el: HTMLElement }[] = []
  for (const color of FONT_COLORS) {
    const dot = document.createElement('span')
    dot.className = 'bl-color-dot'
    dot.title = color.name
    dot.style.backgroundColor = color.value
    // 按下时阻止默认行为，避免编辑器丢失选区
    dot.addEventListener('mousedown', (e) => e.preventDefault())
    dot.addEventListener('click', (e) => {
      e.preventDefault()
      ctx.get(commandsCtx).call(setFontColorCommand.key, color.value)
    })
    dots.push({ color: color.value, el: dot })
    colorRow.appendChild(dot)
  }

  const clear = document.createElement('span')
  clear.className = 'bl-color-clear'
  clear.title = '清除颜色'
  clear.textContent = '清除'
  clear.addEventListener('mousedown', (e) => e.preventDefault())
  clear.addEventListener('click', (e) => {
    e.preventDefault()
    ctx.get(commandsCtx).call(unsetFontColorCommand.key)
  })
  colorRow.appendChild(clear)

  // ---------------- 第二行：行内格式 + 设为链接 ----------------
  const row = document.createElement('div')
  row.className = 'bl-tooltip-row'

  const buttons: { mark: string; el: HTMLElement }[] = []
  for (const btn of FORMAT_BUTTONS) {
    const item = document.createElement('span')
    item.className = `bl-tooltip-btn iconbl ${btn.icon}`
    item.title = btn.label
    item.addEventListener('mousedown', (e) => e.preventDefault())
    item.addEventListener('click', (e) => {
      e.preventDefault()
      // 注意：`command.key` 必须在点击时读取，模块加载时它还是 undefined（见上方 FORMAT_BUTTONS 注释）
      ctx.get(commandsCtx).call(btn.command.key)
    })
    buttons.push({ mark: btn.mark, el: item })
    row.appendChild(item)
  }

  // 「设为链接」与左侧格式按钮之间加一条竖线，避免误点
  const divider = document.createElement('span')
  divider.className = 'bl-tooltip-divider'
  row.appendChild(divider)

  const linkBtn = document.createElement('span')
  linkBtn.className = 'bl-tooltip-btn iconbl bl-link-m'
  linkBtn.title = '设为链接'
  linkBtn.addEventListener('mousedown', (e) => e.preventDefault())
  linkBtn.addEventListener('click', (e) => {
    e.preventDefault()
    runLink(ctx)
  })
  row.appendChild(linkBtn)

  el.appendChild(colorRow)
  el.appendChild(row)

  return {
    element: el,
    syncActive: (view: any) => {
      const { state } = view
      for (const item of buttons) item.el.classList.toggle('is-active', isMarkActive(state, item.mark))
      const color = currentColor(state).toLowerCase()
      for (const dot of dots) dot.el.classList.toggle('is-active', !!color && dot.color.toLowerCase() === color)
    }
  }
}

/**
 * 需要交给 `.config()` 执行的配置函数
 */
export const configureSelectionTooltip = (ctx: any) => {
  ctx.set(selectionTooltip.key, {
    view: () => {
      const toolbar = createToolbar(ctx)
      const provider = new TooltipProvider({
        content: toolbar.element,
        offset: 12,
        debounce: 120,
        /**
         * 自定义显示条件
         *
         * 默认策略只判断「有非空选区 + 编辑器有焦点」，这里补三条：
         *
         * 1. 选中**整行 / 整列**时是 CellSelection，表格自己的「对齐 / 删除」工具条
         *    会浮出来，此时隐藏格式工具条避免重叠；单元格里正常的文字选区仍然显示。
         * 2. 正在编辑链接时隐藏：那一刻浮在链接上方的是输入框，再显示格式工具条就叠住了。
         * 3. 编辑器不可编辑（只读）时不显示。
         */
        shouldShow: (view: any) => {
          if (!view.editable || !view.hasFocus()) return false
          if (ctx.get(linkTooltipState.key)?.mode === 'edit') return false
          const selection = view.state.selection
          if (selection.empty) return false
          /*
           * 选中图片 / 公式这类「整块节点」时是 NodeSelection，
           * 格式命令（加粗、文字颜色…）对它没有意义，图片又自带「编辑」按钮，
           * 所以直接不显示，避免点一下图片就弹出文字样式工具条。
           */
          if (selection instanceof NodeSelection || (selection as any).node != null) return false
          /*
           * 整行 / 整列选择是 CellSelection（有 $anchorCell / $headCell 属性）。
           * instanceof 之外再用属性兜底一次，防止打包后出现两份 prosemirror-tables
           * 模块导致 instanceof 失效。
           */
          if (selection instanceof CellSelection || (selection as any).$anchorCell != null) return false
          return true
        }
      })

      activeProvider = provider

      return {
        update: (view: any, prevState: any) => {
          // 先同步「已生效」的按钮状态，再交给 provider 决定显隐
          toolbar.syncActive(view)
          provider.update(view, prevState)
        },
        destroy: () => {
          if (activeProvider === provider) activeProvider = null
          provider.destroy()
        }
      }
    }
  })
}

/** 插件集合 */
export const selectionTooltipPlugins = [selectionTooltip].flat() as unknown as MilkdownPlugin[]
