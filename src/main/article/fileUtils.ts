/**
 * 简单的字数统计
 * 一个英文单词（如 “hello”）算 1 字，一个汉字（如 “你”）也算 1 字
 * @param text 文档正文
 * @returns 字数
 */
export function countWords(text: string): number {
  let count = 0
  let i = 0
  const len = text.length

  while (i < len) {
    const code = text.charCodeAt(i)

    // 1. 汉字（基本区，与原函数范围一致）
    if (code >= 0x4e00 && code <= 0x9fff) {
      count++
      i++
      continue
    }

    // 2. 英文字母 → 连续字母作为一个单词计数一次
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      while (i < len) {
        const c = text.charCodeAt(i)
        if (!((c >= 65 && c <= 90) || (c >= 97 && c <= 122))) break
        i++
      }
      count++
      continue
    }

    // 3. 数字 → 连续数字串作为一个整体计数一次（原函数 \d+ 行为）
    if (code >= 48 && code <= 57) {
      while (i < len && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
        i++
      }
      count++
      continue
    }

    // 4. 其他字符（标点、空格、换行等）跳过
    i++
  }

  return count
}
