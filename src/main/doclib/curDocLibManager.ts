/**
 * 保存全局文档库路径
 */
export class CurDocLibManager {
  private path: string | undefined
  private static instance: CurDocLibManager

  public static getInstance(): CurDocLibManager {
    if (!CurDocLibManager.instance) {
      CurDocLibManager.instance = new CurDocLibManager()
    }
    return CurDocLibManager.instance
  }

  public getPath(): string | undefined {
    return this.path
  }

  public change(path: string): void {
    this.path = path
  }
}
