// @ts-nocheck
import { is } from '@electron-toolkit/utils'
import { defaultRequest as rq } from './request'
import { AxiosRequestConfig } from 'axios'
import { invoke } from './ipc-wrapper'

//#region ====================================================< doclib >=======================================================

/**
 * 打开文档库选择框, 此时未选择文档库, 不使用拦截器填充 docLibPath
 */
export const selectDocLibFolderDialog = (): Promise<R<DocLibItem>> => {
  return window.electronAPI.selectDocLibFolderDialog()
}

/**
 * 文章字数折线图
 * @param params
 * @returns
 */
export const articleWordLineApi = (params?: object): Promise<R<any>> => {
  return invoke('doclib-stats-words-chatline')
}

/**
 * 文章编辑热力图
 * @param params
 * @returns
 */
export const articleHeatmapApi = (params?: object): Promise<R<any>> => {
  return invoke('doclib-stats-words-chatheatmap')
}

/**
 * 通用文件选择框
 * 通常会默认填充 docLibPath, 但设置文档库的图标时, 需要手动添加文档库路径
 */
export const selectFileAndMoveDialog = (params: SelectFileAndMoveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('select-file-and-move-dialog', params)
}

/**
 * 获取文档树
 */
export const docTreeApi = (req: DocTreeReq): Promise<R<DocTree[]>> => {
  return invoke('read-doc-tree', req)
}

//#endregion

//#region ====================================================< 文章 >=======================================================
/**
 * 查询文章详情, 如果文章为公开文章, 则会返回对应的公开信息, 如 openVersion, openTime 等
 * <p>注意: 返回的正文信息永远是草稿正文, 公开版本的正文信息需要通过公开文章查询
 * @returns
 */
export const articleInfoApi = (params: GetFileContentReq): Promise<R<DocInfo>> => {
  return invoke('read-doc-info', params)
}

/**
 * 修改文章正文
 * @returns
 */
export const saveArticleContentApi = (params: SaveFileContentReq): Promise<R<any>> => {
  return invoke('save-article-content', params)
}

/**
 * 修改文章名称
 */
export const articleUpdNameApi = (params: RenameFileReq): Promise<R<any>> => {
  return invoke('rename-file', params)
}

/**
 * 修改文件夹名称
 */
export const folderUpdNameApi = (params: RenameFileReq): Promise<R<any>> => {
  return invoke('rename-file', params)
}

/**
 * 移动文件
 */
export const moveFileApi = (params: MoveFileReq): Promise<R<any>> => {
  return invoke('move-file', params)
}

/**
 * 新建文件夹
 */
export const createFolderApi = (params: CreateFileReq): Promise<R<CreateFileRes>> => {
  return invoke('create-folder', params)
}

/**
 * 新建文件
 */
export const createMarkdownApi = (params: CreateFileReq): Promise<R<CreateFileRes>> => {
  return invoke('create-markdown', params)
}

/**
 * 删除文件
 * @param data {id:文章ID}
 * @returns
 */
export const deleteFileApi = (params: DeleteFileReq): Promise<R<DocTree[]>> => {
  return invoke('delete-file', params)
}

//#region ====================================================< article >===================================================

/**
 * 文章列表
 * @param params {
 *  starStatus: 0/1
 *  openStatus: 0/1
 * }
 * @returns
 */
export const articleListApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/article/list', { params })
}

/**
 * 指定用户的文章数和文章字数统计
 * @param params
 * @returns
 */
export const articleWordsUserApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/article/stat/words/user', { params })
}

/**
 * 文章数和文章字数统计
 * @param params
 * @returns
 */
export const articleWordsListApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/article/stat/words/list', { params })
}

/**
 * 保存字数统计信息
 */
export const articleWordsSaveApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/stat/words/save', data)
}

/**
 * 文章引用关系
 * @param params
 * @returns
 */
export const articleRefListApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/article/ref/list', { params })
}

//#endregion

//#region ====================================================< folder >====================================================

/**
 * 查看专题文章
 * @param params
 * @returns
 */
export const subjectsApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/folder/subjects', { params })
}

//#endregion

//#region ====================================================< sys >=======================================================

/**
 * 管理员修改用户参数
 * @returns
 */
export const userParamUpdAdminApi = (data: object): Promise<R<any>> => {
  return rq.post<R<any>>('/user/param/upd/admin', data)
}

//#endregion
