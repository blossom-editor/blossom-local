import path from 'path'
import fs from 'fs'
import { getUniqueId } from '../utils'

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
 * 文件管理器, 将文件ID与文件路径进行映射, 保证文件移动时仍然能正常的保存文章
 */
export class PicNameMapping {
  // key: PicItem.name
  public files: Map<string, PicItem> = new Map()
  // 单例
  private static instance: PicNameMapping
  public static getInstance(): PicNameMapping {
    if (!PicNameMapping.instance) {
      PicNameMapping.instance = new PicNameMapping()
    }
    return PicNameMapping.instance
  }

  /**
   * 获取文件
   * @param id 文件ID
   * @returns 文件
   */
  public get(id: string): PicItem | undefined {
    return this.files.get(id)
  }

  /**
   * 添加文件, 不校验是否重复, 后添加的会覆盖
   * 如果相同名字的图片存在多个, 在文章中获取图片时, 会获取到最后添加的图片
   * @param file 文件
   */
  public add(file: PicItem) {
    this.files.set(file.name, file)
  }

  /**
   * 只有文件路径时添加, 会自动获取文件ID等信息
   * @param PicPath
   */
  public async addPath(PicPath: string) {
    fs.promises.stat(PicPath, { bigint: true }).then(async (stats) => {
      const file = new PicItem(getUniqueId(stats), path.basename(PicPath), path.dirname(PicPath), Number(stats.size))
      this.add(file)
    })
  }

  /**
   * 删除文件
   * @param id 文件ID
   */
  public clear() {
    this.files.clear()
  }

  /**
   * 图片名称是否存在
   */
  public exist(name: string) {
    return this.files.has(name)
  }
}
