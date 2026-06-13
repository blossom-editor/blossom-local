import { BigIntStats } from 'fs'

/**
 * 校验是否是一个合法的名称
 */
export const validateFileName = (str: string): boolean => {
  const regex = /[<>\/\\:*?"|.]/
  return regex.test(str)
}

/**
 * 获取文件的唯一标识符
 * win 系统是卷ID + 文件ID, 文件移到其他卷时两个ID都会变化
 *
 * @param fileStats - 文件的 stat 对象
 * @returns 文件的唯一标识符
 */
export const getUniqueId = (fileStats: BigIntStats) => {
  return fileStats.dev.toString() + '-' + fileStats.ino.toString()
}

export const cutSuffix = (filename: string): string => {
  return filename.replace(/\.[^.]+$/, '')
}

/**
 * 从本地路径或网络地址中提取文件名（包含扩展名）
 * @param pathOrUrl - 待解析的字符串，支持：
 *   - Windows 路径（如 F:\folder\file.jpg）
 *   - Unix 路径（如 /home/user/file.png）
 *   - 相对路径（如 ./file.txt、../file.gif）
 *   - URL（如 https://example.com/img/photo.jpg?t=123）
 * @returns 文件名，如果没有有效文件名则返回空字符串
 */
export const extractFileName = (pathOrUrl: string): string => {
  if (!pathOrUrl) return ''

  // 1. 将反斜杠统一替换为正斜杠，便于处理
  let normalized = pathOrUrl.replace(/\\/g, '/')

  // 2. 找到最后一个斜杠的位置，提取后面的部分
  const lastSlashIndex = normalized.lastIndexOf('/')
  let fileName = lastSlashIndex !== -1 ? normalized.substring(lastSlashIndex + 1) : normalized

  // 3. 去掉 URL 中的查询参数（?...）和锚点（#...）
  const queryIndex = fileName.indexOf('?')
  if (queryIndex !== -1) {
    fileName = fileName.substring(0, queryIndex)
  }
  const hashIndex = fileName.indexOf('#')
  if (hashIndex !== -1) {
    fileName = fileName.substring(0, hashIndex)
  }

  return fileName
}

/**
 * 去除图片的 ![]() 标记, 以符合 markdown 语法规范
 */
export const normalizeMarkdownImage = (text: string) => {
  return text
    .replace(/\s/g, '_') // 任何空白字符 -> _
    .replace(/[!\[\]()]/g, '') // 删除 ! [ ] ( )
}

export const imagesSuffix: string[] = ['jpeg', 'jpg', 'gif', 'png', 'apng', 'bmp', 'pic', 'svg', 'tif', 'tiff', 'webp', 'jfif', 'ico']
export const images: string[] = ['.jpeg', '.jpg', '.gif', '.png', '.apng', '.bmp', '.pic', '.svg', '.tif', '.tiff', '.webp', '.jfif', '.ico']

/**
 * 检查是否为图片
 * @param name
 * @returns
 */
export const isImage = (name: string): boolean => {
  let result = false
  if (name === undefined || name === null || name === '' || name === ' ' || name.length === 0) {
    return result
  }
  for (let index = 0; index < images.length; index++) {
    const img = images[index]
    if (name.toLocaleLowerCase().endsWith(img)) {
      result = true
      break
    }
  }
  return result
}

export const traceLog = (msg: any) => {
  console.log(`\x1b[36m${msg}\x1b[0m`)
}
export const infoLog = (msg: any) => {
  console.log(`${msg}`)
}

export const succLog = (msg: any) => {
  console.log(`\x1b[32m${msg}\x1b[0m`)
}
export const errorLog = (msg: any) => {
  console.log(`\x1b[31m${msg}\x1b[0m`)
}
export const warnLog = (msg: any) => {
  console.log(`\x1b[33m${msg}\x1b[0m`)
}

