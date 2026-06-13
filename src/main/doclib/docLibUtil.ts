/**
 * Windows风格的自然排序（忽略大小写、数字按数值比较）
 * 例如：["文章5", "文章41"] → ["文章5", "文章41"]
 */
export const naturalCompare = (a: string, b: string): number => {
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
 * 排序顶层数组（原地修改原数组）
 */
export const sortDocTreeList = (list: DocTree[]): DocTree[] => {
  list.forEach((item) => sortDocTree(item))
  list.sort(compareDocTree)
  return list
}

/**
 * 比较两个 DocTree 节点
 */
const compareDocTree = (a: DocTree, b: DocTree): number => {
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
const sortDocTree = (node: DocTree): DocTree => {
  if (node.children && node.children.length > 0) {
    // 先递归排序子节点
    node.children.forEach((child) => sortDocTree(child))
    // 再对当前层的子节点排序
    node.children.sort(compareDocTree)
  }
  return node
}

export function findNodesByIds(root: DocTree | DocTree[], ids: string[]): DocTree[] {
  if (!root || !ids.length) return []

  const idSet = new Set(ids)
  const result: DocTree[] = []
  let finished = false

  const search = (node: DocTree): boolean => {
    if (finished) return true

    if (idSet.has(node.id)) {
      result.push(node)
      idSet.delete(node.id)
      if (idSet.size === 0) {
        finished = true
        return true
      }
    }

    if (node.children) {
      for (const child of node.children) {
        if (search(child)) return true
      }
    }
    return false
  }

  const roots = Array.isArray(root) ? root : [root]
  for (const node of roots) {
    search(node)
    if (finished) break
  }

  return result
}
