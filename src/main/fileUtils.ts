import path from 'path'
const fs = require('fs').promises

const isDebug = false

export const toObj = (str: string): any => {
  return JSON.parse(str)
}

// 读取文件内容并返回, 出错是将错误抛出
export const readFile = async (filePath: string): Promise<string | any> => {
  try {
    debug('读取文件: ')
    const data = await fs.readFile(filePath, 'utf8')
    debug('文件内容: ' + data)
    return data
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error)
    throw error
  }
}

const debug = (msg: string) => {
  if (isDebug) {
    console.log('debug ==> ', msg)
  }
}
