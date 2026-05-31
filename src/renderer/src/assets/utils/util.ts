import { isBlank, isNull } from './obj'

/**
 * 跳转新开页面
 * @param url 地址
 */
export const toView = (url: string): void => {
  window.open(url)
}

/**
 * 获取当前时间的 yyyyMMdd_HHmmss
 * @returns
 */
export const getNowTime = (): string => {
  const now = new Date()
  let y = now.getFullYear()
  let m = formatNum(now.getMonth() + 1)
  let d = formatNum(now.getDate())
  let h = formatNum(now.getHours())
  let min = formatNum(now.getMinutes())
  let s = formatNum(now.getSeconds())
  return `${y}${m}${d}_${h}${min}${s}`
}

/**
 * 将毫秒转为时分秒的格式
 * @param time 毫秒
 * @returns
 */
export const formateMs = (ms: number): string => {
  let time = ms / 1000
  let hour: number | string = Math.floor(time / 60 / 60)
  hour = hour.toString().padStart(2, '0')
  let minute: number | string = Math.floor(time / 60) % 60
  minute = minute.toString().padStart(2, '0')
  let second: number | string = Math.floor(time) % 60
  second = second.toString().padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

/**
 * 获取当前时间的 yyyy-MM-dd
 * @returns {string}
 */
export const getDateFormat = (): string => {
  const now = new Date()
  let y = now.getFullYear()
  let m = formatNum(now.getMonth() + 1)
  let d = formatNum(now.getDate())
  return '' + y + '-' + m + '-' + d
}

/**
 * 获取当前时间的 yyyy-MM-dd HH:mm:ss
 * @returns {string}
 */
export const getDateTimeFormat = (): string => {
  const now = new Date()
  let y = now.getFullYear()
  let m = formatNum(now.getMonth() + 1)
  let d = formatNum(now.getDate())
  let h = formatNum(now.getHours())
  let min = formatNum(now.getMinutes())
  let s = formatNum(now.getSeconds())
  return '' + y + '-' + m + '-' + d + ' ' + h + ':' + min + ':' + s
}

/**
 * 获取下一天
 * @param date
 * @param next
 * @param format
 * @returns
 */
export const getNextDay = (date: string, next: number = 1, format = '{y}-{m}-{d}'): string => {
  if (!date) {
    return '日期错误'
  }
  date = date.match(/\d+/g)!.join('-') // 格式为2022年09月19日处理
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + next)

  const formatObj = {
    y: nextDay.getFullYear(),
    m: nextDay.getMonth() + 1,
    d: nextDay.getDate()
  }
  return format.replace(/{([ymd])+}/g, (_result, key) => {
    const value = formatObj[key]
    return value.toString().padStart(2, '0')
  })
}

export const getDateZh = (): string => {
  const now = new Date()
  let y = now.getFullYear()
  let m = formatNum(now.getMonth() + 1)
  let d = formatNum(now.getDate())
  return `${y}年${m}月${d}日`
}

/**
 * 获取当前处于何时
 */
export const nowWhen = (): string => {
  let nowTime: number = new Date().getHours()
  if (0 <= nowTime && nowTime < 7) {
    return 'Dawning'
  }
  if (7 <= nowTime && nowTime < 12) {
    return 'Morning'
  }
  if (12 <= nowTime && nowTime < 19) {
    return 'Afternoon'
  }
  if (19 <= nowTime && nowTime < 24) {
    return 'Evening'
  }
  return 'Night'
}

/**
 * 将 秒级时间戳 转为 yyyy-MM-dd HH:mm:ss
 * @param seconds 秒级时间戳
 */
export const secondsToDatetime = (seconds: number | string | Date): string => {
  const now = new Date(Number(seconds) * 1000)
  let y = now.getFullYear()
  let m = formatNum(now.getMonth() + 1)
  let d = formatNum(now.getDate())
  let h = formatNum(now.getHours())
  let min = formatNum(now.getMinutes())
  let s = formatNum(now.getSeconds())
  return '' + y + '-' + m + '-' + d + ' ' + h + ':' + min + ':' + s
}

/**
 * 将 毫秒时间戳 转为 yyyy-MM-dd HH:mm:ss.sss
 * @param timestamp 毫秒时间戳
 */
export const timestampToDatetime = (timestamp: number | string | Date): string => {
  const now = new Date(timestamp)
  let y = now.getFullYear()
  let m = formatNum(now.getMonth() + 1)
  let d = formatNum(now.getDate())
  let h = formatNum(now.getHours())
  let min = formatNum(now.getMinutes())
  let s = formatNum(now.getSeconds())
  let SSS = formatNum(now.getMilliseconds())
  return '' + y + '-' + m + '-' + d + ' ' + h + ':' + min + ':' + s + '.' + SSS
}

/**
 * 两个日期相差的天数
 *
 * @param date1 yyyy-MM-dd
 * @param date2 yyyy-MM-dd
 * @returns 相差的天数
 */
export const betweenDay = (date1: string, date2: string): number => {
  let diffDay: number, diffMs: number
  var d1 = Date.parse(date1)
  var d2 = Date.parse(date2)
  // 将两个日期都转换为毫秒格式，取相差毫秒数的绝对值
  diffMs = Math.abs(d1 - d2)
  // 向下取整
  diffDay = Math.floor(diffMs / (1000 * 3600 * 24))
  return diffDay
}

const formatNum = (num: number) => {
  if (num < 10) {
    return '0' + num
  }
  return num
}

/**
 * 格式化JSON字符串
 * @param msg
 * @param customRetract 缩进
 * @returns {string}
 */
export const formatJson = (msg: string, customRetract?: string): string => {
  // 格式化缩进为2个空格
  const retract = isNull(customRetract) ? '  ' : customRetract
  let rep = '~'
  let jsonStr = JSON.stringify(msg, null, rep)
  let str = ''
  for (let i = 0; i < jsonStr.length; i++) {
    let text2 = jsonStr.charAt(i)
    if (i > 1) {
      let text = jsonStr.charAt(i - 1)
      if (rep !== text && rep === text2) {
        // str += '\n'
      }
    }
    str += text2
  }
  jsonStr = ''
  for (let i = 0; i < str.length; i++) {
    let text = str.charAt(i)
    if (rep === text) {
      jsonStr += retract
    } else {
      jsonStr += text
    }
    if (i === str.length - 2) {
      jsonStr += '\n'
    }
  }
  return jsonStr
}

/**
 * 格式化文件大小
 * @param size
 * @returns
 */
export const formatFileSize = (size: number): string => {
  if (!size) return '0MB'

  var num = 1024.0 //byte

  if (size < num) return size + 'B'
  if (size < Math.pow(num, 2)) return (size / num).toFixed(2) + 'KB' //kb
  if (size < Math.pow(num, 3)) return (size / Math.pow(num, 2)).toFixed(2) + 'MB' //M
  if (size < Math.pow(num, 4)) return (size / Math.pow(num, 3)).toFixed(2) + 'G' //G
  return (size / Math.pow(num, 4)).toFixed(2) + 'T' //T
}

/**
 * 将数字转为千分位的字符串
 * @param param
 * @returns 返回字符串
 */
export const formartNumber = (param: number | undefined): string => {
  if (param === undefined) {
    return '0'
  }
  let num: string = (param || 0).toString()
  let result: string = ''
  let isNegative = param < 0
  if (isNegative) {
    num = num.substring(1)
  }
  while (num.length > 3) {
    result = ',' + num.slice(-3) + result
    num = num.slice(0, num.length - 3)
  }
  if (num) {
    result = num + result
  }
  if (isNegative) {
    return '-' + result
  }
  return result
}

export const randomBoolean = (): boolean => {
  return Math.random() >= 0.5
}

/**
 * 随机整数范围 min <= return < max
 * @param min
 * @param max
 * @returns
 */
export const randomInt = (min: number, max: number): number => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

/**
 * html 反转义
 * @param str
 * @returns
 */
export const escape2Html = (str: string): string => {
  // 1.首先动态创建一个容器标签元素
  let temp = document.createElement('div')
  // 2.然后将要转换的字符串设置为这个元素的innerHTML(ie，火狐，google都支持)
  temp.innerHTML = str
  // 3.最后返回这个元素的innerText或者textContent，即得到经过HTML解码的字符串了。
  let output = temp.innerText || temp.textContent
  if (output == null) {
    return ''
  }
  return output
}

/**
 * 休眠, 注意外部使用 await
 * @param millis 休眠时长, 毫秒
 * @returns
 */
export const sleep = (millis: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, millis)
  })
}

/**
 * 判断系统类型
 * @returns
 */
export const platform = (): 'windows' | 'darwin' => {
  var agent = navigator.userAgent.toLowerCase()
  if (agent.indexOf('win32') >= 0 || agent.indexOf('wow32') >= 0) {
    return 'windows'
  }
  if (agent.indexOf('win64') >= 0 || agent.indexOf('wow64') >= 0) {
    return 'windows'
  }
  if (/macintosh|mac os x/i.test(navigator.userAgent)) {
    return 'darwin'
  }
  return 'windows'
}

export const isWindows = () => {
  return platform() === 'windows'
}

export const isMacOS = () => {
  return platform() === 'darwin'
}

/**
 * 根据不同平台显示不同的信息
 * @returns
 */
export const platformText = (win: string, mac: string) => {
  if (isWindows()) {
    return win
  }
  if (isMacOS()) {
    return mac
  }
  return win
}

/**
 * 判断是否 electron
 * https://github.com/cheton/is-electron/tree/master
 * @returns true / false
 */
export const isElectron = () => {
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
    return true
  }

  // Main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true
  }

  // Detect the user agent when the `nodeIntegration` option is set to false
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true
  }

  return false
}

/**
 * 根据当前操作系统，将路径片段拼接为平台本地路径格式
 * @param segments 路径片段，例如 'usr', 'local', 'bin'
 * @returns 拼接后的路径字符串
 */
export function joinPath(...segments: string[]): string {
  // 1. 确定分隔符
  let separator: string
  if (isWindows()) {
    separator = '\\'
  } else if (isMacOS()) {
    separator = '/'
  } else {
    // fallback（理论上不会到这里，但保留）
    separator = '/'
  }

  // 2. 过滤掉 null/undefined/空字符串片段（但保留空数组情况）
  const validSegments = segments.filter((seg) => seg != null && seg !== '')

  if (validSegments.length === 0) {
    return ''
  }

  // 3. 标准化每个片段：去除首尾多余的分隔符
  //    Windows 需同时处理 '/' 和 '\'
  const cleaned = validSegments.map((seg) => {
    // 如果是 Windows，两种斜杠都视为分隔符
    if (isWindows()) {
      // 去除开头和结尾的 \ 或 /
      return seg.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '')
    } else {
      // macOS/Linux 只需处理 /
      return seg.replace(/^\/+/, '').replace(/\/+$/, '')
    }
  })

  // 4. 检查第一个原始片段是否为绝对路径（开头有分隔符）
  const firstSeg = validSegments[0]
  const isAbsolute = isWindows()
    ? /^[\\/]/.test(firstSeg) // Windows 绝对路径以 \ 或 / 开头
    : /^\//.test(firstSeg) // macOS 绝对路径以 / 开头

  // 5. 拼接（使用分隔符）
  let result = cleaned.join(separator)

  // 6. 若原路径为绝对路径，拼接结果前补上分隔符
  if (isAbsolute && !result.startsWith(separator)) {
    result = separator + result
  }

  // 7. 处理 Windows 盘符（可选，常见场景如 C: 开头）
  //    如果第一个片段包含冒号（如 'C:' 或 'C:/'），保留冒号并正确处理
  if (isWindows() && /^[A-Za-z]:/.test(firstSeg)) {
    const driveLetter = firstSeg.slice(0, 2) // 例如 "C:"
    // 剩余部分：如果 cleaned[0] 可能已经去掉了盘符，需要还原
    // 更简单的做法：特殊处理
    // 因为 cleaned 数组已经去掉了盘符中的斜杠，我们重新构建
    // 实际使用中，用户可能会传入 'C:' 作为第一个片段
    // 这里我们重新检测
    const driveMatch = firstSeg.match(/^([A-Za-z]:)[\\/]?(.*)$/)
    if (driveMatch) {
      const drive = driveMatch[1]
      const rest = driveMatch[2]
      // 重新构造
      const restParts = rest ? [rest, ...cleaned.slice(1)] : cleaned.slice(1)
      result = drive + separator + restParts.join(separator)
      // 避免变成 C:\\\ 多个分隔符
      result = result.replace(new RegExp(separator + '{2,}', 'g'), separator)
    }
  }

  // 8. 消除多余的分隔符（如 '\\\\' 变为 '\\'，'//' 变为 '/'）
  if (isWindows()) {
    result = result.replace(/\\{2,}/g, '\\')
  } else {
    result = result.replace(/\/{2,}/g, '/')
  }

  return result
}

/**
 * 从文件路径中提取目录部分
 * 如果传入的是文件, 则返回文件所在的文件夹
 * 如果传入的是个文件夹路径, 则返回文件夹所在的文件夹
 */
export function getParentDirPath(filePath: string): string {
  const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')) + 1
  if (lastSlashIndex === -1) {
    return ''
  }
  return filePath.substring(0, lastSlashIndex)
}

const images = ['.jpeg', '.jpg', '.gif', '.png', '.apng', '.bmp', '.pic', '.svg', '.tif', '.tiff', '.webp', '.jfif', '.ico']

/**
 * 检查是否为图片
 * @param name
 * @returns
 */
export const isImage = (name: string): boolean => {
  let result = false
  if (isBlank(name)) {
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

/**
 * 获取文件后缀
 * @param name
 * @param includeDoc 是否包含 .
 * @returns
 */
export const getFileSuffix = (name: string, includeDoc: boolean = false): string => {
  if (isBlank(name)) {
    return ''
  }
  if (name.lastIndexOf('.') == -1) {
    return '未知格式'
  }
  let index = includeDoc ? name.lastIndexOf('.') : name.lastIndexOf('.') + 1
  let suffix = name.substring(index, name.length)
  if (!suffix || suffix == '' || suffix == '.') {
    return '未知格式'
  }
  return suffix
}

/**
 * 获取文件前缀
 * @param name
 * @returns
 */
export const getFilePrefix = (name: string): string => {
  if (isBlank(name)) {
    return ''
  }
  if (name.lastIndexOf('.') == -1) {
    return name
  }
  let prefix = name.substring(0, name.lastIndexOf('.'))
  if (!prefix || prefix == '' || prefix == '.') {
    return '无名称'
  }
  return prefix
}

/**
 * 是否 http/https 协议开头的 url
 * @param url
 * @returns
 */
export const isHttp = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * 是否 base64 图片
 * @param image
 * @returns
 */
export const isBase64Img = (image: string) => {
  if (isBlank(image)) {
    return false
  }
  let prefix = image.substring(0, Math.max(image.indexOf(','), 0))
  return prefix.startsWith('data:image') && prefix.endsWith('base64')
}

export const uuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * 文件名不允许包含如下特殊字符
 * mac平台的约束在win平台同样生效, 放置文档库在不同设备之间同步
 */
export const inValidateFileName = (str: string): boolean => {
  const regex = /[<>\/\\:*?"|.]/
  return regex.test(str)
}
