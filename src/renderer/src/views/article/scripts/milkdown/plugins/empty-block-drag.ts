/**
 * ============================================================================
 * 空行划选补丁：从空段落拖动也能选中文字
 * ============================================================================
 *
 * ## 问题
 *
 * 段落的**文字**上按下拖动，浏览器原生就能划选；但从一个**空段落**（含文档末尾
 * 那个空行）按下再拖，浏览器不会进入「划选」状态 —— 鼠标指针变成拖拽样式，
 * 松手后选区仍然是空段落里的那个光标，选不中任何东西。
 *
 * 原因是空段落里没有文本节点（只有一个 `<br class="ProseMirror-trailingBreak">`），
 * Chromium 的 range selection 不会从这种落点开始。ProseMirror 自己也没有处理这个
 * 场景，所以只能补一段：按下时记下锚点，拖动时用 `posAtCoords` 自己扩展选区。
 *
 * ## 为什么要在 mouseup 之后再落一次选区
 *
 * ProseMirror 的 `LeftMouseDown.up()` 在「按下时 DOM 有待刷新」（`flushed`）的情况下
 * 会把选区重置回**按下点**（`updateSelection(Selection.near(doc.resolve(pos.pos)))`），
 * 正好把我们拖出来的选区又收回去了。所以松手后等一个宏任务，再把最终选区落下去。
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey, TextSelection } from '@milkdown/kit/prose/state'

export const emptyBlockDragPlugin = $prose(() => {
  const key = new PluginKey('BL_EMPTY_BLOCK_DRAG')

  /** 拖动锚点（按下时的文档位置），null 表示当前不在自定义划选中 */
  let anchorPos: number | null = null
  let editorView: any = null

  /** 把「锚点 -> head」落成选区 */
  const applySelection = (anchor: number, head: number) => {
    if (!editorView) return
    const { state } = editorView
    const size = state.doc.content.size
    const from = Math.max(1, Math.min(anchor, size - 1))
    const to = Math.max(1, Math.min(head, size - 1))
    if (from === to) return
    const next = TextSelection.create(state.doc, from, to)
    if (!state.selection.eq(next)) editorView.dispatch(state.tr.setSelection(next))
  }

  /** 拖动过程中实时扩展选区 */
  const onMouseMove = (event: MouseEvent) => {
    if (anchorPos == null || !editorView) return
    // 按键已经松开（比如在窗口外松手），结束本次划选
    if ((event.buttons & 1) === 0) {
      anchorPos = null
      return
    }
    const coords = editorView.posAtCoords({ left: event.clientX, top: event.clientY })
    if (!coords) return
    applySelection(anchorPos, coords.pos)
  }

  /** 松手：把最终选区再落一次（详见文件头注释） */
  const onMouseUp = (event: MouseEvent) => {
    if (anchorPos == null || !editorView) return
    const anchor = anchorPos
    anchorPos = null

    const coords = editorView.posAtCoords({ left: event.clientX, top: event.clientY })
    if (!coords || coords.pos === anchor) return
    // 等 ProseMirror 自己的 mouseup 处理跑完，它可能会把选区重置回按下点
    setTimeout(() => applySelection(anchor, coords.pos), 0)
  }

  return new Plugin({
    key,
    view: (view) => {
      editorView = view
      document.addEventListener('mousemove', onMouseMove, true)
      document.addEventListener('mouseup', onMouseUp, true)
      return {
        destroy: () => {
          document.removeEventListener('mousemove', onMouseMove, true)
          document.removeEventListener('mouseup', onMouseUp, true)
          editorView = null
          anchorPos = null
        }
      }
    },
    props: {
      handleDOMEvents: {
        mousedown(view, event: MouseEvent) {
          // 只接管「左键、无修饰键」的普通按下
          if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false

          /*
           * 代码块内部是 CodeMirror，它有自己的一套选区；表格有自己的单元格选区。
           * 这两种场景都交给组件自己处理，别去抢。
           */
          const hit = event.target as HTMLElement | null
          if (hit?.closest?.('.cm-editor') || hit?.closest?.('.milkdown-table-block')) return false

          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
          if (!coords) return false
          const $pos = view.state.doc.resolve(coords.pos)
          // 只有落在**空的文本块**上才接管：有文字的段落交给浏览器原生划选
          if (!$pos.parent.isTextblock || $pos.parent.content.size > 0) return false

          anchorPos = coords.pos
          // 返回 false：先让 ProseMirror 把自己的光标 / 选区处理好
          return false
        }
      }
    }
  })
})

/** 插件集合 */
export const emptyBlockDragPlugins = [emptyBlockDragPlugin].flat() as unknown as MilkdownPlugin[]
