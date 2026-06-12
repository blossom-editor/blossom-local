import pinia from '@renderer/stores/store-config'
import { useConfigStore } from '@renderer/stores/config'
import type { UploadProps, UploadRawFile } from 'element-plus'
import { isBlank, isNotBlank, isNull } from '@renderer/assets/utils/obj'
import Notify from '@renderer/scripts/notify'
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
      callback(resp.data!.filePath!)
    })
  })
}

/**
 * uoload 组件的 data 数据获取
 * @param rawFile
 * @param pid
 * @returns
 */
export const uploadDate = (rawFile: UploadRawFile, pid: string, repeatUpload: boolean = false) => {
  return {
    pid: pid,
    filename: wrapperFilename(rawFile.name),
    repeatUpload: repeatUpload
  }
}

/**
 *
 * @param rawFile
 * @returns
 */
export const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
  return true
}

/**
 *
 * @param resp
 * @param _file
 */
export const onUploadSeccess: UploadProps['onSuccess'] = (resp, _file?) => {
  handleUploadSeccess(resp)
}

/**
 * 上传文件结果处理, 失败是根据
 * @param resp 接口响应
 * @returns 是否成功
 */
export const handleUploadSeccess = (resp: any): boolean => {
  if (resp.code === '20000') {
    Notify.success('上传成功')
    return true
  } else {
    Notify.error(resp.msg, '上传失败')
    return false
  }
}

/**
 *
 * @param error
 * @param _file
 * @param _files
 */
export const onError: UploadProps['onError'] = (error, _file, _files) => {
  handleUploadError(error)
}

/**
 *
 * @param error
 */
export const handleUploadError = (error: Error) => {
  if (error.message != undefined) {
    if (error.message.indexOf('fail to post') > -1 && error.message.indexOf('/picture/file/upload 0') > -1) {
      Notify.error('可能是由于您上传的文件过大, 请检查服务端上传大小限制。', '上传失败')
    } else {
      try {
        let resp = JSON.parse(error.message)
        if (resp != undefined) {
          Notify.error(resp.msg, '上传失败')
        }
      } catch (e) {
        Notify.error(error.message, '上传失败')
      }
    }
  }
}

//#region 图片缓存控制

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
  if (!isHttp(path)) {
    return 'blossom:\\' + path
  }
  return path
}
