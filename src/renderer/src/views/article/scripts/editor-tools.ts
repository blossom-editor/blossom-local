import { platform } from '@renderer/assets/utils/util'

const isMac = platform() === 'darwin'

/**
 * 快捷键说明
 *
 * 说明：接入 milkdown 之后，快捷键分两部分：
 * 1. milkdown 内置（Mod-b 加粗、Mod-i 斜体…），与主流编辑器一致
 * 2. Blossom 传统快捷键（Alt-b 加粗等），在 scripts/milkdown/editor.ts 的
 *    shortcut 插件里注册，保证老用户的使用习惯不变
 *
 * 已废弃：Alt+2 / Alt+3 / Alt+4（浮动目录、全屏预览、全屏编辑），
 * 所见即所得模式下不再需要对应功能。
 */
export const keymaps = {
  save: isMac ? '⌘ S' : 'Ctrl + S',
  hideDocs: isMac ? '⌘ 1' : 'Alt + 1',

  blod: isMac ? '⌘ B' : 'Ctrl + B（或 Alt + B）',
  italic: isMac ? '⌘ I' : 'Ctrl + I（或 Alt + I）',
  striket: isMac ? '⌘ ⌥ X' : 'Ctrl + Alt + X（或 Alt + S）',
  sup: isMac ? '—' : '—',
  sub: isMac ? '—' : '—',
  separator: isMac ? '—' : '—',

  blockquote: isMac ? '⌘ ⇧ B' : 'Ctrl + Shift + B',
  code: isMac ? '⌘ E' : 'Ctrl + E（或 Alt + E）',
  pre: isMac ? '⌘ ⌥ C' : 'Ctrl + Alt + C',

  table: isMac ? '—' : 'Alt + T',
  image: isMac ? '—' : 'Alt + M',
  link: isMac ? '—' : 'Alt + K',

  heading1: isMac ? '⌘ ⌥ 1' : 'Ctrl + Alt + 1',
  heading2: isMac ? '⌘ ⌥ 2' : 'Ctrl + Alt + 2',
  heading3: isMac ? '⌘ ⌥ 3' : 'Ctrl + Alt + 3',
  unordered: isMac ? '⌘ ⌥ 8' : 'Ctrl + Alt + 8',
  ordered: isMac ? '⌘ ⌥ 7' : 'Ctrl + Alt + 7',
  hardbreak: isMac ? '⇧ Enter' : 'Shift + Enter',

  // 编辑器通用
  search: isMac ? '⌘ F' : 'Ctrl + F',
  cut: isMac ? '⌘ X' : 'Ctrl + X',
  redo: isMac ? '⌘ ⇧ Z' : 'Ctrl + Y',
  undo: isMac ? '⌘ Z' : 'Ctrl + Z',
  selectAll: isMac ? '⌘ A' : 'Ctrl + A',
  slash: isMac ? '/' : '/'
}
