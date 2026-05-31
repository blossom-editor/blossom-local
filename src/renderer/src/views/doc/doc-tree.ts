/* ======================================================================
 * 文章树状列表
 * ====================================================================== */
import { getParentDirPath, joinPath } from '@renderer/assets/utils/util'
import Node from 'element-plus/es/components/tree/src/model/node'
import { DragEvents } from 'element-plus/es/components/tree/src/model/useDragNode'
import { NodeDropType } from 'element-plus/es/components/tree/src/tree.type'
import { Ref } from 'vue'

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

export interface NeedUpd {
  i: string
  p: string
  s: number
  n: string
  ty: DocType
}

/**
 * 拖拽后处理各个节点排序
 * @param drag 拖拽的节点
 * @param enter 放入的节点
 * @param dropType 拖拽的类型
 * @param _event 事件
 * @param DocTreeRef 树状列表对象
 * @param docTreeData 树状类表数据
 * @param folderType 文件夹类型: 1:文章文件夹|2:图片文件夹
 * @param dropAfter 修改后的回调方法, 请求接口
 */
export const handleTreeDrop = (
  drag: Node,
  enter: Node,
  dropType: NodeDropType,
  _event: DragEvents,
  DocTreeRef: Ref,
  docTreeData: Ref<DocTree[]>
): MoveFileReq | null => {
  // 是否同级别
  const isSame = drag.data.path === enter.data.path
  // 同级别不能移动, 目前有校验显示, 该判断不会为 true
  if (isSame) {
    return null
  }

  const parmas: MoveFileReq = {
    oldPath: drag.data.path,
    newPath: ''
  }

  // console.log(`same: ${isSame}, dropType: ${dropType}, 拖动文件类型: ${drag.data.type}`)
  // console.log('拖动的', drag.data)
  // console.log('放置的', enter.data)

  if (dropType === 'inner') {
    if (drag.data.type === 'ARTICLE') {
      parmas.newPath = joinPath(enter.data.path, drag.data.name)
    } else if (drag.data.type === 'FOLDER') {
      parmas.newPath = joinPath(enter.data.path, drag.data.name)
    }
  } else if (dropType === 'before' || dropType === 'after') {
    if (drag.data.type === 'ARTICLE') {
      parmas.newPath = joinPath(getParentDirPath(enter.data.path), drag.data.name)
    } else if (drag.data.type === 'FOLDER') {
      parmas.newPath = joinPath(getParentDirPath(enter.data.path), drag.data.name)
    }
  }
  // console.log('最终数据', parmas)
  return parmas
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
