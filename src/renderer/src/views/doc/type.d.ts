/** 右键菜单对象的显示位置 */
declare type RightMenu = { show: boolean; clientX?: number; clientY?: number }

declare type RightMenuLevel2 = { top: string }

/** 快捷标签 */
declare type QuickTag = { name: string; selected: boolean }

/**
 * 在 window 注册内联事件
 */
declare interface Window {
  onHtmlEventDispatch: any
}
