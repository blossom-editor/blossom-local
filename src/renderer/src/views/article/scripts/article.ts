import { isNull } from '@renderer/assets/utils/obj'
import { randomInt } from '@renderer/assets/utils/util'
import { headingRuns } from './heading-runs'
import type { HeadingRun } from './heading-runs'

/**
 * 临时内容的 localStorage key
 */
export const TempTextareaKey = 'editor_temp_textarea_value'

/**
 * doc tree and editor width
 */
export interface DocsEditorStyle {
  docs: string
  editor: string
}

/**
 * article reference
 */
export interface ArticleReference {
  /**
   * reference targetid
   *
   * if type === 10 | 21, targetId is 0
   * else targetId is articleId
   */
  targetId: string
  /**
   * Target name
   *
   * if type === 10 | 21, targetName is ''
   * else targetId is articleName
   */
  targetName: string
  /**
   * Target name
   *
   * if type === 10 | 21, targetName is ''
   * else targetId is articleName
   */
  targetUrl: string
  /**
   * 文章的引用类型
   */
  type: 'PICTURE' | 'INNER_ARTICLE' | 'UNKNOWN_INNER_ARTICLE' | 'PUBLIC_ARTICLE'
}

/**
 * 目录结构
 */
export interface Toc {
  /** 标题纯文本 */
  content: string
  /** 标题级别对应的 class（`toc-1` ~ `toc-6`） */
  clazz: string
  /** 标题元素 id，点击目录时用它滚动定位 */
  id: string
  /**
   * 按颜色切分后的标题文字
   *
   * 与编辑器右侧目录（`milkdown/editor.ts` 的 `HeadingItem.runs`）同一份实现，
   * 见 `scripts/heading-runs.ts`：只有正文里被上色的那几个字才带 color。
   */
  runs: HeadingRun[]
}

/**
 * 解析文章中的标题, 返回目录对象集合
 *
 * @param ele
 * @returns
 */
export const parseTocAsync = async (ele: HTMLElement): Promise<Toc[]> => {
  let heads = ele.querySelectorAll('h1, h2, h3, h4, h5, h6')
  let tocs: Toc[] = []
  for (let i = 0; i < heads.length; i++) {
    let head: Element = heads[i]
    let level = 1
    let content = (head as HTMLElement).innerText
    let id = head.id
    if (isNull(id)) {
      id = randomInt(1000000, 9999999).toString() + content
      head.id = id
    }
    switch (head.localName) {
      case 'h1':
        level = 1
        break
      case 'h2':
        level = 2
        break
      case 'h3':
        level = 3
        break
      case 'h4':
        level = 4
        break
      case 'h5':
        level = 5
        break
      case 'h6':
        level = 6
        break
    }
    let toc: Toc = { content: content, clazz: 'toc-' + level, id: id, runs: headingRuns(head as HTMLElement) }
    tocs.push(toc)
  }
  return tocs
}

/**
 * 下载返回对象
 *
 * @param resp
 */
export const downloadTextPlain = (resp: any) => {
  let filename: string = resp.headers.get('content-disposition')
  let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
  let matches = filenameRegex.exec(filename)
  if (matches != null && matches[1]) {
    filename = decodeURI(matches[1].replace(/['"]/g, ''))
  }
  filename = decodeURI(filename)
  let a = document.createElement('a')
  let blob = new Blob([resp.data], { type: 'text/plain' })
  let objectUrl = URL.createObjectURL(blob)
  a.setAttribute('href', objectUrl)
  a.setAttribute('download', filename)
  a.click()
  URL.revokeObjectURL(a.href)
  a.remove()
}

/**
 * 简单的字数统计
 * 一个英文单词（如 “hello”）算 1 字，一个汉字（如 “你”）也算 1 字
 */
export function countWords(text: string) {
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

//#region ----------------------------------------< markdown 代码区识别 >--------------------------------------

/**
 * ⚠️ 主进程 `src/main/doclib/markdownCode.ts` 里的 `buildCodeMask` 是这里的**逐行副本**。
 *
 * 本项目 main / renderer 独立打包，刻意不建跨边界共享模块（与 `countWords` 各放一份的
 * 做法一致）。修改识别规则时**必须同步改两处**，否则同一篇文章在编辑器右侧目录里
 * 不算图片、在图片管理 / 双链图表里却统计出假引用。
 */

/**
 * 屏蔽代码内容时使用的占位符
 *
 * 用 NUL(\u0000) 而不是空格：空格会被图片正则里的 `\s*` 消耗掉，可能让被屏蔽的
 * 代码片段和前后的普通文本拼出一个假的 `![...](...)`；NUL 不会与正则里的结构字符
 * （`!` `[` `]` `(` `)`）混淆。屏蔽是**等长替换**，字符串下标保持不变。
 */
const CODE_MASK_CHAR = '\u0000'

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

/**
 * 把 markdown 里的代码内容替换成等长占位符，其余字符原样保留
 *
 * 之后可直接跑原来的图片正则，且不会跨代码块边界拼出伪造的图片引用。
 *
 * @param markdown 原始 markdown
 * @returns 与入参等长、代码部分被 CODE_MASK_CHAR 替换的字符串
 */
export const maskCodeContent = (markdown: string): string => {
  const mask = buildCodeMask(markdown)
  const chars = markdown.split('')
  for (let i = 0; i < chars.length; i++) {
    if (mask[i]) chars[i] = CODE_MASK_CHAR
  }
  return chars.join('')
}

//#endregion

/**
 * 从 markdown 中解析出所有图片引用（纯函数，不做任何路径转换）
 *
 * 正则口径与主进程 docLibStatsManager 一致：`![alt](url)` 以及可选的 `![alt](url "title")`，
 * 但会先屏蔽代码块 / 行内代码，避免把文档里作为示例写的 `![...]()` 当成真实图片。
 *
 * @param markdown 文章内容
 * @returns 图片的 alt 与 url 列表
 */
export const parseImageRefs = (markdown: string): { alt: string; url: string }[] => {
  const result: { alt: string; url: string }[] = []
  if (!markdown) return result
  const text = maskCodeContent(markdown)
  const reg = /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+['"][^'"]*['"])?\s*\)/g
  let matched: RegExpExecArray | null
  while ((matched = reg.exec(text)) !== null) {
    const url = matched[2] ?? ''
    // 极端情况：`![alt](`code`)` —— 地址整个是行内代码，屏蔽后只剩占位符，并非真实图片
    if (url.includes(CODE_MASK_CHAR)) continue
    result.push({ alt: matched[1] ?? '', url })
  }
  return result
}
