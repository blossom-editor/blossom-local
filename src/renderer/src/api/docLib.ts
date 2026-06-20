import { invoke } from './ipc-wrapper'

//@region 未选择文档库时的请求
/**
 * 打开文件所在目录
 */
export const openFileLocation = (filePath: string): Promise<R<void>> => {
  //@ts-ignore
  return window.electronAPI.openFileLocation(filePath)
}

/**
 * 打开文档库选择框, 此时未选择文档库, 不使用拦截器填充 docLibPath
 */
export const selectDocLibFolderDialogApi = (): Promise<R<DocLibItem>> => {
  //@ts-ignore
  return window.electronAPI.selectDocLibFolderDialog()
}
/**
 * 检查文档库的配置文件
 */
export const checkDocLibConfigApi = (req: Base): Promise<R<void>> => {
  //@ts-ignore
  return window.electronAPI.checkDocLibConfig(req)
}

/**
 * 选择文档库的图标
 */
export const selectDocLibIconDialogApi = (req: SelectDocLibIconReq): Promise<R<SelectFileAndMoveRes>> => {
  //@ts-ignore
  return window.electronAPI.selectDocLibIconDialog(req)
}

//#endregion

/**
 * 获取文档树
 */
export const docTreeApi = (req: DocTreeReq): Promise<R<DocTree[]>> => {
  return invoke('read-doc-tree', req)
}

//#region 统计

/**
 * 文章数和文章字数统计
 */
export const doclibStatsApi = (req?: Base): Promise<R<any>> => {
  return invoke('doclib-stats', req)
}

/**
 * 文章字数折线图
 * @param req
 * @returns
 */
export const articleWordLineApi = (_req?: object): Promise<R<any>> => {
  return invoke('doclib-stats-words-chatline')
}

/**
 * 文章编辑热力图
 * @param req
 * @returns
 */
export const articleHeatmapApi = (_req?: object): Promise<R<any>> => {
  return invoke('doclib-stats-words-chatheatmap')
}

//#endregion
