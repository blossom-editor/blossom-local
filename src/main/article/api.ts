import { BrowserWindow, ipcMain, shell } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { IdMapping, FileItem } from '../doclib/idMapping'
import { DocLibStatsManager, MdToLink, MdToLinkItem, UpdateMdNameRes } from '../doclib/docLibStatsManager'
import { readDocList, readDocTreeSort } from '../doclib/api'
import { timeToYMD } from '../date'
import { getUniqueId } from '../utils'
import { PicNameMapping } from '../doclib/picNameMapping'

const idMapping = IdMapping.getInstance()
const picNameMapping = PicNameMapping.getInstance()
const docLibStatsManager = DocLibStatsManager.getInstance()

let mainWindow: BrowserWindow

//#region init
export const initArticleApi = (win: BrowserWindow) => {
  mainWindow = win
  console.log('   4.4 初始化文章接口 initArticleApi')
  initReadDocInfo()
  initRenameFile()
  initMoveFile()
  initSaveArticleContent()
  initCreateFolder()
  initCreateMarkdown()
  initDeleteFile()
  initArticleRefList()
}
const initReadDocInfo = () => {
  ipcMain.handle('read-doc-info', async (_event, req: GetFileContentReq): Promise<R<DocInfo>> => await readDocInfo(req))
}
const initRenameFile = () => {
  ipcMain.handle('rename-file', async (_event, req: RenameFileReq): Promise<R<DocTree[]>> => renameFile(req))
}
const initMoveFile = () => {
  ipcMain.handle('move-file', async (_event, params: MoveFileReq) => moveFile(params))
}
const initSaveArticleContent = () => {
  ipcMain.handle('save-article-content', (_event, req: SaveFileContentReq) => saveArticleContent(req))
}
const initCreateFolder = () => {
  ipcMain.handle('create-folder', (_event, req: CreateFileReq) => createFolder(req))
}
const initCreateMarkdown = () => {
  ipcMain.handle('create-markdown', (_event, req: CreateFileReq) => createMarkdown(req))
}
const initDeleteFile = () => {
  ipcMain.handle('delete-file', (_event, req: DeleteFileReq) => deleteFile(req))
}
const initArticleRefList = () => {
  ipcMain.handle('article-ref', (_event, req: ArticleRefReq) => articleRefList(req))
}
//#endregion

/**
 * 异步读取文件内容并构建文档信息对象
 *
 * @param req - 获取文件内容的请求参数，包含文件路径等信息
 * @returns 返回包含文档基本信息的 DocInfo 对象。若读取成功，markdown 字段将包含文件内容；若读取失败，markdown 字段为空字符串，但仍返回包含路径等基础信息的对象
 */
export const readDocInfo = async (req: GetFileContentReq): Promise<R<DocInfo>> => {
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
    console.error(`读取文件失败: ${doc.path}`, error)
    return R.fail('获取文章内容失败', error)
  }
}

/**
 * 重命名文件或文件夹
 */
const renameFile = async (req: RenameFileReq): Promise<R<DocTree[]>> => {
  try {
    const doc: FileItem | undefined = idMapping.get(req.id)
    if (doc === undefined) return R.fail('文件不存在', '被重命名的文件不存在')

    const oldPath = doc.path
    const newPath = path.join(path.dirname(oldPath), req.newName)

    // 判断新文件是否存在
    if (!fs.existsSync(oldPath)) return R.fail('文件不存在', '被重命名的文件不存在')
    if (fs.existsSync(newPath)) return R.fail('文件名重复', '已存在相同名称的文件')

    // ============================================================================================
    // 如果是文件夹, 则批量处理所有子文件的关联链接
    // ============================================================================================
    if (doc.type === 'FOLDER') {
      // 遍历所有子文件
      const oldDocList: DocListItem[] = await readDocList(oldPath, [])
      if (oldDocList.length !== 0) {
        await fs.promises.rename(oldPath, newPath)
        // 重命名后重新获取子文件的路径
        const newDocList: DocListItem[] = await readDocList(newPath, [])

        const updateParams: { id: string; oldPath: string; newPath: string }[] = []
        for (const oldDoc of oldDocList) {
          if (oldDoc.type !== 'ARTICLE') continue
          const newDoc = newDocList.find((newDoc) => newDoc.id === oldDoc.id)
          if (newDoc) {
            updateParams.push({
              id: oldDoc.id,
              oldPath: oldDoc.path,
              newPath: newDoc.path
            })
          }
        }

        const updateDocs: UpdateMdNameRes[] = []
        for (const updateParam of updateParams) {
          updateDocs.push(...docLibStatsManager.updateMdName(updateParam.id, updateParam.oldPath, updateParam.newPath))
        }

        // 批量修改文章的内容, 替换文章中的链接路径或名称
        for (const markdown of updateDocs) {
          const article = idMapping.get(markdown.markdownId)
          if (!article) {
            continue
          }
          const r: R<DocInfo> = await readDocInfo({ id: article.id })
          if (r.ok && r.data) {
            const docInfo = r.data
            let newContent = docInfo.markdown
            if (newContent === undefined || newContent.length === 0) {
              continue
            }
            for (const md of markdown.markdowns) {
              newContent = newContent.replaceAll(md.oldLinkRaw, md.newLinkRaw)
            }
            await saveArticleContent({ id: article.id, content: newContent })
          }
        }
        const markdownIds = updateDocs.map((item) => item.markdownId)
        mainWindow.webContents.send('replace-content-article-id', markdownIds)
      } else {
        await fs.promises.rename(oldPath, newPath)
      }
    }

    // ============================================================================================
    // 如果是文章, 只需要处理自己
    // ============================================================================================
    else {
      const updateDocs: UpdateMdNameRes[] = docLibStatsManager.updateMdName(doc.id, oldPath, newPath)

      await fs.promises.rename(oldPath, newPath)

      // 批量修改文章的内容, 替换文章中的链接路径或名称
      for (const markdown of updateDocs) {
        const article = idMapping.get(markdown.markdownId)
        if (!article) {
          continue
        }
        const r: R<DocInfo> = await readDocInfo({ id: article.id })
        if (r.ok && r.data) {
          const docInfo = r.data
          let newContent = docInfo.markdown
          if (newContent === undefined || newContent.length === 0) {
            continue
          }
          for (const md of markdown.markdowns) {
            newContent = newContent.replaceAll(md.oldLinkRaw, md.newLinkRaw)
          }
          await saveArticleContent({ id: article.id, content: newContent })
        }
      }
      const markdownIds = updateDocs.map((item) => item.markdownId)
      mainWindow.webContents.send('replace-content-article-id', markdownIds)
    }
    return R.ok(await readDocTreeSort({ docLibPath: req.docLibPath, type: 'ARTICLE' }))
  } catch (err) {
    return R.fail('文件重命名失败', err)
  }
}

/**
 * 移动文件, 同时会自动修改子文件夹下的文件路径, 不需要同步修改
 */
const moveFile = async (req: MoveFileReq): Promise<R<DocTree[]>> => {
  try {
    const drag = idMapping.get(req.id)
    const enter = idMapping.get(req.targetId)

    if (drag === undefined || enter === undefined) return R.fail('文件不存在', '被移动的文件不存在')
    if (!fs.existsSync(drag.path)) return R.fail('文件不存在', '被移动的文件路径不存在')
    if (!fs.existsSync(enter.path)) return R.fail('文件不存在', '被移动的文件路径不存在')
    if (enter.type !== 'FOLDER') return R.fail('移动失败', '只能移动到文件夹下或文件夹同级')

    let newPath = ''

    if (req.dropType === 'inner') {
      newPath = path.join(enter.path, drag.name)
    } else if (req.dropType === 'before' || req.dropType === 'after') {
      newPath = path.join(path.dirname(enter.path), drag.name)
    }
    if (fs.existsSync(newPath)) return R.fail('文件名重复', '目标文件夹下已存在相同名称的文件')

    // await fs.promises.rename(drag.path, newPath)
    // return R.ok(await readDocTreeSort({ ...req, ...{ type: 'ARTICLE' } }))

    // ============================================================================================
    // 如果是文件夹, 则批量处理所有子文件的关联链接
    // ============================================================================================
    if (drag.type === 'FOLDER') {
      // 遍历所有子文件
      const oldDocList: DocListItem[] = await readDocList(drag.path, [])
      if (oldDocList.length !== 0) {
        await fs.promises.rename(drag.path, newPath)
        // 重命名后重新获取子文件的路径
        const newDocList: DocListItem[] = await readDocList(newPath, [])

        const updateParams: { id: string; oldPath: string; newPath: string }[] = []
        for (const oldDoc of oldDocList) {
          if (oldDoc.type !== 'ARTICLE') continue
          const newDoc = newDocList.find((newDoc) => newDoc.id === oldDoc.id)
          if (newDoc) {
            updateParams.push({
              id: oldDoc.id,
              oldPath: oldDoc.path,
              newPath: newDoc.path
            })
          }
        }

        const updateDocs: UpdateMdNameRes[] = []
        for (const updateParam of updateParams) {
          updateDocs.push(...docLibStatsManager.updateMdName(updateParam.id, updateParam.oldPath, updateParam.newPath))
        }

        // 批量修改文章的内容, 替换文章中的链接路径或名称
        for (const markdown of updateDocs) {
          const article = idMapping.get(markdown.markdownId)
          if (!article) {
            continue
          }
          const r: R<DocInfo> = await readDocInfo({ id: article.id })
          if (r.ok && r.data) {
            const docInfo = r.data
            let newContent = docInfo.markdown
            if (newContent === undefined || newContent.length === 0) {
              continue
            }
            for (const md of markdown.markdowns) {
              newContent = newContent.replaceAll(md.oldLinkRaw, md.newLinkRaw)
            }
            await saveArticleContent({ id: article.id, content: newContent })
          }
        }
        const markdownIds = updateDocs.map((item) => item.markdownId)
        mainWindow.webContents.send('replace-content-article-id', markdownIds)
      } else {
        await fs.promises.rename(drag.path, newPath)
      }
    }

    // ============================================================================================
    // 如果是文章, 只需要处理自己
    // ============================================================================================
    else {
      const updateDocs: UpdateMdNameRes[] = docLibStatsManager.updateMdName(drag.id, drag.path, newPath)

      await fs.promises.rename(drag.path, newPath)

      // 批量修改文章的内容, 替换文章中的链接路径或名称
      for (const markdown of updateDocs) {
        const article = idMapping.get(markdown.markdownId)
        if (!article) {
          continue
        }
        const r: R<DocInfo> = await readDocInfo({ id: article.id })
        if (r.ok && r.data) {
          const docInfo = r.data
          let newContent = docInfo.markdown
          if (newContent === undefined || newContent.length === 0) {
            continue
          }
          for (const md of markdown.markdowns) {
            newContent = newContent.replaceAll(md.oldLinkRaw, md.newLinkRaw)
          }
          await saveArticleContent({ id: article.id, content: newContent })
        }
      }
      const markdownIds = updateDocs.map((item) => item.markdownId)
      mainWindow.webContents.send('replace-content-article-id', markdownIds)
    }
    return R.ok(await readDocTreeSort({ docLibPath: req.docLibPath, type: 'ARTICLE' }))
  } catch (err) {
    return R.fail('50102', err)
  }
}

/**
 * 保存文件内容, 通过文件ID获取文件路径, 并保存
 */
export const saveArticleContent = async (req: SaveFileContentReq): Promise<R<any>> => {
  const article = idMapping.get(req.id)
  if (!article) {
    return R.fail('文件不存在', '未找到对应的文件')
  }

  if (article.type !== 'ARTICLE') {
    return R.ok('')
  }
  try {
    await fs.promises.writeFile(article.path, req.content, 'utf8')
    const stat = await fs.promises.stat(article.path, { bigint: true })

    // 重新构建该文章的图片关系
    docLibStatsManager.updateM2P_P2M_M2M(stat, req.content)
    docLibStatsManager.log()
    return R.ok('')
  } catch (err) {
    return R.fail('50102', err)
  }
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

/**
 * 删除文件或文件夹, 文件夹下的所有文件也会被删除
 *
 * 同时删除文章关联的图片, 图片关联的文章
 */
const deleteFile = async (req: DeleteFileReq): Promise<R<DocTree[]>> => {
  try {
    const doc = idMapping.get(req.id)
    if (!doc || !fs.existsSync(doc.path)) {
      return R.fail('文件不存在', '未找到对应的文件')
    }

    const stats = await fs.promises.stat(doc.path, { bigint: true })
    if (stats.isDirectory()) {
      const childFiles: DocListItem[] = []
      // 读取删除文件夹下的所有文件, 包括文章和图片
      await readDocList(doc.path, childFiles)

      const articleIds = childFiles.filter((f) => f.type === 'ARTICLE').map((file) => file.id)
      const pictureIds = childFiles.filter((f) => f.type === 'PICTURE').map((file) => file.id)

      for (const articleId of articleIds) {
        const article = idMapping.get(articleId)
        if (article === undefined) {
          continue
        }
        const mdStat = await fs.promises.stat(article.path, { bigint: true })
        // 传入空内容, 会清空该文章的图片关系和链接关系
        docLibStatsManager.updateM2P_P2M_M2M(mdStat, '')
      }

      for (const pictureId of pictureIds) {
        // 删除图片名称映射
        picNameMapping.delete(pictureId)
      }
    } else {
      // 单独删除文章, 不需要删除图片映射
      const mdStat = await fs.promises.stat(doc.path, { bigint: true })
      docLibStatsManager.updateM2P_P2M_M2M(mdStat, '')
    }

    await shell.trashItem(doc.path)
    docLibStatsManager.log()

    return R.ok(await readDocTreeSort({ ...req, ...{ type: 'ARTICLE' } }))
  } catch (err) {
    return R.fail('50102', err)
  }
}

//#region 双链引用图表
/**
 *
 * @param req
 */
export const articleRefList = async (req: ArticleRefReq): Promise<R<ArticleRefRes>> => {
  const res: ArticleRefRes = { nodes: [], links: [] }
  const seen: Set<string> = new Set()
  function addNode(node: ArticleRefNode) {
    if (!seen.has(node.id)) {
      seen.add(node.id)
      res.nodes.push(node)
    }
  }

  // ==================================================================
  // 查询指定文章的
  // ==================================================================
  if (req.articleId !== undefined && req.articleId !== '') {
    const article = idMapping.get(req.articleId)
    if (article === undefined) return R.ok(res)

    // 文章本身
    addNode({ id: article.id, name: article.name, type: 'INNER_ARTICLE', inner: true, url: article.path })

    // 文章引用的其他链接
    const m2m: MdToLink | undefined = docLibStatsManager.getM2M().get(article.id)
    if (m2m === undefined) return R.ok(res)

    // 文章引用的其他链接
    m2m.links.forEach((item: MdToLinkItem) => {
      if (item.type === 'PUBLIC_ARTICLE' && req.onlyInner === true) return

      const node: ArticleRefNode = { id: item.markdownId, name: item.linkUrl, type: item.type, inner: true, url: item.linkUrl }
      const link: ArticleRefLink = { source: article.id, target: item.markdownId }

      // 外部链接, 地址做为ID
      if (item.type === 'PUBLIC_ARTICLE') {
        node.id = item.linkUrl
        node.inner = false
        link.target = item.linkUrl
      } else {
        node.name = path.basename(item.linkUrl)
      }
      res.links.push(link)
      addNode(node)
    })

    // 其他文章引用的本身

    return R.ok(res)
  }

  // ==================================================================
  // 查询全局
  // ==================================================================

  // 文档库下的所有文章
  idMapping.files.forEach((file) => {
    if (file.type !== 'ARTICLE') return
    const node: ArticleRefNode = { id: file.id, name: file.name, type: 'INNER_ARTICLE', inner: true, url: file.path }
    addNode(node)
  })

  // 从文章引用解析中获取节点, 这里包含公开文章和地址错误的内部文章
  docLibStatsManager.getM2M().forEach((m2m: MdToLink, id: string) => {
    m2m.links.forEach((item: MdToLinkItem) => {
      if (item.type === 'PUBLIC_ARTICLE' && req.onlyInner === true) return

      // 内部文章引用错误要作为节点, 解析链接时没有获取到文章的 stat 时会标记此状态
      if (item.type === 'UNKNOWN_INNER_ARTICLE') {
        const node: ArticleRefNode = { id: item.linkUrl, name: path.basename(item.linkUrl), type: item.type, inner: true, url: item.linkUrl }
        const link: ArticleRefLink = { source: id, target: item.linkUrl }
        addNode(node)
        res.links.push(link)
      }
      // 外部链接作为节点, 地址做为ID
      else if (item.type === 'PUBLIC_ARTICLE') {
        const node: ArticleRefNode = { id: item.linkUrl, name: item.linkUrl, type: item.type, inner: false, url: item.linkUrl }
        const link: ArticleRefLink = { source: id, target: item.linkUrl }
        addNode(node)
        res.links.push(link)
      }
      // 正常的内部链接, 保存连线
      else {
        const link: ArticleRefLink = { source: id, target: item.markdownId }
        res.links.push(link)
      }
    })
  })

  return R.ok(res)
}
