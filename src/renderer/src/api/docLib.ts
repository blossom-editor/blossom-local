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
