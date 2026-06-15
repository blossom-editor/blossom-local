/* ======================================================================
 * 文章树状列表
 * ====================================================================== */
import Node from 'element-plus/es/components/tree/src/model/node'
import { StyleValue } from 'vue'

/** 树状列表中的虚拟文件夹, 文档库根目录文件夹ID */
export const DOC_LIB_ROOT_FOLDER_ID: string = '-1'

export const buildDocLibRootFolder = (docLibPath: string): DocTree => {
  const root: DocTree = {
    id: DOC_LIB_ROOT_FOLDER_ID,
    name: '文档库根目录',
    path: docLibPath,
    folderPath: docLibPath,
    icon: 'wl-folder0',
    updn: false,
    creTime: '',
    updTime: '',
    type: 'FOLDER',
    formatName: '文档库根目录',
    size: 0,
    status: 'NORMAL',
    childrenFileCount: 0
  }
  return root
}

export const getColor = (node: Node) => {
  if (node.level === 1) {
    return '#878787AF'
  }
  if (node.level === 2) {
    return '#89A319AA'
  }
  if (node.level === 3) {
    return '#A37E19AA'
  }
  if (node.level === 4) {
    return '#A33B19AA'
  }
  if (node.level === 5) {
    return '#19A383AA'
  }
  return
}

export const getChildFileCountColor = (node: Node): StyleValue => {
  if (node.data.childrenFileCount > 20) {
    return { background: '#A33B19AA' }
  } else if (node.data.childrenFileCount > 10) {
    return { background: '#A37E19AA' }
  } else if (node.data.childrenFileCount > 0) {
    return { background: '#89A319AA' }
  } else if (node.data.childrenFileCount === 0) {
    return { background: '#00000000', color: '#00000000' }
  }
  return { background: '#D1D1D12C', color: '#B1B1B181' }
}

export interface NeedUpd {
  i: string
  p: string
  s: number
  n: string
  ty: DocType
}

/**
 * 从 nodes 中获取最大排序, 排除掉 drag
 */
export const getMaxSort = (drag: Node, nodes: Node[]): number => {
  const maxSort = Math.max.apply(
    Math,
    nodes
      .filter((n) => n.data.i != drag.data.i)
      .map((item) => {
        return item.data.s
      })
  )
  return maxSort
}

/**
 * 拖拽时, 检查文件夹类型与文档类型是否相同
 *
 * @param node 节点
 * @param folderType 文件夹类型
 * @returns true/false
 */
const checkFolderType = (node: Node, folderType: FolderType): boolean => {
  const ty = node.data.ty
  if (folderType === 1) {
    if (ty === 1 || ty === 3) {
      return true
    }
  } else if (folderType === 2) {
    if (ty === 2) {
      return true
    }
  }

  return false
}

const checkFolderTypeByOrigin = (node: DocTree, folderType: FolderType): boolean => {
  const ty = node.ty
  if (folderType === 1) {
    if (ty === 1 || ty === 3) {
      return true
    }
  } else if (folderType === 2) {
    if (ty === 2) {
      return true
    }
  }

  return false
}
