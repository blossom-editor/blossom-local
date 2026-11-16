import { invoke } from './ipc-wrapper'

/**
 * 读取网页收藏的配置文件
 * 文件位于 <docLibPath>/.blossom/web-collect/web-collect.json
 */
export const webCollectReadApi = (): Promise<R<WebCollectRes>> => {
  return invoke('web-collect-read', {})
}

/**
 * 保存网页收藏的配置文件, 主进程会先校验 JSON 格式
 */
export const webCollectSaveApi = (content: string): Promise<R<WebCollectRes>> => {
  return invoke('web-collect-save', { content })
}

/**
 * 在文件管理器中打开配置文件所在目录
 */
export const webCollectOpenFolderApi = (): Promise<R<string>> => {
  return invoke('web-collect-open-folder', {})
}

/**
 * 打开本地应用
 * 交给系统外壳打开, 单实例应用会自己跳到前台
 * @param appPath 应用的可执行文件路径
 */
export const webCollectOpenAppApi = (appPath: string): Promise<R<string>> => {
  return invoke('web-collect-open-app', { appPath })
}
