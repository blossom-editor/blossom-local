import { protocol, net } from 'electron'
import { CurDocLibManager } from './doclib/curDocLibManager'
import { PicItem, PicNameMapping } from './doclib/picNameMapping'
import { extractFileName } from './utils'

const curDocLibManager = CurDocLibManager.getInstance()
const picNameMapping = PicNameMapping.getInstance()

// 唯一声明协议格式的位置
export const BLOSSOM_PROTOCOL = 'blossom:\\'

/**
 * 封装协议
 * @param str
 * @returns
 */
export const protocolWrapper = (str: string): string => {
  return BLOSSOM_PROTOCOL + str
}

/**
 * 由于在渲染进程无法直接读取本地文件, 需要自定义协议 blossom:\ ,并进行拦截
 * 主要用在渲染进程读取本地文件
 *
 * 不允许直接链接到文档库外的文件,
 *
 * const fileUrl = pathToFileURL(decodeURIComponent(url)).href
 * const fileUrl = pathToFileURL(url).href
 */
export const initProtocol = () => {
  console.log('2. 自定义图片协议 initProtocol')
  protocol.handle('blossom', (request): Promise<GlobalResponse> => {
    const docLibPath = curDocLibManager.getPath()
    let url = request.url.slice(BLOSSOM_PROTOCOL.length)

    const params = parseQueryParams(url)
    const picName = extractFileName(url)
    // 忽略文档库校验, 可以访问全部图片
    if (params && params['blossom_pic_ignore']) {
      return fetch(request, url)
    }

    if (docLibPath) {
      // 如果链接是绝对路径, 则直接访问图片
      if (url.startsWith(docLibPath)) {
        return fetch(request, url)
      }

      // 从图片管理中获取图片
      const pic: PicItem[] | undefined = picNameMapping.get(picName)
      if (pic === undefined || !pic[0].path.startsWith(docLibPath)) {
        return Promise.reject()
      }
      return fetch(request, pic[0].path)
    }

    return fetch(request, url)
  })
}

const fetch = (_request: Request, url: string): Promise<GlobalResponse> => {
  try {
    // traceLog(_request.url)
    // traceLog(url)
    // traceLog('===============================================================================')
    return net.fetch(url)
  } catch (error) {
    throw error
  }
}

/**
 * 解析 URL 中 ? 后面的查询参数
 * @param url - 要解析的 URL 地址
 * @returns 包含所有查询参数的对象
 */
export const parseQueryParams = (url: string): Record<string, string> | null => {
  const params: Record<string, string> = {}

  // 查找 ? 的位置
  const queryIndex = url.indexOf('?')

  // 如果没有查询参数，返回空对象
  if (queryIndex === -1) {
    return null
  }

  // 获取查询字符串部分
  const queryString = url.substring(queryIndex + 1)

  // 去除 hash 部分（如果有的话）
  const cleanQueryString = queryString.split('#')[0]

  // 如果没有查询参数，返回空对象
  if (!cleanQueryString) {
    return params
  }

  // 分割每个参数
  const pairs = cleanQueryString.split('&')

  for (const pair of pairs) {
    // 分割键值对
    const [key, value = ''] = pair.split('=')

    // 对键和值进行 URL 解码
    const decodedKey = decodeURIComponent(key)
    const decodedValue = decodeURIComponent(value)

    // 如果键不为空，添加到结果对象中
    if (decodedKey) {
      params[decodedKey] = decodedValue
    }
  }

  return params
}
