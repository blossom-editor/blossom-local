const fs = require('fs').promises

const isDebug = false

const debug = (msg: string) => {
  if (isDebug) {
    console.log('debug ==> ', msg)
  }
}
export const toObj = (str: string): any => {
  return JSON.parse(str)
}

// 读取文件内容并返回, 出错是将错误抛出
export const readFile = async (filePath: string): Promise<string | any> => {
  try {
    debug('读取文件: ')
    const data = await fs.readFile(filePath, 'utf8')
    debug('文件内容: ' + data)
    return data
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error)
    throw error
  }
}

// 简单的字数统计
// 一个英文单词（如 “hello”）算 1 字，一个汉字（如 “你”）也算 1 字
export function countWords(text: string) {
  // 匹配中文字符（基本汉字）或 英文单词（允许连字符和撇号）
  const regex = /[\u4e00-\u9fff]|\d+|[A-Za-z]+(?:[-'][A-Za-z]+)*/g
  const matches = text.match(regex)
  return matches ? matches.length : 0
}

/**
 * Windows风格的自然排序（忽略大小写、数字按数值比较）
 * 例如：["文章5", "文章41"] → ["文章5", "文章41"]
 */
function naturalCompare(a: string, b: string): number {
  // 正则：将字符串分割为字母/非数字部分 和 数字部分
  const partsA = a.toLowerCase().match(/(\d+|\D+)/g) || []
  const partsB = b.toLowerCase().match(/(\d+|\D+)/g) || []

  const len = Math.min(partsA.length, partsB.length)
  for (let i = 0; i < len; i++) {
    const aIsNum = /^\d+$/.test(partsA[i])
    const bIsNum = /^\d+$/.test(partsB[i])

    if (aIsNum && bIsNum) {
      // 数字部分：按数值比较
      const diff = parseInt(partsA[i], 10) - parseInt(partsB[i], 10)
      if (diff !== 0) return diff
    } else {
      // 非数字部分：按字符串比较（已转为小写）
      const comp = partsA[i].localeCompare(partsB[i])
      if (comp !== 0) return comp
    }
  }
  // 所有公共部分相等，长度短的排前面（与Windows一致）
  return partsA.length - partsB.length
}

/**
 * 比较两个 DocTree 节点
 */
function compareDocTree(a: DocTree, b: DocTree): number {
  // 1. 类型优先：FOLDER < ARTICLE
  if (a.type !== b.type) {
    return a.type === 'FOLDER' ? -1 : 1
  }
  // 2. 同类型：使用 formatName（无后缀）进行自然排序
  return naturalCompare(a.formatName, b.formatName)
}

/**
 * 递归排序整个文档树（原地修改）
 */
function sortDocTree(node: DocTree): DocTree {
  if (node.children && node.children.length > 0) {
    // 先递归排序子节点
    node.children.forEach((child) => sortDocTree(child))
    // 再对当前层的子节点排序
    node.children.sort(compareDocTree)
  }
  return node
}

/**
 * 排序顶层数组（原地修改原数组）
 */
export function sortDocTreeList(list: DocTree[]): DocTree[] {
  list.forEach((item) => sortDocTree(item))
  list.sort(compareDocTree)
  return list
}
