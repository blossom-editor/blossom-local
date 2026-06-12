/**
 * 获取当前年月
 * @returns
 */
export const nowYM = (): string => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // 月份从0开始
  return `${year}-${month}`
}

/**
 * 获取当前年月日
 * @returns
 */
export const nowYMD = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取当前年月日时分秒毫秒, 作为图片的后缀使用, 格式为 YYYYMMDD_HHMMSS_SSS
 * @returns
 */
export const picSuffix = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`
}

/**
 * 获取本月的最后一天
 */
export const lastDayOfThisMonth = (): string => {
  const now = new Date()
  // month 是 0-11，+1 代表下一个月，日期 0 表示回退到上一个月的最后一天
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return dateToYMD(lastDay)
}

/**
 * 获取指定日期所在月份的第一天（Date 对象）
 * @param dateStr yyyy-mm-dd 格式字符串
 */
export const firstDayOfMonth = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return dateToYMD(new Date(year, month - 1, 1))
}

//#region ===================================================== 日期格式化

/**
 * 时间戳转 YYYY-MM-DD HH:MI:SS
 * @param timeStr 时间戳
 * @returns YYYY-MM-DD HH:MI:SS
 */
export const timeToYMDHMS = (timeStr: string): string => {
  // 1. 解析字符串为 Date 对象（toString() 输出的是本地时间，new Date 可以解析）
  const date = new Date(timeStr)
  // 2. 提取各部分，并保证两位数字（补零）
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  // 3. 拼接为标准格式
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 时间戳转 YYYY-MM-DD
 * @param timeStr 时间戳
 * @returns YYYY-MM-DD
 */
export const timeToYMD = (timeStr: string): string => {
  // 1. 解析字符串为 Date 对象（toString() 输出的是本地时间，new Date 可以解析）
  const date = new Date(timeStr)
  // 2. 提取各部分，并保证两位数字（补零）
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0')
  // 3. 拼接为标准格式
  return `${year}-${month}-${day}`
}

/**
 * 时间戳转 YYYY-MM
 * @param timeStr 时间戳
 * @returns YYYY-MM
 */
export const timeToYM = (timeStr: string): string => {
  // 1. 解析字符串为 Date 对象（toString() 输出的是本地时间，new Date 可以解析）
  const date = new Date(timeStr)
  // 2. 提取各部分，并保证两位数字（补零）
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // 月份从0开始
  // 3. 拼接为标准格式
  return `${year}-${month}`
}

/**
 * date 转 YYYY-MM-DD
 * @param date
 */
export const dateToYMD = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * YYYY-MM-DD 转 date
 * @param date
 */
export const YMDToDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  // month - 1 因为月份从 0 开始，day 直接设置为当天，这样不会有时区转换问题
  return new Date(year, month - 1, day)
}

//#endregion

//#region ===================================================== 日期计算

/**
 * 当前日期增加或减去指定月份
 * @param mounth 正数/负数
 * @returns YYYY-MM-DD
 */
export const offsetMounth = (mounth: number) => {
  const now = new Date()
  now.setMonth(now.getMonth() + mounth) // 自动处理跨年和日期溢出
  return dateToYMD(now)
}

/**
 * 当前日期增加或减去指定天数
 * @param mounth 正数/负数
 * @returns YYYY-MM-DD
 */
export const offsetDay = (baseDate: string, days: number) => {
  const result = new Date(YMDToDate(baseDate)) // 深拷贝
  result.setDate(result.getDate() + days)
  return dateToYMD(result)
}
