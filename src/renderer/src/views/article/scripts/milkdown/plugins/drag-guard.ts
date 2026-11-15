/**
 * ============================================================================
 * 拖拽守卫：禁止在编辑器内拖动内容
 * ============================================================================
 *
 * ProseMirror 默认支持「选中一段文字 / 一张图片后，直接拖着它移动或拖到别的应用」。
 * 在正文里这更像误操作（选文字时手一抖就把整段搬走了，还会留下一个极难察觉的
 * 「原文被删掉、内容挪到别处」的结果），所以这里统一关掉。
 *
 * ## 为什么用「捕获阶段的原生监听」而不是 `handleDOMEvents`
 *
 * `handleDOMEvents` 是**冒泡阶段**在 `view.dom` 上执行的。代码块内部是一个嵌套的
 * CodeMirror（它自己也注册了 dragstart 处理器，会先于冒泡到 `view.dom` 前处理事件），
 * 于是「从代码块里把文字拖进正文」拦不住。
 * 改成在 `view.dom` 上加 `capture: true` 的监听：祖先的捕获阶段永远先于目标元素上的
 * 任何处理器，CodeMirror 与 ProseMirror 都还没反应过来，事件就已经被取消了。
 *
 * ## 只拦 `dragstart`，不拦其它
 *
 * | 场景 | 处理 |
 * | ---- | ---- |
 * | 拖动正文文字 / 图片 | `preventDefault()`，拖不起来 |
 * | 拖动代码块里的代码 | 同上（捕获阶段先拦，CodeMirror 收不到） |
 * | 从系统里拖图片文件进来上传 | 走的是 `dragenter` / `dragover` / `drop`，不受影响 |
 * | 表格行 / 列拖拽手柄 | 手柄自带 `draggable="true"` 与自己的 `dragstart`，放行（`data-role="*-drag-handle"`） |
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { $prose } from '@milkdown/kit/utils'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'

/** 表格组件的行 / 列拖拽手柄 */
const DRAG_HANDLE_SELECTOR = '[data-role$="drag-handle"]'

export const dragGuardPlugin = $prose(() => {
  const key = new PluginKey('BL_DRAG_GUARD')

  return new Plugin({
    key,
    view: (editorView) => {
      const onDragStart = (event: DragEvent) => {
        const target = event.target as HTMLElement | null

        // 表格的行 / 列手柄：交给组件自己处理（拖动整行整列是它的正常交互）
        if (target?.closest?.(DRAG_HANDLE_SELECTOR)) return

        event.preventDefault()
        // 同时切断冒泡 / 捕获，CodeMirror 与 ProseMirror 都不再做拖拽记账
        event.stopPropagation()
      }

      editorView.dom.addEventListener('dragstart', onDragStart, true)

      return {
        destroy: () => editorView.dom.removeEventListener('dragstart', onDragStart, true)
      }
    }
  })
})

/** 插件集合 */
export const dragGuardPlugins = [dragGuardPlugin].flat() as unknown as MilkdownPlugin[]
