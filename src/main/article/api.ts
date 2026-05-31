import { ipcMain } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import { sortDocTreeList } from './fileUtils'
import R from '../../preload/r'
import { isSysFile } from '../doclib/docLibManager'
import { FileManager, FileItem } from './fileManager'
import { DocLibStatsManager } from '../doclib/docLibStatsManager'
import { timeToYMD } from '../date'

const fileManager = FileManager.getInstance()
const docLibStatsManager = DocLibStatsManager.getInstance()

export const initArticleApi = () => {
  console.log('3.3 监听文件监听事件')
  initReadDocTree()
  initReadDocInfo()
  initRenameFile()
  initMoveFile()
  initSaveArticleContent()
  initCreateFolder()
  initCreateMarkdown()
}

const initReadDocTree = () => {
  ipcMain.handle('read-doc-tree', async (_event, docLib: Base) => {
    return R.ok(await readDocTreeSort(docLib))
  })
}

/**
 * 获取文档数并最终排序
 */
const readDocTreeSort = async (docLib: Base): Promise<DocTree[]> => {
  await docLibStatsManager.clecrArticleUpdToday(docLib.docLibPath!)
  const docTree = await readDocTree(docLib)
  sortDocTreeList(docTree)
  docLibStatsManager.save(docLib.docLibPath!)
  return docTree
}

/**
 * 递归读取文件夹下的所有文件夹和 md 文件
 *
 * @param docLib 文档库路径, 必填项
 */
const readDocTree = async (docLib: Base): Promise<DocTree[]> => {
  if (!docLib.docLibPath) {
    return []
  }

  const files = await fs.promises.readdir(docLib.docLibPath!, { withFileTypes: true })
  const nodes: DocTree[] = []

  for (const file of files) {
    // 只显示文件夹和 md 文件
    if (!file.isDirectory() && !file.name.endsWith('.md')) {
      continue
    }

    const fullPath = path.join(docLib.docLibPath!, file.name)
    const stats: BigIntStats = await fs.promises.stat(fullPath, { bigint: true })
    const doc: DocTree = {
      id: getUniqueId(stats),
      type: 'ARTICLE',
      name: file.name,
      formatName: cutSuffix(file.name),
      path: fullPath,
      creTime: timeToYMD(stats.birthtime.toString()), // 创建时间
      updTime: timeToYMD(stats.mtime.toString()) // 修改时间
    }

    if (file.isDirectory()) {
      // 系统文件不显示在文档列表中
      if (isSysFile(doc.name)) {
        continue
      }
      const fileItem: FileItem = new FileItem(doc.id, doc.path, 'FOLDER')
      fileManager.add(fileItem)

      // 递归读取子目录
      const children = await readDocTree({ docLibPath: fullPath })
      doc.type = 'FOLDER'
      doc.icon = 'wl-folder'
      doc.name = file.name
      doc.formatName = file.name
      doc.children = children
    } else {
      const fileItem: FileItem = new FileItem(doc.id, doc.path, 'ARTICLE')
      docLibStatsManager.increaseArticleUpdToday(timeToYMD(stats.mtime.toString()))
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
  doc.updTime = timeToYMD(stats.mtime.toString())
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
      return R.fail('文件名重复', '已存在相同名称的文件')
    }

    // 判断新文件是否存在
    if (!fs.existsSync(oldPath)) {
      return R.fail('文件不存在', '被重命名的文件不存在')
    }

    await fs.promises.rename(oldPath, newPath)
    return R.ok({})
  } catch (err) {
    return R.fail('50102', err)
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
      return R.fail('文件不存在', '被移动的文件路径不存在')
    }

    // 只要被移动的文件夹存在重名, 则返回, 否则所有子文件都不会重名
    if (fs.existsSync(params.newPath)) {
      return R.fail('文件名重复', '目标文件夹下已存在相同名称的文件')
    }

    await fs.promises.rename(params.oldPath, params.newPath)

    return R.ok(await readDocTreeSort(params))
  } catch (err) {
    return R.fail('50102', err)
  }
}

const initSaveArticleContent = () => {
  ipcMain.handle('save-article-content', (_event, params: SaveFileContentReq) => {
    return saveArticleContent(params)
  })
}

/**
 * 保存文件内容, 通过文件ID获取文件路径, 并保存
 */
const saveArticleContent = async (params: SaveFileContentReq): Promise<R<any>> => {
  const file = fileManager.get(params.id)
  console.log('保存文件内容: ', file)
  if (!file) {
    return R.fail('文件不存在', '未找到对应的文件')
  }

  if (file.type !== 'ARTICLE') {
    return R.ok('')
  }
  try {
    await fs.promises.writeFile(file.path, params.content, 'utf8')
    return R.ok('')
  } catch (err) {
    return R.fail('50102', err)
  }
}

const initCreateFolder = () => {
  ipcMain.handle('create-folder', (_event, params: CreateFileReq) => {
    return createFolder(params)
  })
}

/**
 * 创建一个文件夹
 */
const createFolder = async (params: CreateFileReq): Promise<R<CreateFileRes>> => {
  try {
    if (fs.existsSync(params.path)) {
      return R.fail('文件名重复', '目标文件夹下已存在相同名称的文件')
    }

    await fs.promises.mkdir(params.path)

    const res: CreateFileRes = {
      newFileId: getUniqueId(await fs.promises.stat(params.path, { bigint: true })),
      docTree: await readDocTreeSort(params)
    }

    return R.ok(res)
  } catch (err) {
    return R.fail('50301', err)
  }
}

const initCreateMarkdown = () => {
  ipcMain.handle('create-markdown', (_event, params: CreateFileReq) => {
    return createMarkdown(params)
  })
}

/**
 * 创建一个 MD 文件
 */
const createMarkdown = async (params: CreateFileReq): Promise<R<CreateFileRes>> => {
  try {
    if (fs.existsSync(params.path)) {
      return R.fail('文件名重复', '目标文件夹下已存在相同名称的文件')
    }

    await fs.promises.writeFile(params.path, '')

    const res: CreateFileRes = {
      newFileId: getUniqueId(await fs.promises.stat(params.path, { bigint: true })),
      docTree: await readDocTreeSort(params)
    }

    return R.ok(res)
  } catch (err) {
    return R.fail('50301', err)
  }
}
