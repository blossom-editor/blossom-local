import { isNull } from '@renderer/assets/utils/obj'
import { randomInt } from '@renderer/assets/utils/util'

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
   *
   * 10 : picture
   * 11 : inner article
   * 12 : unknown inner article
   * 21 : public article
   */
  type: 'PICTURE' | 'INNER_ARTICLE' | 'UNKNOWN_INNER_ARTICLE' | 'PUBLIC_ARTICLE'
}

/**
 * 目录结构
 */
export interface Toc {
  content: string
  clazz: string
  id: string
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
    let toc: Toc = { content: content, clazz: 'toc-' + level, id: id }
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
