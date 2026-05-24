import { ipcMain, dialog } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import { toObj, readFile, sortDocTreeForest } from './fileUtils'
import R from '../preload/r'
import { FileManager, FileItem } from './fileManager'

const fileManager = FileManager.getInstance()

// 系统文件
// .blossom 系统文件文件夹
const SysFile: string[] = ['.blossom', '.obsidian']
export const initOnFileManager = () => {
  console.log('3.3 监听文件监听事件')
  initReadFile()
  initWirteFile()
  initReadDocTree()
  initReadDocInfo()
  initOpenFileDialog()
  initRenameFile()
  initMoveFile()
}

const tempFileJson = 'F:\\WebProjects\\blossom-demo-workspace\\.blossom\\article-tree.json'

const initReadFile = () => {
  // 监听预加载脚本暴露的事件
  ipcMain.handle('read-file', async (_event, filePath) => {
    filePath = tempFileJson
    try {
      const data = await readFile(filePath)
      return R.ok(toObj(data))
    } catch (error) {
      return R.fail(50001, error)
    }
  })
}

const initWirteFile = () => {
  ipcMain.handle('write-file', async (_event, params: SaveFileContentReq) => {
    try {
      await fs.promises.writeFile(params.path, params.content, 'utf8')
      console.log('写入成功')
    } catch (err) {
      console.error('写入失败:', err)
    }
  })
}

const initOpenFileDialog = () => {
  ipcMain.handle('open-file-dialog', () => {
    return openFileDialog()
  })
}

/**
 * 打开文件夹选择窗口, 将选择的文件夹作为文档库使用, 文档库内容的保存在渲染进程, 并不在主进程持久化到文件中
 * 无论是首次打开, 还是重复打开, 每次打开文档库都要检查并创建各类配置文件
 * @returns
 */
const openFileDialog = async (): Promise<R<DocLibItem>> => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择一个文件夹作为文档库'
  })
  const docLibItem: DocLibItem = {
    name: '',
    path: '',
    creTime: ''
  }
  if (!result.canceled && result) {
    const docPath = result.filePaths[0]

    const stats: BigIntStats = await fs.promises.stat(docPath, { bigint: true })

    docLibItem.name = path.basename(docPath)
    docLibItem.path = docPath
    docLibItem.creTime = stats.birthtime.toISOString().slice(0, 10)
    return R.ok(docLibItem)
  } else {
    const r = R.ok(docLibItem)
    return r
  }
}

const initReadDocTree = () => {
  ipcMain.handle('read-doc-tree', async (_event, docPath: string) => {
    const docTree = await readDocTree(docPath)
    sortDocTreeForest(docTree)
    return R.ok(docTree)
  })
}

/**
 * 递归读取文件夹下的所有文件夹和 md 文件
 *
 * @param docLibPath
 */
const readDocTree = async (docLibPath: string): Promise<DocTree[]> => {
  const files = await fs.promises.readdir(docLibPath, { withFileTypes: true })
  const nodes: DocTree[] = []

  for (const file of files) {
    const fullPath = path.join(docLibPath, file.name)
    const stats: BigIntStats = await fs.promises.stat(fullPath, { bigint: true })
    const doc: DocTree = {
      id: getUniqueId(stats),
      type: 'ARTICLE',
      name: file.name,
      formatName: cutSuffix(file.name),
      path: fullPath,
      creTime: stats.birthtime.toISOString().slice(0, 10), // 创建时间
      updTime: stats.birthtime.toISOString().slice(0, 10) // 修改时间
    }

    if (file.isDirectory()) {
      // 系统文件不显示在文档列表中
      if (isSysFile(doc.name)) {
        continue
      }
      const fileItem: FileItem = new FileItem(doc.id, doc.path, 'FOLDER')
      fileManager.add(fileItem)

      // 递归读取子目录
      const children = await readDocTree(fullPath)
      doc.type = 'FOLDER'
      doc.icon = 'wl-folder'
      doc.name = file.name
      doc.formatName = file.name
      doc.children = children
    } else {
      const fileItem: FileItem = new FileItem(doc.id, doc.path, 'ARTICLE')
      fileManager.add(fileItem)
    }
    // 文件没有 children 属性
    nodes.push(doc)
  }
  return nodes
}

/**
 * 获取文件的唯一标识符
 * win 系统是卷ID + 文件ID, 文件移到其他卷时两个ID都会变化
 *
 * @param fileStats - 文件的 stat 对象
 * @returns 文件的唯一标识符
 */
const getUniqueId = (fileStats: BigIntStats) => {
  return fileStats.dev.toString() + '-' + fileStats.ino.toString()
}

const cutSuffix = (filename: string): string => {
  return filename.replace(/\.[^.]+$/, '')
}

const isSysFile = (filename: string) => {
  return SysFile.includes(filename)
}

const initReadDocInfo = () => {
  ipcMain.handle('read-doc-info', async (_event, params: GetFileContentReq): Promise<R<DocInfo>> => {
    return R.ok(await readDocInfo(params))
  })
}

/**
 * 异步读取文件内容并构建文档信息对象
 *
 * @param params - 获取文件内容的请求参数，包含文件路径等信息
 * @returns 返回包含文档基本信息的 DocInfo 对象。若读取成功，markdown 字段将包含文件内容；若读取失败，markdown 字段为空字符串，但仍返回包含路径等基础信息的对象
 */
const readDocInfo = async (params: GetFileContentReq): Promise<DocInfo> => {
  console.log('读取文件信息', params.path)
  const doc: DocInfo = {
    id: '',
    name: '',
    type: 'ARTICLE',
    path: params.path
  }

  doc.name = path.basename(params.path)
  doc.path = params.path
  const stats: BigIntStats = await fs.promises.stat(params.path, { bigint: true })
  doc.id = getUniqueId(stats)
  doc.updTime = stats.mtime.toISOString().slice(0, 10)
  doc.type = stats.isDirectory() ? 'FOLDER' : 'ARTICLE'

  try {
    const data = await fs.promises.readFile(params.path, 'utf8')
    doc.markdown = data
    return doc
  } catch (error) {
    console.error(`读取文件失败: ${params.path}`, error)
    return doc
  }
}

const initRenameFile = () => {
  ipcMain.handle('rename-file', async (_event, params: RenameFileReq) => {
    console.log('重命名文件', params)
    return renameFile(params.oldPath, params.newPath)
  })
}

/**
 * 重命名文件
 *
 * @param oldPath - 旧文件路径
 * @param newPath - 新文件路径
 */
const renameFile = async (oldPath: string, newPath: string): Promise<R<any>> => {
  try {
    if (fs.existsSync(newPath)) {
      return R.fail(50101, '文件名重复')
    }

    // 判断新文件是否存在
    if (!fs.existsSync(oldPath)) {
      return R.fail(50102, '被重命名的文件不存在')
    }

    await fs.promises.rename(oldPath, newPath)
    return R.ok({})
  } catch (err) {
    return R.fail(50102, err)
  }
}

const initMoveFile = () => {
  ipcMain.handle('move-file', async (_event, params: MoveFileReq) => {
    return moveFile(params)
  })
}

/**
 * 移动文件, 同事会自动修改子文件夹下的文件路径, 不需要同步修改
 */
const moveFile = async (params: MoveFileReq): Promise<R<DocTree[]>> => {
  try {
    if (!fs.existsSync(params.oldPath)) {
      return R.fail(50201, '被移动的文件不存在')
    }

    // 只要被移动的文件夹存在重名, 则返回, 否则所有子文件都不会重名
    if (fs.existsSync(params.newPath)) {
      return R.fail(50202, '目标文件夹下已存在相同名称的文件')
    }

    await fs.promises.rename(params.oldPath, params.newPath)

    return R.ok(readDocTree())
  } catch (err) {
    return R.fail(50102, err)
  }
}

//
const createDoclibSystemConfig = (path: string) => {}

const writeBlossomConfig = () => {}
