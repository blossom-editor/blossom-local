export class FileItem {
  public id: string
  public path: String
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
export class FileManager {
  public files: Map<string, FileItem> = new Map()
  // 单例
  private static instance: FileManager
  public static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager()
    }
    return FileManager.instance
  }

  public add(file: FileItem) {
    this.files.set(file.id, file)
  }

  public clear() {
    this.files.clear()
  }
}
