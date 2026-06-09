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
 * 文章数和文章字数统计
 * @param params
 * @returns
 */
export const articleWordsApi = (params?: object): Promise<R<any>> => {
  return invoke('doclib-stats-words')
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
 * 通用文件选择框, 用于选择图片等
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
 * <p>注意: 返回的正文信息永远是草稿正文, 公开版本的正文信息需要通过公开文章查询 {@link articleOpenApi}
 * @returns
 */
export const articleInfoApi = (params: GetFileContentReq): Promise<R<DocInfo>> => {
  // return window.electronAPI.articleInfoApi(params)
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
 * 新增文章正文
 * @param data { pid: 0, name: "", icon: "", tags: "", sort: 0, cover: "", describes: ""}
 * @returns
 */
export const articleAddApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/add', data)
}

/**
 * 修改文章正文
 * @param data { id: 0, pid: 0, name: "", icon: "", tags: "", sort: 0, cover: "", describes: ""}
 * @returns
 */
export const articleUpdApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/upd', data)
}

/**
 * 快捷增加标签
 * @param data {
 *  id: curDoc.value?.id,
 *  tag: string
 * }
 * @returns
 */
export const articleUpdTagApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/upd/tag', data)
}

/**
 * star 或取消 star
 * @param data
 * @returns
 */
export const articleStarApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/star', data)
}

/**
 * star 或取消 star
 * @param data
 * @returns
 */
export const folderStarApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/folder/star', data)
}

/**
 * 下载文章 markdown
 * @param params
 * @returns
 */
export const articleDownloadApi = (params?: object): Promise<any> => {
  let config = { params: params, responseType: 'blob' }
  return rq.get('/article/download', config)
}

/**
 * 下载文章 html
 * @param params
 * @returns
 */
export const articleDownloadHtmlApi = (params?: object): Promise<any> => {
  let config = { params: params, responseType: 'blob' }
  return rq.get('/article/download/html', config)
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

/**
 * 文章公开或取消公开
 * @param data
 * @returns
 */
export const articleOpenApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/open', data)
}

/**
 * 文章公开或取消公开
 * @param data
 * @returns
 */
export const articleOpenBatchApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/open/batch', data)
}

/**
 * 文章同步
 * @param data
 * @returns
 */
export const articleSyncApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/article/open/sync', data)
}

/**
 * 生成文章的二维码
 * @param params
 * @returns
 */
export const articleQrCodeApi = (params?: object): Promise<any> => {
  let config = { params: params, responseType: 'blob' }
  return rq.get('/article/open/qrcode', config)
}

/**
 * 文章导入
 */
export const articleImportApiUrl = '/article/import'

/**
 * 文章历史记录
 * @param params { articleId: articleId }
 * @returns
 */
export const articleLogsApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/article/log', { params })
}

/**
 * 历史记录的 markdown 的正文信息
 * @param params
 * @returns
 */
export const articleLogContentApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/article/log/content', { params })
}

/**
 * 文章全量备份
 * @param params
 * @returns
 */
export const articleBackupApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/article/backup', { params })
}

/**
 * 备份列表
 * @param params
 * @returns
 */
export interface BackupFile {
  date: string
  time: string
  filename: string
  fileLength: number
  desc?: string
}
export const articleBackupListApi = (): Promise<R<BackupFile[]>> => {
  return rq.get<BackupFile[]>('/article/backup/list')
}

/**
 * 获取下载文件信息
 * @param data
 * @returns
 */
export const articleBackupDownloadFragmentHeadApi = (params: object): Promise<any> => {
  let config = { params: params, responseType: 'blob' }
  return rq.head('/article/backup/download/fragment', config)
}
/**
 * 分片下载备份文件
 * @param params
 * @returns
 */
export const articleBackupDownloadFragmentApi = (data: object, range: string): Promise<any> => {
  let config: AxiosRequestConfig = { responseType: 'blob', headers: { Range: range } }
  return rq.post('/article/backup/download/fragment', data, config)
}

/**
 * 获取临时访问链接的 key
 * @param params {id:id}
 * @returns
 */
export const articleTempKey = (params?: object): Promise<any> => {
  return rq.get('/article/temp/key', { params })
}

/**
 * 文章临时访问链接
 */
export const articleTempH = '/article/temp/h?k='

/**
 * 文章回收站列表
 * @returns
 */
export const articleRecycleListApi = (): Promise<any> => {
  return rq.get('/article/recycle/list')
}

/**
 * 文章回收站列表
 * @returns
 */
export const articleRecycleRestoreApi = (data?: object): Promise<any> => {
  return rq.post('/article/recycle/restore', data)
}

export const articleRecycleDownloadApi = (params?: object): Promise<any> => {
  let config = { params: params, responseType: 'blob' }
  return rq.get('/article/recycle/download', config)
}

/**
 * 文章全文搜索
 */
export const articleSearchApi = (params?: object): Promise<any> => {
  return rq.get('/search', { params })
}
//#endregion

//#region ====================================================< folder >====================================================

/**
 * 查询文件夹详情
 * @param params
 * @returns
 */
export const folderInfoApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/folder/info', { params })
}

/**
 * 新增文件夹
 * @param data
 * @returns
 */
export const folderAddApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/folder/add', data)
}

/**
 * 修改文件夹
 * @param data
 * @returns
 */
export const folderUpdApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/folder/upd', data)
}

/**
 * 快捷增加标签
 * @param data
 * @returns
 */
export const folderUpdTagApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/folder/upd/tag', data)
}

/**
 * 公开文件夹
 * @param data
 * @returns
 */
export const folderOpenApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/folder/open', data)
}

/**
 * 查看专题文章
 * @param params
 * @returns
 */
export const subjectsApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/folder/subjects', { params })
}

//#endregion

//#region ====================================================< picture >===================================================

/**
 * 图片分页
 * @param params
 * @returns
 */
export const picturePageApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/picture/page', { params })
}

/**
 * 图片详情
 * @param params
 * @returns
 */
export const pictureInfoApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/picture/info', { params })
}

/**
 * 星标图片
 * @param params {id:id}
 * @returns
 */
export const pictureStarApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/picture/star', data)
}

/**
 * 删除图片
 * @param params {id:id}
 * @returns
 */
export const pictureDelApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/picture/del', data)
}

/**
 * 批量删除图片
 * @param params {ids:id}
 * @returns
 */
export type PictureDelBatchRes = { success: number; fault: number; inuse: number; successIds: Array<string> }
export const pictureDelBatchApi = (data?: object): Promise<R<PictureDelBatchRes>> => {
  return rq.post<PictureDelBatchRes>('/picture/del/batch', data)
}

/**
 * 删除图片
 * @param params {id:id}
 * @returns
 */
export const pictureStatApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/picture/stat', { params })
}

/**
 * 删除图片
 * @param params {id:id}
 * @returns
 */
export const pictureStatUserApi = (params?: object): Promise<R<any>> => {
  return rq.get<R<any>>('/picture/stat/user', { params })
}

/**
 * 转移文件
 * @param data
 * @returns
 */
export const pictureTransferApi = (data?: object): Promise<R<any>> => {
  return rq.post<R<any>>('/picture/transfer', data)
}
//#endregion

//#region ====================================================< sys >=======================================================

/**
 * 获取系统参数列表
 * @returns
 */
export const paramListApi = (): Promise<R<any>> => {
  return rq.get<R<any>>('/sys/param/list', {})
}

/**
 * 修改系统参数
 * @returns
 */
export const paramUpdApi = (data: object): Promise<R<any>> => {
  return rq.post<R<any>>('/sys/param/upd', data)
}

/**
 * 刷新系统参数缓存
 * @param data 文件 form
 * @returns
 */
export const paramRefreshApi = (): Promise<R<any>> => {
  return rq.post<R<any>>('/sys/param/refresh', {})
}

// 用户参数

/**
 * 获取用户参数列表
 * @returns
 */
export const userParamListApi = (): Promise<R<any>> => {
  return rq.get<R<any>>('/user/param/list', {})
}

/**
 * 修改用户参数
 * @returns
 */
export const userParamUpdApi = (data: object): Promise<R<any>> => {
  return rq.post<R<any>>('/user/param/upd', data)
}

/**
 * 管理员修改用户参数
 * @returns
 */
export const userParamUpdAdminApi = (data: object): Promise<R<any>> => {
  return rq.post<R<any>>('/user/param/upd/admin', data)
}

/**
 * 刷新系统参数缓存
 * @param data 文件 form
 * @returns
 */
export const userParamRefreshApi = (): Promise<R<any>> => {
  return rq.post<R<any>>('/user/param/refresh', {})
}

/**
 * 上传文件
 * @param data 文件 form
 * @returns
 */
export const uploadFileApiUrl = '/picture/file/upload'
export const uploadFileApi = (data?: object): Promise<R<any>> => {
  let config: object = { contentType: 'multipart/form-data;' }
  return rq.post<R<any>>(uploadFileApiUrl, data, config)
}

//#endregion
