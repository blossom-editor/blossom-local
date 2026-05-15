import { is } from '@electron-toolkit/utils'
import { ipcMain } from 'electron'
import path from 'path'
const fs = require('fs').promises

export const initOnFileManager = () => {
  console.log('3.3 监听文件监听事件')
  initReadFile()
  initWirteFile()
  initReadDocTree()
  initReadDocInfo()
}

const toObj = (str: string): any => {
  return JSON.parse(str)
}

const tempFileJson = 'F:\\WebProjects\\blossom-demo-workspace\\.blossom\\article-tree.json'
const tempFile = 'F:\\WebProjects\\blossom-demo-workspace'

const initReadFile = () => {
  // 监听预加载脚本暴露的事件
  ipcMain.handle('read-file', async (_event, filePath) => {
    filePath = tempFileJson
    try {
      console.log('读取文件: ')
      const data = await fs.readFile(filePath, 'utf8')
      console.log(data)
      return { ok: true, data: toObj(data) }
    } catch (error) {
      console.error(`读取文件失败: ${filePath}`, error)
      return error
    }
  })
}

const initWirteFile = () => {
  ipcMain.handle('write-file', async (_event, params: SaveFileContentReq) => {
    try {
      await fs.writeFile(params.path, params.content, 'utf8')
      console.log('写入成功')
    } catch (err) {
      console.error('写入失败:', err)
    }
  })
}

const initReadDocTree = () => {
  ipcMain.handle('read-doc-tree', async (_event, dirPath: string) => {
    dirPath = tempFile
    return readDocTree(dirPath)
  })
}

const initReadDocInfo = () => {
  ipcMain.handle('read-doc-info', async (_event, params: GetFileContentReq) => {
    return readDocInfo(params)
  })
}

// 递归读取文章
const readDocTree = async (dirPath: string): Promise<DocTree[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes: DocTree[] = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    const stats = await fs.stat(fullPath)
    const node: DocTree = {
      id: stats.dev.toString() + '-' + stats.ino.toString(),
      type: 'ARTICLE',
      name: entry.name,
      path: fullPath,
      creTime: stats.birthtime, // 创建时间
      updTime: stats.mtime // 修改时间
    }

    if (entry.isDirectory()) {
      if (isSysFile(node.name)) continue
      // 递归读取子目录
      const children = await readDocTree(fullPath)
      node.type = 'FOLDER'
      node.icon = 'wl-folder'
      node.children = children
    }
    // 文件没有 children 属性
    nodes.push(node)
  }

  return nodes
}

const SysFile: string[] = ['.blossom']

const isSysFile = (filename: string) => {
  return SysFile.includes(filename)
}

const readDocInfo = async (params: GetFileContentReq): Promise<DocInfo> => {
  console.log('读取文件信息', params.path)
  const doc: DocInfo = {
    id: '',
    name: '',
    type: 'ARTICLE',
    path: params.path
  }

  try {
    const data = await fs.readFile(params.path, 'utf8')
    doc.markdown = data
    return doc
  } catch (error) {
    console.error(`读取文件失败: ${params.path}`, error)
    return doc
  }
}
