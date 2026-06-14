import path from 'path'
import fs from 'fs'
import { errorLog, getUniqueId, traceLog } from '../utils'

export class PicItem {
  public id: string
  // 文件名称
  public name: string
  // 包含文件名的路径
  public path: string
  // 不包含文件名的路径
  public folderPath: string
  public size: number

  constructor(id: string, name: string, folderPath: string, size: number) {
    this.id = id
    this.name = name
    // 包含文件名的路径
    this.path = path.join(folderPath, name)
    // 不包含文件名的路径
    this.folderPath = folderPath
    this.size = size
  }
}

/**
 * 文件管理器, 将文件ID与文件路径进行映射, 保证文件移动时仍然能正常的保存文章.
 * 一个文件名可能存在多个文件, 但 blossom 理论上不允许存在这种情况, 此时只会获取数组的第一条.
 * 并且每次获取的第一条并不一定是同一条
 */
export class PicNameMapping {
  // key: PicItem.name
  public files: Map<string, PicItem[]> = new Map()
  // 单例
  private static instance: PicNameMapping
  public static getInstance(): PicNameMapping {
    if (!PicNameMapping.instance) {
      PicNameMapping.instance = new PicNameMapping()
    }
    return PicNameMapping.instance
  }

  public log() {
    traceLog('************************************************************************************')
    traceLog('* 图片名称映射日志')
    traceLog('************************************************************************************')

    this.files.forEach((pics, key) => {
      if (pics.length > 1) {
        errorLog(`名称: ${key} 包含 ${pics.length} 张图片`)
        pics.forEach((pic) => {
          errorLog(`  - 路径: ${pic.path}`)
        })
      } else {
        console.log(`名称: ${key} 包含 ${pics.length} 张图片`)
        pics.forEach((pic) => {
          console.log(`  - 路径: ${pic.path}`)
        })
      }
      traceLog('------------------------------------------------------------------------------')
    })
    traceLog('************************************************************************************')
  }

  /**
   * 获取文件
   * @param name 文件名称
   * @returns 文件
   */
  public get(name: string): PicItem[] | undefined {
    return this.files.get(name)
  }

  /**
   * 获取重复文件
   */
  public getRepeatPic(): PicItem[] {
    const repeatPic: PicItem[] = []
    this.files.forEach((value) => {
      if (value.length > 1) {
        repeatPic.push(...value)
      }
    })
    return repeatPic
  }

  /**
   * 添加文件, 相同文件名只要路径不同, 就添加
   * 如果相同名字的图片存在多个, 在文章中获取图片时, 会获取到最后添加的图片
   * @param file 文件
   * @return 添加新文件后, 该文件名下的文件数量
   */
  public add(file: PicItem): number {
    const pics = this.files.get(file.name)
    if (pics) {
      // 路径没找到, 就添加一条新记录
      const index = pics.findIndex((pic) => pic.path === file.path)
      if (index === -1) {
        pics.push(file)
      }
    } else {
      this.files.set(file.name, [file])
    }

    return this.files.get(file.name)!.length
  }

  /**
   * 只有文件路径时添加, 会自动获取文件ID等信息
   * @param picPath
   */
  public async addPath(picPath: string) {
    fs.promises.stat(picPath, { bigint: true }).then((stats) => {
      const file = new PicItem(getUniqueId(stats), path.basename(picPath), path.dirname(picPath), Number(stats.size))
      this.add(file)
    })
  }

  /**
   * 修改路径, 先删除旧名称的路径信息, 添加新名称的路径信息
   *
   * @description 不需要更新, 每次刷新列表时全量重构
   * @param oldName 旧文件名
   * @param oldPath 旧路径
   * @param newName 新文件名
   * @param newPath 新路径
   */
  public updatePath(oldName: string, oldPath: string, _newName: string, newPath: string) {
    const oldPics = this.files.get(oldName)
    if (oldPics) {
      const index = oldPics.findIndex((pic) => pic.path === path.join(oldPath))
      if (index === -1) {
        oldPics.slice(index, 1)
      }
    }
    this.addPath(path.join(newPath))
  }

  /**
   * 清空文件
   * @param id 文件ID
   */
  public clear() {
    this.files.clear()
  }

  /**
   * 图片名称是否存在
   */
  public count(name: string): number {
    const pics = this.files.get(name)
    if (pics && pics.length > 0) {
      return pics.length
    }
    return 0
  }

  /**
   * 图片名称是否存在
   */
  public exist(name: string): boolean {
    const pics = this.files.get(name)
    if (pics && pics.length > 0) {
      return true
    }
    return false
  }
}
