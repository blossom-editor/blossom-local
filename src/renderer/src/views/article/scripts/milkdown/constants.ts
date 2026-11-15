/**
 * ============================================================================
 * 编辑器事件名常量
 * ============================================================================
 *
 * milkdown 内部（NodeView / ProseMirror 插件）与 Vue 页面之间通过**自定义 DOM 事件**通信，
 * 事件名集中在这里维护，避免出现「改了插件忘了改页面」的问题。
 *
 * 事件都从编辑器内部元素冒泡到页面容器，页面只需要在容器上监听一次。
 */

/** 键盘触发的「需要弹窗」的请求（插入图片 / 链接），detail: { type: 'image' | 'link' } */
export const REQUEST_EVENT = 'bl-editor-request'

/** Ctrl / Cmd + 单击链接，detail: LinkClickDetail */
export const LINK_CLICK_EVENT = 'bl-link-click'

/** 点击图片，detail: ImageClickDetail */
export const IMAGE_CLICK_EVENT = 'bl-image-click'

/** 双击公式，detail: MathEditDetail */
export const MATH_EDIT_EVENT = 'bl-math-edit'

/** 插入图片 / 链接请求 */
export interface EditorRequestDetail {
  type: 'image' | 'link'
}
