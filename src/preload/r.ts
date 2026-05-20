class R<T = any> {
  public ok: boolean = false
  public code: number = 20000
  public msg: string = ''
  public data?: T

  public static ok<T>(data: T): R<T> {
    const r = new R<T>()
    r.ok = true
    r.code = 20000
    r.data = data
    return r
  }

  public static fail<T>(code?: number, msg?: any): R<T> {
    const r = new R<T>()
    r.ok = false
    r.code = code || 99999
    r.msg = msg || '未知错误'
    return r
  }
}

export default R
