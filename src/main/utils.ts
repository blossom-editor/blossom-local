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

/**
 * 去除文件的后缀, 只获取文件名
 * @param filename 文件名
 * @returns
 */
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
 * 推翻链接地址
 * 将所有反斜杠替换成正斜杠
 *
 * @param url 链接
 */
export const normalizeUrlToForwardSlash = (url: string) => {
  return url.replace(/\\/g, '/')
}

/**
 * 规范图片链接
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

const BASE = 36
const MAX_COUNTER = Math.pow(BASE, 3) - 1 // 后3位给计数器，最多 46655 个/毫秒

let lastTimestamp = -1
let counter = 0

/**
 * 生成一个 6 位字母数字唯一 ID
 * 保证在同一毫秒内调用多次，每次返回不同值
 */
export function generateUniqueId(): string {
  const now = Date.now()

  // 若时间戳变化，重置计数器
  if (now !== lastTimestamp) {
    lastTimestamp = now
    counter = 0
  } else {
    counter++
    // 极端情况：同一毫秒内超过计数器上限，则等待下一毫秒（避免溢出）
    if (counter > MAX_COUNTER) {
      // 主动等待直到时间戳变化（极少发生）
      while (Date.now() === now) {
        // 空循环，或使用 setTimeout 但会阻塞，这里用简单忙等（适合低频场景）
      }
      // 递归调用，使用新时间戳
      return generateUniqueId()
    }
  }

  // 取时间戳的后3位（0~999）作为时间部分，编码为 base36（最多2位）
  const timePart = (now % 1000).toString(BASE).toUpperCase()
  // 计数器编码为 base36，补零到3位
  const counterPart = counter.toString(BASE).toUpperCase().padStart(3, '0')
  // 组合：时间部分（左补零至2位）+ 计数器部分（3位），总长5位？不够，我们调整为：取时间部分左补零至3位，计数器部分左补零至3位，总共6位
  // 但时间部分最多999 -> 36进制是 "RR"（2位），所以补零到3位，计数器也补零到3位，总长6位
  const fullTime = timePart.padStart(3, '0')
  const fullCounter = counterPart.padStart(3, '0')
  return fullTime + fullCounter
}

/**
 * 是否 http/https 协议开头的 url
 * @param url
 * @returns
 */
export const isHttp = (url: string | null | undefined) => {
  if (url === undefined || url == null) {
    return false
  }
  return url.startsWith('http://') || url.startsWith('https://')
}

export function createDefaultBigIntStats() {
  const ZERO = 0n // 所有数值属性用 bigint 的 0
  const DEFAULT_DATE = new Date(0) // 时间属性的默认值（1970-01-01）

  return {
    // ---- 所有属性均为 bigint 类型 ----
    dev: ZERO,
    ino: ZERO,
    mode: ZERO,
    nlink: ZERO,
    uid: ZERO,
    gid: ZERO,
    rdev: ZERO,
    size: ZERO,
    blksize: ZERO,
    blocks: ZERO,
    atimeMs: ZERO,
    mtimeMs: ZERO,
    ctimeMs: ZERO,
    birthtimeMs: ZERO,
    atime: DEFAULT_DATE,
    mtime: DEFAULT_DATE,
    ctime: DEFAULT_DATE,
    birthtime: DEFAULT_DATE,
    atimeNs: 0n,
    mtimeNs: 0n,
    ctimeNs: 0n,
    birthtimeNs: 0n,

    // ---- 必须实现的方法（根据业务需求返回布尔值） ----
    isFile: () => false,
    isDirectory: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false
  }
}

//#region 染色日志

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

//#endregion
