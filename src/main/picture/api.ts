import { ipcMain, dialog, shell } from 'electron'
import fs, { BigIntStats } from 'fs'
import path from 'path'
import R from '../../preload/r'
import { IdMapping, FileItem } from '../doclib/idMapping'
import { cutSuffix, getUniqueId } from '../utils'
import { timeToYMD } from '../date'
import { isSysFile } from '../doclib/docLibManager'

const idMapping = IdMapping.getInstance()

export const initPictureApi = () => {
  console.log('   4.5 初始化图片接口 initPictureApi')
  initPictureList()
}

/**
 * 返回指定文件夹下的所有图片, 图片需要分页
 */
const initPictureList = () => {
  ipcMain.handle('picture-list', async (_event, req: PictureListReq): Promise<R<PictureListRes>> => {
    const folder = idMapping.get(req.id)
    if (!folder || folder?.type === 'FOLDER') {
      return R.fail('文件不存在', '未找到对应的文件')
    }
    const files = await fs.promises.readdir(folder.path, { withFileTypes: true })
    const nodes: DocTree[] = []
    let count: number = 0
    let size: bigint = 0n

    for (const file of files) {
      // 系统文件不显示在文档列表中
      if (isSysFile(file.name)) {
        continue
      }
      if (!file.name.endsWith('.jpg')) {
        continue
      }

      const stats: BigIntStats = await fs.promises.stat(file.path, { bigint: true })
      count++
      size += stats.size

      const doc: DocTree = {
        id: getUniqueId(stats),
        type: 'PICTURE',
        name: file.name,
        size: stats.size,
        formatName: cutSuffix(file.name),
        path: file.path,
        creTime: timeToYMD(stats.birthtime.toString()), // 创建时间
        updTime: timeToYMD(stats.mtime.toString()) // 修改时间
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
