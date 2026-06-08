import { BigIntStats } from "fs"

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
