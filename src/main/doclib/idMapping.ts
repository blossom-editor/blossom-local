import path from 'path'

export class FileItem {
  public id: string
  // 文件的完整路径, 包含文件名
  public path: string
  // 文件名
  public name: string
  // 类型
  public type: DocType

  constructor(id: string, filePath: string, type: DocType) {
    this.id = id
    // 包含文件名的路径
    this.path = filePath
    this.type = type
    this.name = path.basename(filePath)
  }
}

/**
 * 文件管理器, 将文件ID与文件路径进行映射, 保证文件移动时仍然能正常的保存文章
 * 在每次刷新列表时进行全量更新
 */
export class IdMapping {
  // key: fileId
  public files: Map<string, FileItem> = new Map()

  private static instance: IdMapping
  public static getInstance(): IdMapping {
    if (!IdMapping.instance) {
      IdMapping.instance = new IdMapping()
    }
    return IdMapping.instance
  }

  /**
   * 获取文件
   * @param id 文件ID
   * @returns 文件
   */
  public get(id: string): FileItem | undefined {
    return this.files.get(id)
  }

  /**
   * 添加文件
   * @param file 文件
   */
  public add(file: FileItem) {
    this.files.set(file.id, file)
  }

  /**
   * 删除文件
   * @param id 文件ID
   */
  public clear() {
    this.files.clear()
  }
}
