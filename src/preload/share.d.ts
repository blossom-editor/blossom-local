declare interface R<T> {
  public ok: boolean
  public code: string
  public msg: string
  public data?: T
}

declare type DocType = 'FOLDER' | 'ARTICLE' | 'PICTURE'

/**
 * 基础接口
 */
declare interface Base {
  // 类型定义时非必填, 但拦截器会默认填充, 作为文档库的路径
  docLibPath?: string,
  outsideDocLib?: boolean  = false
}

/**
 * 文档库结构
 */
declare interface DocLibItem {
  name: string
  path: string
  icon?: string
  desc?: string
  isTop: boolean = false
  creTime: string
}

declare interface DocTreeReq extends Base {
  type: DocType
}

/**
 * 文档树结构
 */
declare interface DocTree {
  id: string
  type: DocType
  name: string
  formatName: string // 无后缀名称
  path: string
  size: bigint = 0n
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
  type: DocType
  creTime?: string
  updTime?: string
  markdown?: string // 文章正文
}

/**
 * 获取文件内容
 */
declare interface GetFileContentReq extends Base {
  id: string,
  path?: string
}

/**
 * 保存文件内容
 */
declare interface SaveFileContentReq extends Base {
  id: string
  path: string
  content: string
  words: number
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

/**
 * 创建文件
 */
declare interface CreateFileReq extends Base {
  path: string
}

/**
 * 创建文件的返回结果, 新建文件后会查询文档列表, 用于刷新页面, 无需再次调用查询接口
 */
declare interface CreateFileRes {
  newFileId: string
  docTree: DocTree[]
}

declare interface DeleteFileReq extends Base {
  path: string
}

/**
 * 选择系统中的文件并移动到文档库
 */
declare interface SelectFileAndMoveReq extends Base {
  // 将选择的文件保存到指定位置
  targetFilePath: string,
  // 是否覆盖同名文件
  cover: boolean = false,
  // 是否将文件名重命名
  newFileName: string = '',
}

/**
 * 选择系统中的文件并移动到文档库
 */
declare interface SelectFileAndMoveRes extends Base {
  // 文件在文档库中的位置
  filePath: string
  fileName: string
}


//#region ====================================< 图片 >====================================
declare interface PictureListReq extends Base {
  // 文件夹或文件的ID
  id: string
}

declare interface PictureListRes extends Base {
  // 文件夹或文件的ID
  totalCount: number
  totalSize: bigint
  pictures: DocTree[]
}
//#endregion
