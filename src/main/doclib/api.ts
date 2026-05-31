import { ipcMain, dialog, shell } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { sysFolder, articleExtensionFile, docLibStatsFile } from './docLibManager'
import { DocLibStatsManager } from './docLibStatsManager'
import { offsetMounth, timeToYMD, lastDayOfThisMonth, offsetDay, firstDayOfMonth } from '../date'

const docLibStatsManager = DocLibStatsManager.getInstance()

export const initDocLibApi = () => {
  initSelectDocLibFolderDialog()
  initcheckDocLibConfig()
  initDocLibStatWords()
  initDocLibStatWordsChatLine()
  initDocLibStatWordsChatHeatmap()
  initFileLocation()
  initSelectFileAndMoveDialog()
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

/**
 * 打开文件夹选择窗口, 将选择的文件夹作为文档库使用, 文档库内容的保存在渲染进程, 并不在主进程持久化到文件中
 * 无论是首次打开, 还是重复打开, 每次打开文档库都要检查并创建各类配置文件
 * @returns
 */
const selectDocLibFolderDialog = async (): Promise<R<DocLibItem>> => {
  const result = await dialog.showOpenDialog({
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
  if (!result.canceled && result) {
    const docPath = result.filePaths[0]

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

  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择一个文件夹作为文档库',
    // 可选：限制文件类型
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled) {
    console.log('选中的文件:', result.filePaths)
    return R.ok(null)
  }

  // 路径为文档库路径 + 原始文件名 + 原始扩展名
  let targetFilePath = path.join(params.targetFilePath, path.basename(result.filePaths[0]))

  // 如果重命名文件, 路径为文档库路径 + 文件名 + 扩展名
  if (params.newFileName && params.newFileName !== '' && params.newFileName.length > 0) {
    targetFilePath = path.join(params.targetFilePath, params.newFileName + path.extname(result.filePaths[0]))
  }

  // 如果不覆盖文件, 先检查文件是否存在
  if (!params.cover && fs.existsSync(targetFilePath)) {
    return R.fail('50101', `文件已存在: ${targetFilePath}`)
  }

  fs.copyFileSync(result.filePaths[0], targetFilePath)

  const res: SelectFileAndMoveRes = {
    filePath: targetFilePath,
    fileName: path.basename(targetFilePath)
  }

  return R.ok(res)
}

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
 * 创建系统文件
 * @param docLibPath 文档库的根路径
 */
export const checkDocLibConfig = async (base: Base) => {
  if (base === undefined || base === null || base.docLibPath === undefined || base.docLibPath === null || base.docLibPath === '') {
    return R.fail('DOCLIB_PATH_NOT_EXIST', '文档库不存在')
  }
  // 1. 创建系统文件夹
  const systemPath = path.join(base.docLibPath, sysFolder)
  await fs.promises.mkdir(systemPath, { recursive: true })
  await checkdocLibStatsFileFile(base.docLibPath)
  await checkArticleExtensionFileFile(base.docLibPath)
  docLibStatsManager.statsBegin(base.docLibPath)
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

//#endregion

//#region ====================================< 文档库的统计信息 >====================================

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

/**
 * 获取文章数和文章字数
 */
const initDocLibStatWords = () => {
  ipcMain.handle('doclib-stats-words', async (_event, base: Base): Promise<R<{ articleTotal: number; articleTotalWords: number }>> => {
    return R.ok({
      articleTotal: (await docLibStatsManager.getStats(base.docLibPath!)).articleTotal,
      articleTotalWords: (await docLibStatsManager.getStats(base.docLibPath!)).articleTotalWords
    })
  })
}

/**
 * 获取每月字数
 */
const initDocLibStatWordsChatLine = () => {
  ipcMain.handle(
    'doclib-stats-words-chatline',
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
