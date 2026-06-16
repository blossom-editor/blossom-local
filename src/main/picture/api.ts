import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { IdMapping } from '../doclib/idMapping'
import { cutSuffix, errorLog, generateUniqueId, getUniqueId, imagesSuffix, isImage, normalizeMarkdownImage, traceLog } from '../utils'
import { picSuffix, timeToYMD } from '../date'
import { isSysFile } from '../doclib/docLibManager'
import { PicItem, PicNameMapping } from '../doclib/picNameMapping'
import { DocLibStatsManager, UpdatePicNameRes } from '../doclib/docLibStatsManager'
import { protocolWrapper } from '../customProtocol'
import { naturalCompare } from '../doclib/docLibUtil'
import { readDocTreeSort } from '../doclib/api'
import { readDocInfo, saveArticleContent } from '../article/api'

const idMapping = IdMapping.getInstance()
const picNameMapping = PicNameMapping.getInstance()
const docLibStatsManager = DocLibStatsManager.getInstance()

let mainWindow: BrowserWindow

//#region init
export const initPictureApi = (win: BrowserWindow) => {
  mainWindow = win
  console.log('   4.5 初始化图片接口 initPictureApi')
  initSelectPicAndMoveDialog()
  initSelectMultiPicAndMoveDialog()
  initFileBuffSave()
  initPictureList()
  initPictureInfoByName()
  initRenamePicture()
  initDeleteBatchPictures()
  initMoveBatchPictures()
}

const initSelectPicAndMoveDialog = () => {
  ipcMain.handle('select-pic-and-move-dialog', (_event, params: SelectPicAndMoveReq) => selectPicAndMoveDialog(params))
}
const initSelectMultiPicAndMoveDialog = () => {
  ipcMain.handle('select-multi-pic-and-move-dialog', (_event, params: SelectPicAndMoveReq) => selectMultiPicAndMoveDialog(params))
}
const initFileBuffSave = () => {
  ipcMain.handle('file-buffer-save', (_event, params: FileBuffSaveReq) => fileBuffSave(params))
}
const initRenamePicture = () => {
  ipcMain.handle('picture-rename', async (_event, req: RenameFileReq) => renamePicture(req))
}
const initDeleteBatchPictures = () => {
  ipcMain.handle('picture-delete-batch', async (_event, req: PictureDeleteBatchReq): Promise<R<PictureDeleteBatchRes>> => deleteBatchPicture(req))
}
const initMoveBatchPictures = () => {
  ipcMain.handle('picture-move-batch', async (_event, req: PictureMoveBatchReq): Promise<R<DocTree[]>> => moveBatchPictures(req))
}
//#endregion

/**
 * 选择一个图片, 并复制到选定位置, 然后将文件在新位置的路径返回
 */
const selectPicAndMoveDialog = async (req: SelectPicAndMoveReq): Promise<R<SelectFileAndMoveRes | null>> => {
  let targetFolder = ''

  // 如果指定了文章, 则上传到文章路径, 否则上传到文档库根目录
  if (req.targetDocId && !req.targetDocLibRoot) {
    const targetDoc = idMapping.get(req.targetDocId)
    if (!targetDoc) {
      return R.fail('上传目录不存在')
    }
    if (targetDoc.type === 'FOLDER') {
      targetFolder = targetDoc.path
    } else {
      targetFolder = path.dirname(targetDoc!.path)
    }
  } else if (req.targetDocLibRoot) {
    targetFolder = req.docLibPath!
  }

  // 目标地址必须为文档库的子目录
  if (targetFolder.indexOf(req.docLibPath!) === -1) {
    return R.fail('FOLDER_PATH_ERROR', `不能将文件上传到文档库之外: [${targetFolder}]`)
  }

  const choiseFile = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择文件',
    filters: [
      { name: 'Images', extensions: imagesSuffix },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (choiseFile.canceled) {
    console.log('选中的文件:', choiseFile.filePaths)
    return R.ok(null)
  }
  const res = moveFile(choiseFile.filePaths[0], targetFolder)
  if (!res) {
  }

  return R.ok(res)
}

/**
 * 选择多个图片, 并复制到选定位置, 然后将文件在新位置的路径返回
 */
const selectMultiPicAndMoveDialog = async (req: SelectPicAndMoveReq): Promise<R<SelectFileAndMoveRes[] | null>> => {
  let targetFolder = ''

  // 如果指定了文章, 则上传到文章路径, 否则上传到文档库根目录
  if (req.targetDocId && !req.targetDocLibRoot) {
    const targetDoc = idMapping.get(req.targetDocId)
    if (!targetDoc) {
      return R.fail('上传目录不存在')
    }
    if (targetDoc.type === 'FOLDER') {
      targetFolder = targetDoc.path
    } else {
      targetFolder = path.dirname(targetDoc!.path)
    }
  } else if (req.targetDocLibRoot) {
    targetFolder = req.docLibPath!
  }

  // 目标地址必须为文档库的子目录
  if (targetFolder.indexOf(req.docLibPath!) === -1) {
    return R.fail('FOLDER_PATH_ERROR', `不能将文件上传到文档库之外: [${targetFolder}]`)
  }

  const choiseFile = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    title: '选择文件',
    filters: [
      { name: 'Images', extensions: imagesSuffix },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (choiseFile.canceled) {
    return R.ok(null)
  }
  const res: SelectFileAndMoveRes[] = []
  choiseFile.filePaths.forEach((filePath) => {
    res.push(moveFile(filePath, targetFolder))
  })

  return R.ok(res)
}

/**
 * 将文件移动到目标文件夹
 * 原文件如果重复会被重命名, 增加 YYYY_MM_DD_HHMMSS_SSS_随机字符串 后缀
 *
 * @param originFilePath 原文件
 * @param targetFolder 目标文件夹
 */
const moveFile = (originFilePath: string, targetFolder: string): SelectFileAndMoveRes => {
  // 有后缀时, 图片名称不会重复
  const timeSuffix = '_' + picSuffix()
  const extname = path.extname(originFilePath)
  const nameWithoutExt = normalizeMarkdownImage(path.basename(originFilePath, extname))

  // 1. 原始名称, 与原名字相同
  let targetPicName = nameWithoutExt + extname
  let targetPicPath = path.join(targetFolder, targetPicName)

  // 2. 如果原始名存在, 添加时间后缀
  if (picNameMapping.exist(targetPicName) || fs.existsSync(targetPicPath)) {
    targetPicName = nameWithoutExt + timeSuffix + extname
    targetPicPath = path.join(targetFolder, targetPicName)
  }

  // 3. 如果添加时间后缀后仍然存在, 添加随机数后缀
  if (picNameMapping.exist(targetPicName) || fs.existsSync(targetPicPath)) {
    const moreSuffix = '_' + generateUniqueId()
    targetPicName = nameWithoutExt + timeSuffix + moreSuffix + extname
    targetPicPath = path.join(targetFolder, targetPicName)
  }

  fs.copyFileSync(originFilePath, targetPicPath)
  picNameMapping.addPath(targetPicPath)

  const res: SelectFileAndMoveRes = {
    filePath: targetPicPath,
    fileName: path.basename(targetPicPath)
  }
  return res
}

/**
 * 通过文件缓冲区保存图片
 * @param req
 * @returns
 */
const fileBuffSave = async (req: FileBuffSaveReq): Promise<R<SelectFileAndMoveRes | null>> => {
  const targetDoc = idMapping.get(req.targetDocId)
  const targetFolder = path.dirname(targetDoc!.path)

  // 检查文档库的路径, 如果目标文件路径不包含文档库路径, 则自动添加
  if (targetFolder.indexOf(req.docLibPath!) === -1) {
    return R.fail('FOLDER_PATH_ERROR', '文件路径错误: ' + targetFolder)
  }

  const timeSuffix = '_' + picSuffix()
  let fileName: string
  if (req.fileName) {
    const extname = path.extname(req.fileName)
    const nameWithoutExt = path.basename(req.fileName, extname)
    fileName = nameWithoutExt + timeSuffix + extname
  } else {
    fileName = 'FILE' + timeSuffix + '.png'
  }
  let targetPicPath = path.join(targetFolder, fileName)
  const uint8Array = new Uint8Array(req.fileBuffer)
  fs.writeFileSync(targetPicPath, uint8Array)
  picNameMapping.addPath(targetPicPath)

  const res: SelectFileAndMoveRes = {
    filePath: targetPicPath,
    fileName: fileName
  }

  return R.ok(res)
}

/**
 * 返回指定文件夹下的所有图片, 图片需要分页
 */
const initPictureList = () => {
  ipcMain.handle('picture-list', async (_event, req: PictureListReq): Promise<R<PictureListRes>> => {
    const folder = idMapping.get(req.id)
    if (!folder) {
      return R.fail('文件不存在', '未找到对应的文件')
    }
    const files = await fs.promises.readdir(folder.path, { withFileTypes: true })

    const picFiles = files
      .filter((file) => {
        if (isSysFile(file.name)) return false
        if (!isImage(file.name)) return false
        return true
      })
      .sort((a, b) => {
        return naturalCompare(cutSuffix(a.name), cutSuffix(b.name))
      })

    const pictures = picFiles.slice((req.pageNum - 1) * req.pageSize, req.pageNum * req.pageSize)

    const nodes: Picture[] = []
    let count: number = 0
    let size: number = 0

    for (const pic of picFiles) {
      count++
      const stats: BigIntStats = await fs.promises.stat(path.join(pic.path, pic.name), { bigint: true })
      size += Number(stats.size)
    }

    for (const picture of pictures) {
      const fullPath = path.join(picture.path, picture.name)
      const stats: BigIntStats = await fs.promises.stat(fullPath, { bigint: true })
      const doc: Picture = {
        id: getUniqueId(stats),
        type: 'PICTURE',
        name: picture.name,
        size: Number(stats.size),
        suffix: path.extname(picture.name),
        formatName: cutSuffix(picture.name),
        path: fullPath,
        folderPath: picture.path,
        localProtocolPath: protocolWrapper(fullPath),
        creTime: timeToYMD(stats.birthtime.toString()), // 创建时间
        updTime: timeToYMD(stats.mtime.toString()), // 修改时间
        delType: 'NORMAL',
        checked: false,
        articleLinks: docLibStatsManager.getMdsByPic(picture.name).map((item) => {
          return {
            id: item.id,
            name: idMapping.get(item.id)!.name
          }
        })
      }

      nodes.push(doc)
    }

    const res: PictureListRes = {
      pictureTotal: count,
      pictureTotalSize: size,
      pictures: nodes
    }

    return R.ok(res)
  })
}

/**
 * 获取图片信息
 */
const initPictureInfoByName = () => {
  ipcMain.handle('picture-info', async (_event, req: PictureInfoReq): Promise<R<Picture>> => {
    const picture = idMapping.get(req.id)
    if (!picture) return R.fail('FILE_NOT_FOUND', '未找到文件')

    const stats: BigIntStats = await fs.promises.stat(picture.path, { bigint: true })
    const picInfo: Picture = {
      id: getUniqueId(stats),
      type: 'PICTURE',
      name: picture!.name,
      size: Number(stats.size),
      suffix: path.extname(picture.name),
      formatName: cutSuffix(picture.name),
      path: picture.path,
      folderPath: path.dirname(picture.path),
      localProtocolPath: protocolWrapper(picture!.path),
      checked: false,
      creTime: timeToYMD(stats.birthtime.toString()),
      delType: 'NORMAL',
      articleLinks: docLibStatsManager.getMdsByPic(picture.name).map((item) => {
        return {
          id: item.id,
          name: idMapping.get(item.id)!.name
        }
      })
    }

    return R.ok(picInfo)
  })
}

/**
 * 重命名文件
 * 因为 renmae 方法具有修改路径的功能, 所以进行业务判断, 只重命名文件的名称, 不移动文件的路径
 *
 * @param oldPath - 旧文件路径
 * @param newPath - 新文件路径
 * @returns 文档列表
 */
const renamePicture = async (req: RenameFileReq): Promise<R<DocTree[]>> => {
  try {
    if (fs.existsSync(req.newPath)) return R.fail('文件名重复', '已存在相同名称的文件')
    if (!fs.existsSync(req.oldPath)) return R.fail('文件不存在', '被重命名的文件不存在')

    const oldName = path.basename(req.oldPath)
    const newName = path.basename(req.newPath)

    const oldFolderPath = path.dirname(req.oldPath)
    const newFolderPath = path.dirname(req.newPath)

    // 固定的业务逻辑校验, 重命名文件时不允许移动路径
    if (oldFolderPath !== newFolderPath) return R.fail('文件路径错误', '重命名不允许修改路径')

    if (picNameMapping.exist(newName)) {
      return R.fail('文件名重复', '文档库中不允许图片名称重复')
    }

    await fs.promises.rename(req.oldPath, req.newPath)

    /*
     * 重命名图片时, 修改文章正文中的图片链接
     */
    const result: UpdatePicNameRes[] | undefined = docLibStatsManager.updatePicName(oldName, newName)
    if (result) {
      for (const markdown of result) {
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
          // 修改文章内容
          for (const pic of markdown.pictures) {
            newContent = newContent.replaceAll(pic.oldPicMdRaw, pic.newPicMdRaw)
          }
          await saveArticleContent({ id: article.id, content: newContent })
        }
      }
      const markdownIds = result.map((item) => item.markdownId)
      mainWindow.webContents.send('replace-content-article-id', markdownIds)
    }

    // 返回文档列表, 会自动刷新图片名称与路径的对应关系
    return R.ok(await readDocTreeSort({ docLibPath: req.docLibPath, type: 'PICTURE' }))
  } catch (err) {
    return R.fail('文件重命名失败', err)
  }
}

/**
 * 批量删除图片
 * 只允许删除文件, 不允许删除文件夹
 *
 * @returns 批量删除的各项结果, 成功, 失败, 使用中等信息
 */
const deleteBatchPicture = async (req: PictureDeleteBatchReq): Promise<R<PictureDeleteBatchRes>> => {
  const res: PictureDeleteBatchRes = {
    success: 0,
    fault: 0,
    inuse: 0,
    successIds: [],
    docTree: []
  }

  for (const id of req.ids) {
    const picture = idMapping.get(id)

    if (!picture || picture.type !== 'PICTURE') {
      res.fault++
      continue
    }

    // 图片不在文档库中, 则跳过
    const picturePath = path.join(picture.path)

    errorLog(`删除图片(deleteBatchPicture): ${picturePath}`)
    if (!picturePath.startsWith(req.docLibPath!)) {
      res.fault++
      continue
    }

    // 跳过不存在的文件
    if (!fs.existsSync(picturePath)) {
      res.fault++
      continue
    }

    // 图片正在被使用
    const markdowns = docLibStatsManager.getMdsByPic(picture.name)
    if (markdowns && markdowns.length > 0) {
      res.inuse++
      continue
    }

    await shell.trashItem(picturePath)
    res.success++
    res.successIds.push(id)

    const basename = path.basename(picturePath)

    // 如果图片在文档库中只有一个, 则删除图片时, 删除图片对应的文章记录解析
    // 理论上图片有被文章使用时, 不允许删除, 这里做兼容
    if (picNameMapping.count(basename) === 1) {
      docLibStatsManager.deleteP2M(basename)
    }
  }

  res.docTree = await readDocTreeSort({ docLibPath: req.docLibPath, type: 'PICTURE' })
  return R.ok(res)
}

/**
 * 批量移动文件
 * 不能移动文件夹, 只能移动子文件, 并且目标路径为同一个父文件夹
 *
 * @returns 文档列表
 */
const moveBatchPictures = async (req: PictureMoveBatchReq): Promise<R<DocTree[]>> => {
  let targetFolderPath = ''
  if (req.targetDocId && req.targetDocLibRoot === false) {
    const targetFolder = idMapping.get(req.targetDocId)
    if (!targetFolder || targetFolder.type !== 'FOLDER') return R.fail('目标文件不存在', '目标文件不存在')
    targetFolderPath = targetFolder.path
  } else if (req.targetDocLibRoot === true) {
    targetFolderPath = req.docLibPath!
  } else {
    return R.fail('目标文件夹不存在', '目标文件夹不存在')
  }

  for (const id of req.ids) {
    const picture = idMapping.get(id)
    if (!picture || picture.type !== 'PICTURE') continue

    // 图片不在文档库中, 跳过
    const picturePath = path.join(picture.path)
    if (!picturePath.startsWith(req.docLibPath!)) continue

    // 图片不存在, 跳过
    if (!fs.existsSync(picturePath)) continue

    const pictureName = path.basename(picturePath)
    const targetPath = path.join(targetFolderPath, pictureName)

    // 原地移动
    if (picture.path === targetPath) continue

    // 图片已存在, 跳过
    if (fs.existsSync(targetPath)) continue

    // 移动文件
    await fs.promises.rename(picturePath, targetPath)

    // TODO: 修改文章中的图片路径
  }

  return R.ok(await readDocTreeSort({ docLibPath: req.docLibPath, type: 'PICTURE' }))
}
