import { invoke } from './ipc-wrapper'

/**
 * 打开文档库选择框, 此时未选择文档库, 不使用拦截器填充 docLibPath
 */
export const selectDocLibFolderDialog = (): Promise<R<DocLibItem>> => {
  //@ts-ignore
  return window.electronAPI.selectDocLibFolderDialog()
}

/**
 * 通用文件选择框
 * 通常会默认填充 docLibPath, 但设置文档库的图标时, 需要手动添加文档库路径
 */
export const selectFileAndMoveDialog = (req: SelectFileAndMoveReq): Promise<R<SelectFileAndMoveRes>> => {
  return invoke('select-file-and-move-dialog', req)
}

/**
 * 打开文件所在目录
 */
export const openFileLocation = (filePath: string): Promise<R<void>> => {
  //@ts-ignore
  return window.electronAPI.openFileLocation(filePath)
}

/**
 * 检查文档库的配置文件
 */
export const checkDocLibConfig = (req?: Base): Promise<R<DocTree[]>> => {
  return invoke('check-doclib-config', req)
}

/**
 * 文章数和文章字数统计
 */
export const doclibStatsApi = (req?: Base): Promise<R<any>> => {
  return invoke('doclib-stats', req)
}
/**
 * 获取文档树
 */
export const docTreeApi = (req: DocTreeReq): Promise<R<DocTree[]>> => {
  return invoke('read-doc-tree', req)
}

//#region 统计

/**
 * 文章字数折线图
 * @param req
 * @returns
 */
export const articleWordLineApi = (req?: object): Promise<R<any>> => {
  return invoke('doclib-stats-words-chatline')
}

/**
 * 文章编辑热力图
 * @param req
 * @returns
 */
export const articleHeatmapApi = (req?: object): Promise<R<any>> => {
  return invoke('doclib-stats-words-chatheatmap')
}

//#endregion
