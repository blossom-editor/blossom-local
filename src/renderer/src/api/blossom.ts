// @ts-nocheck
import { is } from '@electron-toolkit/utils'
import { invoke } from './ipc-wrapper'

//#region ====================================================< 文章 >=======================================================
/**
 * 查询文章详情
 */
export const articleInfoApi = (req: GetFileContentReq): Promise<R<DocInfo>> => {
  return invoke('read-doc-info', req)
}

/**
 * 修改文章正文
 */
export const saveArticleContentApi = (req: SaveFileContentReq): Promise<R<any>> => {
  return invoke('save-article-content', req)
}

/**
 * 修改文章名称
 */
export const articleUpdNameApi = (req: RenameFileReq): Promise<R<DocTree[]>> => {
  return invoke('rename-file', req)
}

/**
 * 修改文件夹名称
 */
export const folderUpdNameApi = (req: RenameFileReq): Promise<R<any>> => {
  return invoke('rename-file', req)
}

/**
 * 移动文件
 */
export const moveFileApi = (req: MoveFileReq): Promise<R<any>> => {
  return invoke('move-file', req)
}

/**
 * 新建文件夹
 */
export const createFolderApi = (req: CreateFileReq): Promise<R<CreateFileRes>> => {
  return invoke('create-folder', req)
}

/**
 * 新建文件
 */
export const createMarkdownApi = (req: CreateFileReq): Promise<R<CreateFileRes>> => {
  return invoke('create-markdown', req)
}

/**
 * 删除文件
 * @param data {id:文章ID}
 * @returns
 */
export const deleteFileApi = (req: DeleteFileReq): Promise<R<DocTree[]>> => {
  return invoke('delete-file', req)
}

//#region ====================================================< article >===================================================

/**
 * 文章列表
 */
export const articleListApi = (req?: object): Promise<R<any>> => {
  return new Promise(() => {})
}

/**
 * 文章引用关系
 */
export const articleRefListApi = (req: ArticleRefReq): Promise<R<ArticleRefRes>> => {
  return invoke('article-ref', req)
}

//#endregion
