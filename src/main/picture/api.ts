import { ipcMain, dialog, shell } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { IdMapping } from '../doclib/idMapping'
import { cutSuffix, getUniqueId } from '../utils'
import { picSuffix, timeToYMD } from '../date'
import { isSysFile } from '../doclib/docLibManager'
import { PicNameMapping } from '../doclib/picNameMapping'
import { DocLibStatsManager } from '../doclib/docLibStatsManager'

const idMapping = IdMapping.getInstance()
const picNameMapping = PicNameMapping.getInstance()
const docLibStatsManager = DocLibStatsManager.getInstance()

export const initPictureApi = () => {
  console.log('   4.5 初始化图片接口 initPictureApi')
  initSelectPicAndMoveDialog()
  initFileBuffSave()
  initPictureList()
  initPictureInfoByName()
  initPictureInfoByNameSync()
}

const initSelectPicAndMoveDialog = () => {
  ipcMain.handle('select-pic-and-move-dialog', (_event, params: SelectPicAndMoveReq) => {
    return selectPicAndMoveDialog(params)
  })
}

/**
 * 选择一个图片, 并复制到选定为止, 然后将文件在新位置的路径返回
 */
const selectPicAndMoveDialog = async (req: SelectPicAndMoveReq): Promise<R<SelectFileAndMoveRes | null>> => {
  const targetDoc = idMapping.get(req.targetDocId)
  const targetFolder = path.dirname(targetDoc!.path)

  // 检查文档库的路径, 如果目标文件路径不包含文档库路径, 则自动添加
  if (targetFolder.indexOf(req.docLibPath!) === -1) {
    return R.fail('FOLDER_PATH_ERROR', '文件路径错误: ' + targetFolder)
  }

  const choiseFile = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择图片或文件',
    // 可选：限制文件类型
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (choiseFile.canceled) {
    console.log('选中的文件:', choiseFile.filePaths)
    return R.ok(null)
  }

  // 有后缀时, 图片名称不会重复
  const timeSuffix = '_' + picSuffix()
  const extname = path.extname(choiseFile.filePaths[0])
  const nameWithoutExt = path.basename(choiseFile.filePaths[0], extname)
  let targetPicPath = path.join(targetFolder, nameWithoutExt + timeSuffix + extname)

  fs.copyFileSync(choiseFile.filePaths[0], targetPicPath)
  picNameMapping.addPath(targetPicPath)

  const res: SelectFileAndMoveRes = {
    filePath: targetPicPath,
    fileName: path.basename(targetPicPath)
  }

  return R.ok(res)
}

const initFileBuffSave = () => {
  ipcMain.handle('file-buffer-save', (_event, params: FileBuffSaveReq) => {
    return fileBuffSave(params)
  })
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
    const nodes: Picture[] = []
    let count: number = 0
    let size: number = 0

    for (const file of files) {
      // 系统文件不显示在文档列表中
      if (isSysFile(file.name)) {
        continue
      }
      if (!file.name.endsWith('.jpg')) {
        continue
      }

      const fullPath = path.join(file.path, file.name)

      const stats: BigIntStats = await fs.promises.stat(fullPath, { bigint: true })
      count++
      size += Number(stats.size)

      const doc: Picture = {
        id: getUniqueId(stats),
        type: 'PICTURE',
        name: file.name,
        size: Number(stats.size),
        suffix: path.extname(file.name),
        formatName: cutSuffix(file.name),
        path: fullPath,
        folderPath: file.path,
        localProtocolPath: 'blossom:\\' + fullPath,
        creTime: timeToYMD(stats.birthtime.toString()), // 创建时间
        updTime: timeToYMD(stats.mtime.toString()), // 修改时间
        delTime: 0,
        checked: false,
        articleLinks: docLibStatsManager.getMdsByPic(file.name).map((item) => {
          return {
            id: item.id,
            name: item.mdName
          }
        })
      }

      nodes.push(doc)
    }

    const res: PictureListRes = {
      totalCount: nodes.length,
      totalSize: size,
      pictures: nodes
    }

    return R.ok(res)
  })
}

const initPictureInfoByName = () => {
  ipcMain.handle('picture-info', async (_event, req: { filename: string }): Promise<R<Picture>> => {
    const basename = path.basename(req.filename)

    const pic = picNameMapping.get(basename)

    if (!pic) {
      return R.fail('FILE_NOT_FOUND', '未找到文件:' + basename)
    }

    const stats: BigIntStats = await fs.promises.stat(pic!.path, { bigint: true })

    const picInfo: Picture = {
      id: pic!.id,
      type: 'PICTURE',
      name: pic!.name,
      size: Number(stats.size),
      suffix: path.extname(pic!.name),
      formatName: cutSuffix(pic!.name),
      path: pic!.path,
      folderPath: pic!.folderPath,
      localProtocolPath: 'blossom:\\' + pic!.path,
      checked: false,
      creTime: timeToYMD(stats.birthtime.toString()),
      delTime: 0,
      articleLinks: docLibStatsManager.getMdsByPic(pic.name).map((item) => {
        return {
          id: item.id,
          name: item.mdName
        }
      })
    }

    return R.ok(picInfo)
  })
}

const initPictureInfoByNameSync = () => {
  ipcMain.on('picture-info', (_event, req: { filename: string }): R<Picture> => {
    const basename = path.basename(req.filename)

    const pic = picNameMapping.get(basename)

    if (!pic) {
      return R.fail('FILE_NOT_FOUND', '未找到文件:' + basename)
    }

    const picInfo: Picture = {
      id: pic!.id,
      type: 'PICTURE',
      name: pic!.name,
      size: pic.size,
      suffix: path.extname(pic!.name),
      formatName: cutSuffix(pic!.name),
      path: pic!.path,
      folderPath: pic!.folderPath,
      localProtocolPath: 'blossom:\\' + pic!.path,
      checked: false,
      delTime: 0,
      articleLinks: docLibStatsManager.getMdsByPic(pic.name).map((item) => {
        return {
          id: item.id,
          name: item.mdName
        }
      })
    }

    return R.ok(picInfo)
  })
}
