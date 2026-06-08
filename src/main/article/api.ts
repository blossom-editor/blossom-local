import { ipcMain, shell } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { IdMapping, FileItem } from '../doclib/idMapping'
import { timeToYMD } from '../date'
import { getUniqueId } from '../utils'
import { readDocTreeSort } from '../doclib/api'

const idMapping = IdMapping.getInstance()

export const initArticleApi = () => {
  console.log('3.3 监听文件监听事件')
  initReadDocInfo()
  initRenameFile()
  initMoveFile()
  initSaveArticleContent()
  initCreateFolder()
  initCreateMarkdown()
  initDeleteFile()
}

const initReadDocInfo = () => {
  ipcMain.handle('read-doc-info', async (_event, req: GetFileContentReq): Promise<R<DocInfo>> => {
    return await readDocInfo(req)
  })
}

/**
 * 异步读取文件内容并构建文档信息对象
 *
 * @param req - 获取文件内容的请求参数，包含文件路径等信息
 * @returns 返回包含文档基本信息的 DocInfo 对象。若读取成功，markdown 字段将包含文件内容；若读取失败，markdown 字段为空字符串，但仍返回包含路径等基础信息的对象
 */
const readDocInfo = async (req: GetFileContentReq): Promise<R<DocInfo>> => {
  console.log('读取文件信息', req.path)
  const cacheDoc: FileItem | undefined = idMapping.get(req.id)
  if (!cacheDoc || cacheDoc.type !== 'ARTICLE') {
    return R.fail('文章不存在', '文章不存在, 请尝试刷新文档列表')
  }
  const doc: DocInfo = {
    id: cacheDoc.id,
    name: '',
    type: 'ARTICLE',
    path: cacheDoc.path
  }

  const stats: BigIntStats = await fs.promises.stat(doc.path, { bigint: true })
  doc.name = path.basename(doc.path)
  doc.updTime = timeToYMD(stats.mtime.toString())
  doc.type = stats.isDirectory() ? 'FOLDER' : 'ARTICLE'

  try {
    const data = await fs.promises.readFile(doc.path, 'utf8')
    doc.markdown = data
    return R.ok(doc)
  } catch (error) {
    console.error(`读取文件失败: ${req.path}`, error)
    return R.fail('获取文章内容失败', error)
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
    return R.fail('文件重命名失败', err)
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
const moveFile = async (req: MoveFileReq): Promise<R<DocTree[]>> => {
  try {
    if (!fs.existsSync(req.oldPath)) {
      return R.fail('文件不存在', '被移动的文件路径不存在')
    }

    // 只要被移动的文件夹存在重名, 则返回, 否则所有子文件都不会重名
    if (fs.existsSync(req.newPath)) {
      return R.fail('文件名重复', '目标文件夹下已存在相同名称的文件')
    }

    await fs.promises.rename(req.oldPath, req.newPath)

    return R.ok(await readDocTreeSort({ ...req, ...{ type: 'ARTICLE' } }))
  } catch (err) {
    return R.fail('50102', err)
  }
}

const initSaveArticleContent = () => {
  ipcMain.handle('save-article-content', (_event, req: SaveFileContentReq) => {
    return saveArticleContent(req)
  })
}

/**
 * 保存文件内容, 通过文件ID获取文件路径, 并保存
 */
const saveArticleContent = async (req: SaveFileContentReq): Promise<R<any>> => {
  const file = idMapping.get(req.id)
  console.log('保存文件内容: ', file)
  if (!file) {
    return R.fail('文件不存在', '未找到对应的文件')
  }

  if (file.type !== 'ARTICLE') {
    return R.ok('')
  }
  try {
    await fs.promises.writeFile(file.path, req.content, 'utf8')
    return R.ok('')
  } catch (err) {
    return R.fail('50102', err)
  }
}

const initCreateFolder = () => {
  ipcMain.handle('create-folder', (_event, req: CreateFileReq) => {
    return createFolder(req)
  })
}

/**
 * 创建一个文件夹
 */
const createFolder = async (req: CreateFileReq): Promise<R<CreateFileRes>> => {
  try {
    if (fs.existsSync(req.path)) {
      return R.fail('文件名重复', '目标文件夹下已存在相同名称的文件')
    }

    await fs.promises.mkdir(req.path)

    const res: CreateFileRes = {
      newFileId: getUniqueId(await fs.promises.stat(req.path, { bigint: true })),
      docTree: await readDocTreeSort({ ...req, ...{ type: 'ARTICLE' } })
    }

    return R.ok(res)
  } catch (err) {
    return R.fail('50301', err)
  }
}

const initCreateMarkdown = () => {
  ipcMain.handle('create-markdown', (_event, req: CreateFileReq) => {
    return createMarkdown(req)
  })
}

/**
 * 创建一个 MD 文件
 */
const createMarkdown = async (req: CreateFileReq): Promise<R<CreateFileRes>> => {
  try {
    if (fs.existsSync(req.path)) {
      return R.fail('文件名重复', '目标文件夹下已存在相同名称的文件')
    }

    await fs.promises.writeFile(req.path, '')

    const res: CreateFileRes = {
      newFileId: getUniqueId(await fs.promises.stat(req.path, { bigint: true })),
      docTree: await readDocTreeSort({ ...req, ...{ type: 'ARTICLE' } })
    }

    return R.ok(res)
  } catch (err) {
    return R.fail('50301', err)
  }
}

const initDeleteFile = () => {
  ipcMain.handle('delete-file', (_event, req: DeleteFileReq) => {
    return deleteFile(req)
  })
}

/**
 * 删除文件或文件夹, 文件夹下的所有文件也会被删除
 */
const deleteFile = async (req: DeleteFileReq): Promise<R<DocTree[]>> => {
  try {
    if (!fs.existsSync(req.path)) {
      return R.fail('文件不存在', '未找到对应的文件')
    }

    await shell.trashItem(req.path)
    console.log(`文件已移入回收站: ${req.path}`)
    return R.ok(await readDocTreeSort({ ...req, ...{ type: 'ARTICLE' } }))
  } catch (err) {
    return R.fail('50102', err)
  }
}
