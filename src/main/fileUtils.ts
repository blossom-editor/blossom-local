import path from 'path'
const fs = require('fs').promises

const isDebug = false

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

const debug = (msg: string) => {
  if (isDebug) {
    console.log('debug ==> ', msg)
  }
}
// ==================== 核心排序函数（基于字符串的自然排序） ====================

/**
 * 将字符串拆分为交替的非数字段和数字段
 * 例如 "folder10" -> ["folder", "10"]
 */
function splitName(name: string): string[] {
  const segments: string[] = [];
  let i = 0;
  const len = name.length;
  while (i < len) {
    if (/\d/.test(name[i])) {
      let j = i;
      while (j < len && /\d/.test(name[j])) j++;
      segments.push(name.slice(i, j));
      i = j;
    } else {
      let j = i;
      while (j < len && !/\d/.test(name[j])) j++;
      segments.push(name.slice(i, j));
      i = j;
    }
  }
  return segments;
}

/**
 * 比较两个数字字符串（可能包含前导零）
 * 返回负数表示 a < b，正数表示 a > b
 */
function compareNumberStr(a: string, b: string): number {
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  if (numA !== numB) return numA - numB;
  // 数值相同，短的数字字符串（前导零更少）排在前面，如 "2" < "02"
  return a.length - b.length;
}

/**
 * Windows 风格的自然字符串比较（不区分大小写，数字段按数值比较）
 * 返回负数表示 a < b，正数表示 a > b
 */
function windowsStringCompare(a: string, b: string): number {
  const segA = splitName(a);
  const segB = splitName(b);
  const maxLen = Math.max(segA.length, segB.length);
  for (let i = 0; i < maxLen; i++) {
    const partA = segA[i];
    const partB = segB[i];
    if (partA === undefined) return -1; // a 是 b 的前缀，a 更短，a 排前面
    if (partB === undefined) return 1;

    const isDigitA = /\d/.test(partA[0]);
    const isDigitB = /\d/.test(partB[0]);

    if (isDigitA && isDigitB) {
      const cmp = compareNumberStr(partA, partB);
      if (cmp !== 0) return cmp;
    } else if (!isDigitA && !isDigitB) {
      const cmp = partA.localeCompare(partB, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      // 保持稳定性：如果 base 比较相等，再按原始字符顺序
      const rawCmp = partA.localeCompare(partB);
      if (rawCmp !== 0) return rawCmp;
    } else {
      // 数字段排在非数字段前面（因为数字 ASCII 码小于字母）
      return isDigitA ? -1 : 1;
    }
  }
  return 0;
}

// ==================== DocTree 结构排序 ====================

export interface DocTree {
  id?: string;
  type: 'FOLDER' | 'ARTICLE';
  name: string;
  formatName: string; // 用于排序的字段（无后缀名称）
  path: string;
  icon?: string;
  updn?: boolean;
  creTime?: string;
  updTime?: string;
  children?: DocTree[];
}

/**
 * 递归地对 DocTree 节点的 children 数组进行原地排序（按 formatName，Windows 自然顺序）
 * @param node 要排序的树节点（会直接修改其 children 数组）
 */
export function sortDocTreeNode(node: DocTree): void {
  if (node.children && node.children.length > 0) {
    // 对当前节点的 children 按 formatName 排序
    node.children.sort((a, b) => windowsStringCompare(a.formatName, b.formatName));
    // 递归处理每个子节点
    for (const child of node.children) {
      sortDocTreeNode(child);
    }
  }
}

/**
 * 对 DocTree 数组（森林）进行排序，每个节点的 children 也会被递归排序
 * 注意：会直接修改传入的数组及其内部结构（原地排序），如需保留原数据请先深拷贝
 * @param trees DocTree 数组
 * @returns 排序后的数组（与输入引用相同，方便链式调用）
 */
export function sortDocTreeForest(trees: DocTree[]): DocTree[] {
  // 先对顶层数组按 formatName 排序
  trees.sort((a, b) => windowsStringCompare(a.formatName, b.formatName));
  // 再递归处理每个节点的 children
  for (const tree of trees) {
    sortDocTreeNode(tree);
  }
  return trees;
}

/**
 * 对单个 DocTree 节点进行排序（包括其所有后代）
 * 会直接修改原节点及其 children
 * @param root 根节点
 * @returns 排序后的根节点（方便链式调用）
 */
export function sortSingleDocTree(root: DocTree): DocTree {
  sortDocTreeNode(root);
  return root;
}
