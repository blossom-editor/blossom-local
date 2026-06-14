import { ipcMain, dialog, shell } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { sysFolder, articleExtensionFile, docLibStatsFile } from './docLibManager'
import { CurDocLibManager } from './curDocLibManager'
import { DocLibStatsManager } from './docLibStatsManager'
import { offsetMounth, timeToYMD, lastDayOfThisMonth, offsetDay, firstDayOfMonth } from '../date'
import { isSysFile } from '../doclib/docLibManager'
import { getUniqueId, cutSuffix, imagesSuffix, warnLog } from '../utils'
import { IdMapping, FileItem } from '../doclib/idMapping'
import { PicNameMapping, PicItem } from '../doclib/picNameMapping'
import { findNodesByIds, sortDocTreeList } from './docLibUtil'

const idMapping = IdMapping.getInstance()
const docLibStatsManager = DocLibStatsManager.getInstance()
const curDocLibManager = CurDocLibManager.getInstance()
const picNameMapping = PicNameMapping.getInstance()

export const initDocLibApi = () => {
  console.log('   4.3 初始化文档库接口 initDocLibApi')
  initReadDocTree()
  initSelectDocLibFolderDialog()
  initcheckDocLibConfig()
  initDocLibStatWords()
  initDocLibStatWordsChatLine()
  initDocLibStatWordsChatHeatmap()
  initFileLocation()
  initSelectFileAndMoveDialog()
}

//#region ====================================< 文档列表 >====================================

const initReadDocTree = () => {
  ipcMain.handle('read-doc-tree', async (_event, req: DocTreeReq) => {
    return R.ok(await readDocTreeSort(req))
  })
}

/**
 * 获取文档数并最终排序
 * 同时包含以下逻辑
 * 1. 统计当日修改的文章数并持久化
 * 2. 重构图片名称路径映射
 * 3. 重构全量文档ID与路径映射关系
 */
export const readDocTreeSort = async (req: DocTreeReq): Promise<DocTree[]> => {
  if (!req.docLibPath) return []

  const start = new Date().getTime()
  await docLibStatsManager.clecrArticleUpdToday(req.docLibPath!)
  picNameMapping.clear()
  const docTree = await readDocTree(req)
  sortDocTreeList(docTree)
  docLibStatsManager.save(req.docLibPath!)

  picNameMapping.log()
  if (req.type === 'PICTURE') {
    const repeat: PicItem[] = picNameMapping.getRepeatPic()
    const ids: string[] = repeat.map((item) => item.id)
    const repeatDocTree = findNodesByIds(docTree, ids)
    for (const item of repeatDocTree) {
      item.status = 'PICTURE_REPEAT'
    }
  }

  warnLog(`刷新文档用时: ${new Date().getTime() - start} ms`)
  return docTree
}

/**
 * 递归读取文件夹下的所有文件夹和 md 文件
 *
 * @param req 文档库路径, 必填项
 */
const readDocTree = async (req: DocTreeReq): Promise<DocTree[]> => {
  if (!req.docLibPath) {
    return []
  }

  const files = await fs.promises.readdir(req.docLibPath!, { withFileTypes: true })
  const nodes: DocTree[] = []

  for (const file of files) {
    const fullPath = path.join(req.docLibPath!, file.name)
    const stats: BigIntStats = await fs.promises.stat(fullPath, { bigint: true })
    const doc: DocTree = {
      id: getUniqueId(stats),
      type: req.type,
      name: file.name,
      size: Number(stats.size),
      formatName: cutSuffix(file.name),
      path: fullPath,
      folderPath: file.path,
      creTime: timeToYMD(stats.birthtime.toString()), // 创建时间
      updTime: timeToYMD(stats.mtime.toString()), // 修改时间
      status: 'NORMAL',
      childrenFileCount: 0
    }

    if (file.isDirectory()) {
      // 系统文件不显示在文档列表中
      if (isSysFile(doc.name)) {
        continue
      }

      const fileItem: FileItem = new FileItem(doc.id, doc.path, 'FOLDER')
      idMapping.add(fileItem)

      // 递归读取子目录
      const children = await readDocTree({ docLibPath: fullPath, type: req.type })
      doc.type = 'FOLDER'
      doc.icon = 'wl-folder'
      doc.formatName = file.name
      doc.children = children

      children.forEach((child) => {
        if (child.type === req.type) {
          doc.childrenFileCount++
        }
      })
    }
    // 非文件夹
    else {
      const fileItem: FileItem = new FileItem(doc.id, doc.path, req.type)
      if (!file.name.endsWith('.md')) {
        picNameMapping.add(new PicItem(doc.id, doc.name, doc.folderPath, Number(stats.size)))
        fileItem.type = 'PICTURE'
      }
      if (file.name.endsWith('.md')) {
        docLibStatsManager.increaseArticleUpdToday(timeToYMD(stats.mtime.toString()))
        fileItem.type = 'ARTICLE'
      }
      idMapping.add(fileItem)
    }
    // 根据参数选择显示的文件类型
    if (!file.isDirectory()) {
      if (file.name.endsWith('.md') && req.type === 'ARTICLE') {
        nodes.push(doc)
      }
      if (!file.name.endsWith('.md') && req.type === 'PICTURE') {
        nodes.push(doc)
      }
    } else {
      nodes.push(doc)
    }
  }
  return nodes
}

//#endregion

//#region ====================================< 文档选择弹窗 >====================================
/**
 * 打开文件位置
 */
const initFileLocation = () => {
  ipcMain.handle('open-file-location', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}

/**
 * 打开一个文档选择器
 */
const initSelectDocLibFolderDialog = () => {
  ipcMain.handle('select-doclib-folder-dialog', () => {
    return selectDocLibFolderDialog()
  })
}

/**
 * 打开文件夹选择窗口, 将选择的文件夹作为文档库使用, 文档库内容的保存在渲染进程, 并不在主进程持久化到文件中
 * 无论是首次打开, 还是重复打开, 每次打开文档库都要检查并创建各类配置文件
 * @returns
 */
const selectDocLibFolderDialog = async (): Promise<R<DocLibItem>> => {
  const choiseFile = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择一个文件夹作为文档库'
  })
  const docLibItem: DocLibItem = {
    name: '',
    path: '',
    creTime: '',
    desc: '',
    icon: '',
    isTop: false
  }
  if (!choiseFile.canceled && choiseFile) {
    const docPath = choiseFile.filePaths[0]

    const stats: BigIntStats = await fs.promises.stat(docPath, { bigint: true })

    docLibItem.name = path.basename(docPath)
    docLibItem.path = docPath
    docLibItem.creTime = timeToYMD(stats.birthtime.toString())
    docLibItem.icon = ''
    docLibItem.isTop = false
    docLibItem.desc = ''

    // 检查 blossom 所需的系统文件
    checkDocLibConfig({ docLibPath: docPath })
    return R.ok(docLibItem)
  } else {
    const r = R.ok(docLibItem)
    return r
  }
}

const initSelectFileAndMoveDialog = () => {
  ipcMain.handle('select-file-and-move-dialog', (_event, params: SelectFileAndMoveReq) => {
    return selectFileAndMoveDialog(params)
  })
}

/**
 * 选择一个文件, 并复制到选定为止, 然后将文件在新位置的路径返回
 */
const selectFileAndMoveDialog = async (params: SelectFileAndMoveReq): Promise<R<SelectFileAndMoveRes | null>> => {
  // 检查文档库的路径, 如果目标文件路径不包含文档库路径, 则自动添加
  if (params.targetFilePath.indexOf(params.docLibPath!) === -1) {
    params.targetFilePath = path.join(params.docLibPath!, params.targetFilePath)
  }

  const choiseFile = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择文件上传',
    // 可选：限制文件类型
    filters: [
      { name: 'Images', extensions: imagesSuffix },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (choiseFile.canceled) {
    console.log('选中的文件:', choiseFile.filePaths)
    return R.ok(null)
  }

  // 路径为文档库路径 + 原始文件名 + 原始扩展名
  let targetFilePath = path.join(params.targetFilePath, path.basename(choiseFile.filePaths[0]))

  // 如果重命名文件, 路径为文档库路径 + 文件名 + 扩展名
  if (params.newFileName && params.newFileName !== '' && params.newFileName.length > 0) {
    targetFilePath = path.join(params.targetFilePath, params.newFileName + path.extname(choiseFile.filePaths[0]))
  }

  // 如果不覆盖文件, 先检查文件是否存在
  if (!params.replace && fs.existsSync(targetFilePath)) {
    return R.fail('50101', `文件已存在: ${targetFilePath}`)
  }

  fs.copyFileSync(choiseFile.filePaths[0], targetFilePath)
  const res: SelectFileAndMoveRes = {
    filePath: targetFilePath,
    fileName: path.basename(targetFilePath)
  }
  console.log(res)
  return R.ok(res)
}

//#endregion

//#region ====================================< 文档库的配置文件 >====================================

/**
 * 启动时检查文档库的配置文件
 */
const initcheckDocLibConfig = () => {
  ipcMain.handle('check-doclib-config', (_event, base: Base) => {
    return checkDocLibConfig(base)
  })
}

/**
 * 检查并补全系统配置文件
 * @param docLibPath 文档库的根路径
 */
export const checkDocLibConfig = async (base: Base) => {
  if (base === undefined || base === null || base.docLibPath === undefined || base.docLibPath === null || base.docLibPath === '') {
    return R.fail('DOCLIB_PATH_NOT_EXIST', '文档库不存在')
  }
  // 创建系统文件夹
  const systemPath = path.join(base.docLibPath, sysFolder)
  // 创建文件夹
  await fs.promises.mkdir(systemPath, { recursive: true })
  // 检查文档库统计文件
  await checkdocLibStatsFileFile(base.docLibPath)
  // 文章拓展信息文件
  await checkArticleExtensionFileFile(base.docLibPath)
  // 开始统计
  docLibStatsManager.statsBegin(base.docLibPath)
  // 变更文档库的路径, curDocLibManager 用于在全局获取当前文档库路径
  curDocLibManager.change(base.docLibPath)
  // 统计所有文章的字数
  return R.ok('')
}

/**
 * 创建文章拓展信息文件
 * @param docLibPath
 * @returns
 */
const checkArticleExtensionFileFile = async (docLibPath: string) => {
  const articleExtensionFilePath = path.join(docLibPath, sysFolder, articleExtensionFile)
  if (fs.existsSync(articleExtensionFilePath)) {
    return
  } else {
    await fs.promises.writeFile(articleExtensionFilePath, '{}')
  }
}

/**
 * 创建文章统计数
 */
const checkdocLibStatsFileFile = async (docLibPath: string) => {
  const docLibStatsFilePath = path.join(docLibPath, sysFolder, docLibStatsFile)
  if (fs.existsSync(docLibStatsFilePath)) {
    return
  } else {
    await fs.promises.writeFile(docLibStatsFilePath, '{}')
  }
}

//#endregion

//#region ====================================< 文档库的统计信息接口 >====================================

/**
 * 获取文章数和文章字数
 */
const initDocLibStatWords = () => {
  ipcMain.handle('doclib-stats', async (_event, base: Base): Promise<R<{ articleTotal: number; articleTotalWords: number }>> => {
    const res = await docLibStatsManager.getStats(base.docLibPath!)

    return R.ok({
      articleTotal: res.articleTotal,
      articleTotalWords: res.articleTotalWords,
      pictureTotal: res.pictureTotal,
      pictureTotalSize: res.pictureTotalSize
    })
  })
}

/**
 * 获取每月字数
 */
const initDocLibStatWordsChatLine = () => {
  ipcMain.handle(
    'doclib-stats-words-chatline',
    /**
     * 获取每月字数
     * @param _event
     * @param base
     * @returns
     */
    async (_event, base: Base): Promise<R<{ statDates: any[]; statValues: any[]; statValuesMom: any[] }>> => {
      const result = {
        statDates: [] as string[],
        statValues: [] as number[],
        statValuesMom: [] as number[]
      }

      const wordsByMonth: Record<string, number> = (await docLibStatsManager.getStats(base.docLibPath!)).wordsByMonth
      Object.entries(wordsByMonth).sort(([a], [b]) => a.localeCompare(b))
      console.log(wordsByMonth)
      const entries = Object.entries(wordsByMonth)
      entries.forEach(([month, words], _index) => {
        result.statDates.push(month)
        result.statValues.push(words)
      })
      return R.ok(result)
    }
  )
}

/**
 * 获取文章编辑热力图
 */
const initDocLibStatWordsChatHeatmap = () => {
  ipcMain.handle(
    'doclib-stats-words-chatheatmap',
    async (_event, base: Base): Promise<R<{ chartData: any[]; maxUpdateNum: number; dateBegin: string; dateEnd: string }>> => {
      const result = {
        chartData: [] as any[],
        maxUpdateNum: 0,
        dateBegin: firstDayOfMonth(offsetMounth(-5)),
        dateEnd: lastDayOfThisMonth()
      }

      const whileEndDay = offsetDay(result.dateEnd, 1)

      const articleUpdByDay: Record<string, number> = (await docLibStatsManager.getStats(base.docLibPath!)).articleUpdByDay

      let begin = result.dateBegin
      while (begin !== whileEndDay) {
        const dayValue = articleUpdByDay[begin]
        if (dayValue > result.maxUpdateNum) {
          result.maxUpdateNum = dayValue
        }
        result.chartData.push([begin, dayValue])
        begin = offsetDay(begin, 1)
      }
      return R.ok(result)
    }
  )
}

//#endregion
