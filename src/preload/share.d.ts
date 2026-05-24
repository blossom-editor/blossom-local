declare interface Base {
  // 文档库的路径
  docLibPath?: string
}

// 文档库结构
declare interface DocLibItem {
  name: string
  path: string
  icon?: string
  desc?: string
  creTime: string
}

declare interface DocTree {
  id: string
  type: 'FOLDER' | 'ARTICLE'
  name: string
  formatName: string // 无后缀名称
  path: string
  icon?: string
  updn?: boolean
  creTime?: string
  updTime?: string
  children?: DocTree[]
}

/**
 * 文章详情
 */
declare interface DocInfo {
  id: string
  name: string
  words?: number
  version?: number
  path: string
  type: 'FOLDER' | 'ARTICLE'
  creTime?: string
  updTime?: string
  markdown?: string // 文章正文
}

/**
 * 获取文件内容
 */
declare interface GetFileContentReq extends Base {
  path: string
}

/**
 * 保存文件内容
 */
declare interface SaveFileContentReq extends Base {
  path: string
  content: string
  words?: number
}

/**
 * 重命名文件
 */
declare interface RenameFileReq extends Base {
  oldPath: string
  newPath: string
}

/**
 * 移动文件
 */
declare interface MoveFileReq extends Base {
  oldPath: string
  newPath: string
}

declare interface R<T> {
  public ok: boolean
  public code: number
  public msg: string
  public data?: T
}
