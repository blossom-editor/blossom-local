export type shortcutFunc = () => void

// 以下快捷键不会参与到监听中
const ignoreCodes: string[] = ['Backspace', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
