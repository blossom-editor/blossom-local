import { ipcMain } from 'electron'
const fs = require('fs').promises
const path = require('path')

export const initOnFileManager = () => {
  console.log('3.3 监听文件监听事件')
  readFile()
  wirteFile()
}

const toObj = (str: string): any => {
  return JSON.parse(str)
}

const readFile = () => {
  // 监听预加载脚本暴露的事件
  ipcMain.handle
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      console.log('读取文件: ')
      const filePath = 'F:\\WebProjects\\blossom-demo-workspace\\.blossom\\article-tree.json'
      const data = await fs.readFile(filePath, 'utf8')
      console.log(data)
      return { ok: true, data: toObj(data) }
    } catch (error) {
      console.error(`读取文件失败: ${filePath}`, error)
      return error
    }
  })
}

const wirteFile = () => {
  ipcMain.handle('write-file', async (event, filePath: string, id: string, content: string) => {
    try {
      const filePath = 'F:\\WebProjects\\blossom-demo-workspace\\.blossom\\article-tree1.json'
      await fs.writeFile(filePath, content, 'utf8')
      console.log('写入成功')
    } catch (err) {
      console.error('写入失败:', err)
    }
  })
}
