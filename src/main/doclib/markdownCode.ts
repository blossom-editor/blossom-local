/**
 * markdown 代码区识别（主进程副本）
 *
 * ⚠️ `buildCodeMask` 是渲染进程
 * `src/renderer/src/views/article/scripts/article.ts` 中同名函数的**逐行副本**。
 *
 * 本项目 main / renderer 独立打包，刻意不建跨边界共享模块（与 `countWords` 各放一份的
 * 做法一致）。修改识别规则时**必须同步改两处**，否则同一篇文章在编辑器右侧目录里
 * 不算图片、在图片管理 / 双链图表里却统计出假引用。
 *
 * 这里只导出标记数组版本：主进程的 `extractImagesAndLinksFast` 需要保留 `raw`
 * 原始切片（重命名图片 / 文章时要靠它回写 markdown），不能把正文换成占位符。
 * 渲染进程那份另外基于本函数提供了 `maskCodeContent()`，供图片正则直接使用。
 */

/** 去掉行首的引用块标记，用于识别嵌在 `> ` 里的围栏代码块 */
const stripQuotePrefix = (line: string): string => line.replace(/^[ \t]*(?:>[ \t]?)+/, '')

/**
 * 识别围栏代码块的开始行，返回围栏字符与长度
 *
 * - 允许行首缩进 / 引用块前缀（列表、blockquote 里的代码块）
 * - 反引号围栏的 info string 不允许再出现反引号（CommonMark 约定）
 */
const matchFenceOpen = (line: string): { char: string; len: number } | null => {
  const matched = /^[ \t]*(`{3,}|~{3,})([^\r\n]*)$/.exec(line)
  if (!matched) return null
  if (matched[1][0] === '`' && matched[2].includes('`')) return null
  return { char: matched[1][0], len: matched[1].length }
}

/** 是否为当前围栏的结束行：同类围栏字符、长度不小于开始行、后面只能有空白 */
const isFenceClose = (line: string, char: string, len: number): boolean => {
  const matched = /^[ \t]*(`+|~+)[ \t]*$/.exec(line)
  return !!matched && matched[1][0] === char && matched[1].length >= len
}

/**
 * 生成 markdown 的代码区标记
 *
 * 识别两类代码：
 * 1. 围栏代码块（``` / ~~~，含语言标记、任意长度围栏、未闭合围栏、CRLF、缩进、引用块）
 * 2. 行内代码（`` `...` `` / `` ``...`` ``，闭合串长度必须与开启串一致，可跨行但不跨空行）
 *
 * 缩进式代码块（行首 4 空格）不做处理：本项目的 markdown 由 remark 序列化，
 * 代码块统一输出为围栏形式；强行按缩进屏蔽会误伤列表项里缩进的正文图片。
 *
 * @param markdown 原始 markdown
 * @returns 与 markdown.length 等长的数组，值为 1 表示该字符位于代码区
 */
export const buildCodeMask = (markdown: string): Uint8Array => {
  const mask = new Uint8Array(markdown.length)
  const markRange = (from: number, to: number): void => {
    for (let i = from; i < to; i++) mask[i] = 1
  }

  // ---------------- 1. 围栏代码块（按行扫描） ----------------
  let offset = 0
  let fence: { char: string; len: number; quoted: boolean } | null = null
  for (const line of markdown.split('\n')) {
    // 源文件可能是 CRLF，匹配前先去掉行尾 \r；标记时仍按整行处理
    const raw = line.endsWith('\r') ? line.slice(0, -1) : line
    const body = stripQuotePrefix(raw)
    const lineEnd = offset + line.length
    if (fence) {
      markRange(offset, lineEnd)
      // 只有「带引用前缀的围栏」才认带引用前缀的结束行。
      // 否则代码块内容里恰好有一行 `> ``` ` 时会被误判为围栏结束，
      // 后面的代码内容就又会被当成正文解析。
      if (isFenceClose(fence.quoted ? body : raw, fence.char, fence.len)) fence = null
    } else {
      const opened = matchFenceOpen(body)
      if (opened) {
        fence = { ...opened, quoted: body !== raw }
        markRange(offset, lineEnd)
      }
    }
    offset = lineEnd + 1 // 跳过 '\n'
  }

  // ---------------- 2. 行内代码（按反引号串扫描） ----------------
  const len = markdown.length
  let i = 0
  while (i < len) {
    // 围栏区里的反引号属于代码内容，不能当作行内代码的定界符
    if (mask[i] || markdown[i] !== '`') {
      i++
      continue
    }
    const runStart = i
    while (i < len && !mask[i] && markdown[i] === '`') i++
    const runLen = i - runStart

    // 闭合串必须与开启串长度完全相同；不同长度的反引号串只是代码内容
    let j = i
    let closeStart = -1
    while (j < len) {
      if (mask[j]) {
        j++
        continue
      }
      // CommonMark：行内代码不能跨空行。遇到空行就放弃配对，避免把两个段落里
      // 零散的反引号误连成一大段「代码」，从而误屏蔽中间的正文图片。
      if (markdown[j] === '\n') {
        let n = j + 1
        while (n < len && (markdown[n] === ' ' || markdown[n] === '\t' || markdown[n] === '\r')) n++
        if (n >= len || markdown[n] === '\n') break
      }
      if (markdown[j] !== '`') {
        j++
        continue
      }
      let k = j
      while (k < len && !mask[k] && markdown[k] === '`') k++
      if (k - j === runLen) {
        closeStart = j
        break
      }
      j = k
    }

    // 没有闭合串：这些反引号是普通文本，保持原样（i 已指向开启串之后）
    if (closeStart === -1) continue
    const closeEnd = closeStart + runLen
    markRange(runStart, closeEnd)
    i = closeEnd
  }

  return mask
}
