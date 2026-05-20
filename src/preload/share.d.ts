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
  path?: string
  type: 'FOLDER' | 'ARTICLE'
  creTime?: string
  updTime?: string
  // 文章正文
  markdown?: string
}

declare interface GetFileContentReq {
  path: string
}

declare interface SaveFileContentReq {
  path: string
  content: string
}

declare interface R<T> {
  public ok: boolean
  public code: number
  public msg: string
  public data?: T
}
