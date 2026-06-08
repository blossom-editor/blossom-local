export class FileItem {
  public id: string
  public path: string
  public type: 'ARTICLE' | 'FOLDER' | 'PICTURE'

  constructor(id: string, path: string, type: 'ARTICLE' | 'FOLDER' | 'PICTURE') {
    this.id = id
    this.path = path
    this.type = type
  }
}

/**
 * 文件管理器, 将文件ID与文件路径进行映射, 保证文件移动时仍然能正常的保存文章
 */
export class IdMapping {
  public files: Map<string, FileItem> = new Map()
  // 单例
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
