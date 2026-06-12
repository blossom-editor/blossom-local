import { protocol, net } from 'electron'
import path from 'path'

import { CurDocLibManager } from './doclib/curDocLibManager'
const curDocLibManager = CurDocLibManager.getInstance()

/**
 * 由于在渲染进程无法直接读取本地文件, 需要自定义协议 blossom:\ ,并进行拦截
 * 主要用在渲染进程读取本地文件
 *
 * 不允许直接链接到文档库外的文件,
 *
 * const fileUrl = pathToFileURL(decodeURIComponent(url)).href
 * const fileUrl = pathToFileURL(url).href
 * console.log('fileUrl', fileUrl)
 */
export const initProtocol = () => {
  console.log('2. 自定义图片协议 initProtocol')
  protocol.handle('blossom', (request) => {
    const docLibPath = curDocLibManager.getPath()
    let url = request.url.slice('blossom:\\'.length)
    const params = parseQueryParams(url)
    // if (params) {
    //   console.log(`${url}, params: ${Object.entries(params)}`)
    // }

    if (docLibPath) {
      // 非相对路径, 并且路径不以文档库路径开头, 则认为是相对文档库的绝对路径
      if (!url.startsWith('./') || !url.startsWith('../')) {
        if (!url.startsWith(docLibPath)) {
          url = path.join(docLibPath, url)
        }
      }
      // 相对路径, 需向上遍历路径, 但不能获取文档库外的路径
      else {
        if (params) {
          const articleId = params['blossom_article_id']
        }
      }
    }

    try {
      console.log(`${request.url}`)
      console.log(url)
      console.log('============================================================================')
      return net.fetch(url)
    } catch (error) {
      console.log('error', error)
      throw error
    }
  })
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
