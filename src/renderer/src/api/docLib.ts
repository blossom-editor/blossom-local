import { invoke } from './ipc-wrapper'

/**
 * 检查文档库的配置文件
 */
export const checkDocLibConfig = (params?: Base): Promise<R<DocTree[]>> => {
  return invoke('check-doclib-config', params)
}

/**
 * 打开文件所在目录
 */
export const openFileLocation = (filePath: string): Promise<R<void>> => {
  return window.electronAPI.openFileLocation(filePath)
}

/**
 * 文章数和文章字数统计
 */
export const doclibStatsApi = (params?: Base): Promise<R<any>> => {
  return invoke('doclib-stats', params)
}
