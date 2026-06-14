declare interface R<T> {
  public ok: boolean
  public code: string
  public msg: string
  public data?: T
}

declare type DocType = 'FOLDER' | 'ARTICLE' | 'PICTURE'
/**
 * 文档状态
 * NORMAL: 正常
 * PICTURE_REPEAT: 图片重复
 * ARTICLE_PIC_ERROR: 文章图片错误
 * ARTICLE_LINK_ERROR: 文章链接错误
 */
declare type DocStatus = 'NORMAL' | 'PICTURE_REPEAT' | 'ARTICLE_PIC_ERROR' | 'ARTICLE_LINK_ERROR'

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
  // 完整的路径, 包含路径和文件名
  path: string
  // 文件或文件夹所在的文件夹, 路径中不包含自身
  folderPath: string
  size: number
  icon?: string
  updn?: boolean
  creTime?: string
  updTime?: string
  children?: DocTree[]
  status: DocStatus
  // 子文件数量, 不包含文件夹
  childrenFileCount: number
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
  replace: boolean,
  // 是否将文件名重命名
  newFileName: string
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
declare interface Picture {
  id: string
  type: DocType
  name: string
  suffix: string
  formatName: string // 无后缀名称
  path: string
  folderPath: string
  localProtocolPath: string
  size: number = 0
  icon?: string
  updn?: boolean
  checked: boolean
  delTime: 0 | 1 | 2
  creTime?: string
  updTime?: string
  articleLinks: ArticleLink[]
}

declare interface ArticleLink {
  id: string
  name: string
}

/**
 * 指定文件夹下的文件列表
 */
declare interface PictureListReq extends Base {
  // 文件夹或文件的ID
  id: string
  pageNum: number
  pageSize: number
}

/**
 * 指定文件夹下的文件列表返回
 */
declare interface PictureListRes extends Base {
  totalCount: number // 文件数量
  totalSize: number // 文件大小
  pictures: Picture[]
}

declare interface PictureInfoReq extends Base {
  id: string
}


/**
 * 选择系统中的文件并移动到文档库
 */
declare interface SelectPicAndMoveReq extends Base {
  // 以文章的路径作为上传路径
  targetDocId: string
  // 将图片上传到文档库根目录
  targetDocLibRoot: boolean
  // 是否替换同名文件
  replace: boolean
}

/**
 * 将文件流保存为图片
 */
declare interface FileBuffSaveReq extends Base {
  // 以文章的路径作为上传路径
  targetDocId: string
  // 文件名
  fileName?: stirng
  // 文件流
  fileBuffer: ArrayBuffer
}

/**
 * 批量删除图片
 */
declare interface PictureDeleteBatchReq extends Base {
  ids:string []
}

declare interface PictureMoveBatchReq extends Base  {
  ids:string []
  targetDocId: stirng
}

//#endregion
