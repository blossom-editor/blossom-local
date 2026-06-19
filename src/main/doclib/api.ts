import { ipcMain, dialog, shell } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { sysFolder, articleExtensionFile, docLibStatsFile } from './docLibManager'
import { CurDocLibManager } from './curDocLibManager'
import { DocLibStatsManager, DocLibStatsNumber } from './docLibStatsManager'
import { offsetMounth, timeToYMD, lastDayOfThisMonth, offsetDay, firstDayOfMonth } from '../date'
import { isSysFile } from '../doclib/docLibManager'
import { getUniqueId, cutSuffix, imagesSuffix, warnLog } from '../utils'
import { IdMapping, FileItem } from '../doclib/idMapping'
import { PicNameMapping, PicItem } from '../doclib/picNameMapping'
import { findNodesByIds, getType, sortDocTreeList } from './docLibUtil'

const idMapping = IdMapping.getInstance()
const docLibStatsManager = DocLibStatsManager.getInstance()
const curDocLibManager = CurDocLibManager.getInstance()
const picNameMapping = PicNameMapping.getInstance()

//#region Init
export const initDocLibApi = () => {
  console.log('   4.3 初始化文档库接口 initDocLibApi')
  initReadDocTree()
  //
  initSelectDocLibFolderDialog()
  initSelectDocLibIconDialog()
  initcheckDocLibConfig()
  initDocLibStatWords()
  initDocLibStatWordsChatLine()
  initDocLibStatWordsChatHeatmap()
  initFileLocation()
}
const initReadDocTree = () => {
  ipcMain.handle('read-doc-tree', async (_event, req: DocTreeReq) => {
    return R.ok(await readDocTreeSort(req))
  })
}
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
const initSelectDocLibIconDialog = () => {
  ipcMain.handle('select-doclib-icon-dialog', (_event, req: SelectDocLibIconReq) => {
    return selectDocLibIconDialog(req)
  })
}

/**
 * 启动时检查文档库的配置文件
 */
const initcheckDocLibConfig = () => {
  ipcMain.handle('check-doclib-config', (_event, base: Base) => {
    return checkDocLibConfig(base)
  })
}

//#endregion

//#region ====================================< 文档列表 >====================================

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

  // 清空必要数据
  await docLibStatsManager.clecrArticleUpdToday(req.docLibPath!)
  picNameMapping.clear()
  const stats: DocLibStatsNumber = { articleTotal: 0, pictureTotal: 0, pictureTotalSize: 0 }

  const docTree = await readDocTree(req, stats)
  sortDocTreeList(docTree)

  // 读取后置数据
  docLibStatsManager.updateStatsNumber(stats)
  docLibStatsManager.save(req.docLibPath!)
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
const readDocTree = async (req: DocTreeReq, status: DocLibStatsNumber): Promise<DocTree[]> => {
  const files = await fs.promises.readdir(req.docLibPath!, { withFileTypes: true })
  const nodes: DocTree[] = []

  // 一次查询多个 stats
  const statPromises = files.map((file) => fs.promises.stat(path.join(req.docLibPath!, file.name), { bigint: true }))
  const statsArray = await Promise.all(statPromises)

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const stats = statsArray[i]
    const fullPath = path.join(req.docLibPath!, file.name)
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
      const children = await readDocTree({ docLibPath: fullPath, type: req.type }, status)
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
        status.pictureTotal++
        status.pictureTotalSize += Number(stats.size)
      }
      if (file.name.endsWith('.md')) {
        docLibStatsManager.increaseArticleUpdToday(timeToYMD(stats.mtime.toString()))
        fileItem.type = 'ARTICLE'
        status.articleTotal++
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

/**
 * 递归读取 beginPath 下的所有文件, 并将所有文件作为列表返回, 同时会刷新 idMapping
 *
 * @param beginPath 开始路径
 * @param result 返回结果
 * @returns 返回为集合, 非树状类表
 */
export const readDocList = async (beginPath: string, result: DocListItem[]): Promise<DocListItem[]> => {
  // readdir 只读取文件夹
  const files = await fs.promises.readdir(beginPath, { withFileTypes: true })

  const statPromises = files.map((file) => fs.promises.stat(path.join(beginPath, file.name), { bigint: true }))
  const statsArray = await Promise.all(statPromises)

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const fullPath = path.join(file.path, file.name)
    const stats = statsArray[i]
    idMapping.add(new FileItem(getUniqueId(stats), fullPath, getType(file)))

    if (file.isDirectory()) {
      await readDocList(fullPath, result)
    } else {
      const docListItem: DocListItem = {
        id: getUniqueId(stats),
        type: 'ARTICLE',
        name: file.name,
        path: fullPath
      }
      if (!file.name.endsWith('.md')) {
        docListItem.type = 'PICTURE'
      }
      result.push(docListItem)
    }
  }
  return result
}

//#endregion

//#region ====================================< 文档选择弹窗 >====================================

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

/**
 * 选择一个文件, 并复制到选定为止, 然后将文件在新位置的路径返回
 */
const selectDocLibIconDialog = async (req: SelectDocLibIconReq): Promise<R<SelectFileAndMoveRes | null>> => {
  if (!req.docLibPath) {
    return R.fail('DOC_LIB_PATH_ERROR', '未选择文档库')
  }
  const iconName = 'doclib-icon'
  const iconPath = path.join(req.docLibPath!, '.blossom')
  const choiseFile = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择文档库图标',
    // 可选：限制文件类型
    filters: [
      { name: 'Images', extensions: imagesSuffix },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (choiseFile.canceled) {
    return R.ok(null)
  }
  const targetFilePath = path.join(iconPath, iconName + path.extname(choiseFile.filePaths[0]))
  fs.copyFileSync(choiseFile.filePaths[0], targetFilePath)
  const res: SelectFileAndMoveRes = {
    filePath: targetFilePath,
    fileName: path.basename(targetFilePath)
  }
  return R.ok(res)
}

//#endregion

//#region ====================================< 文档库的配置文件 >====================================

/**
 * 检查并补全系统配置文件
 * @param docLibPath 文档库的根路径
 */
export const checkDocLibConfig = async (base: Base) => {
  if (base === undefined || base === null || base.docLibPath === undefined || base.docLibPath === null || base.docLibPath === '') {
    return R.fail('DOCLIB_PATH_NOT_EXIST', '文档库不存在')
  }

  if (!fs.existsSync(base.docLibPath)) {
    return R.fail('DOCLIB_PATH_NOT_EXIST', `文档库不存在: ${base.docLibPath}`)
  }

  const systemPath = path.join(base.docLibPath, sysFolder)
  // 创建创建文件夹
  await fs.promises.mkdir(systemPath, { recursive: true })
  // 创建检查文档库统计文件
  await checkdocLibStatsFileFile(base.docLibPath)
  // 创建文章拓展信息文件
  await checkArticleExtensionFileFile(base.docLibPath)
  // 开始统计
  docLibStatsManager.statsBegin(base.docLibPath)
  // 变更文档库的路径, curDocLibManager 用于在全局获取当前文档库路径
  curDocLibManager.change(base.docLibPath)
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
  ipcMain.handle('doclib-stats', async (_event, base: Base): Promise<R<any>> => {
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
