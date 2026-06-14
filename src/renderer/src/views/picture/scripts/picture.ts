import pinia from '@renderer/stores/store-config'
import { useConfigStore } from '@renderer/stores/config'
import { getFilePrefix, getFileSuffix, getNowTime, isHttp, parseQueryParams, randomInt } from '@renderer/assets/utils/util'
import { fileBuffSave } from '@renderer/api/picture'

const { picStyle } = useConfigStore(pinia)

/**
 * 获取一个默认的图片实现
 * @returns
 */
export class DefaultPicture implements Picture {
  id = ''
  type: DocType = 'PICTURE'
  name = ''
  suffix = ''
  formatName = '' // 无后缀名称
  path = ''
  folderPath = ''
  localProtocolPath = ''
  size = 0
  icon = ''
  updn = false
  checked = false
  delTime: 0 | 1 | 2 = 0
  creTime = ''
  updTime = ''
  articleLinks = []
}

/**
 * 图片上传的回调事件
 */
export type UploadCallback = (url: string) => void

/**
 * 判断是否为图片名称增加时间后缀
 * @param name 图片名称
 * @returns
 */
export const wrapperFilename = (name: string): string => {
  if (picStyle.isAddSuffix) {
    let prefix = getFilePrefix(name)
    let suffix = getFileSuffix(name)
    return prefix + `_${getNowTime()}_${randomInt(1, 999)}.${suffix}`
  }
  return name
}

/**
 * form 表单上传图片
 * @param file 文件
 * @param pid 文件所属文件夹
 * @param callback 上传回调
 * @returns 返回文件路径
 */
export const uploadForm = (articleId: string, file: File, callback: UploadCallback) => {
  file.arrayBuffer().then((buffer) => {
    const req: FileBuffSaveReq = {
      targetDocId: articleId,
      fileBuffer: buffer,
      fileName: file.name
    }

    fileBuffSave(req).then((resp) => {
      callback(resp.data!.fileName!)
    })
  })
}

// 图片缓存
let picCache = new Date().getTime()

// 刷新图片缓存
export const picCacheRefresh = () => {
  picCache = new Date().getTime()
}

/**
 * 图片路径包装
 * 如果是 blossom 存储的图片, 会增加 picCache 参数, 用来清理缓存
 */
export const picCacheWrapper = (url: string): string => {
  const params: Record<string, string> | null = parseQueryParams(url)

  if (params) {
    return url + '&t=' + picCache
  } else {
    return url + '?t=' + picCache
  }
  // if (url.includes(userStore.sysParams.BLOSSOM_OBJECT_STORAGE_DOMAIN)) {
  //   return url + '?t=' + picCache
  // } else {
  //   return url
  // }
}

export const protocolWrapper = (path: string) => {
  if (path === null || path === undefined || path === '') {
    return ''
  }
  if (!isHttp(path)) {
    //@ts-ignore
    return window.electronAPI.constants.BLOSSOM_PROTOCOL + path
  }
  return path
}
