import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import R from '../../preload/r'
import { sysFolder } from '../doclib/docLibManager'
import { CurDocLibManager } from '../doclib/curDocLibManager'
import { imagesSuffix } from '../utils'

const curDocLibManager = CurDocLibManager.getInstance()

/**
 * 网页收藏的配置目录, 位于文档库根目录的 .blossom 下
 * <docLibPath>/.blossom/web-collect
 * json 配置文件与图标图片都放在这个目录里
 */
export const WEB_COLLECT_FOLDER = 'web-collect'
/** 网页收藏的配置文件名 */
export const WEB_COLLECT_FILE = 'web-collect.json'

const folderPathOf = (docLibPath: string): string => path.join(docLibPath, sysFolder, WEB_COLLECT_FOLDER)

const filePathOf = (docLibPath: string): string => path.join(folderPathOf(docLibPath), WEB_COLLECT_FILE)

/**
 * 解析文档库路径, 返回路径与失败响应
 * 以主进程中记录的当前文档库为准, 请求参数作为兜底
 */
const resolveDocLibPath = (req: Base | undefined): { docLibPath: string; error?: R<never> } => {
  const docLibPath = curDocLibManager.getPath() ?? req?.docLibPath
  if (docLibPath === undefined || docLibPath === null || docLibPath === '') {
    return { docLibPath: '', error: R.fail<never>('UNSELECTED_DOCLIB', '未选择文档库') }
  }
  if (!fs.existsSync(docLibPath)) {
    return { docLibPath: '', error: R.fail<never>('DOCLIB_NOT_EXIST', `文档库不存在: ${docLibPath}`) }
  }
  return { docLibPath }
}

/**
 * 列出目录下可用的图标文件名, 用于校验 json 中填写的 icon 是否存在
 */
const listIcons = async (folderPath: string): Promise<string[]> => {
  try {
    const names = await fs.promises.readdir(folderPath)
    return names.filter((name) => imagesSuffix.includes(path.extname(name).slice(1).toLowerCase())).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch (err) {
    // 目录还不存在时视为没有图标
    return []
  }
}

//#region ====================================< 打开本地应用 >====================================

/**
 * 打开本地应用
 *
 * 直接交给系统外壳打开, 不做进程探测:
 * - 单实例应用(VSCode / Chrome / 微信等)会自己跳到前台
 * - 多实例应用(如 Godot)会再开一个窗口
 * 探测已运行实例需要额外拉起 powershell 之类的子进程, 每次点击多花 300-500ms,
 * 反而比直接打开慢一个数量级, 因此这里不启用
 */
export const openLocalApp = async (req: WebCollectOpenAppReq): Promise<R<string>> => {
  const appPath = (req.appPath ?? '').trim()
  if (appPath === '') return R.fail('APP_PATH_EMPTY', '未填写应用路径')
  if (!fs.existsSync(appPath)) return R.fail('APP_NOT_EXIST', `应用路径不存在: ${appPath}`)

  const stat = fs.statSync(appPath)
  // macOS 的应用是 .app 目录, 其他平台需要指向文件
  if (stat.isDirectory() && process.platform !== 'darwin') {
    return R.fail('APP_NOT_FILE', '应用路径需要指向可执行文件')
  }

  try {
    const msg = await shell.openPath(appPath)
    if (msg !== '') return R.fail('APP_OPEN_FAIL', msg)
    return R.ok('opened')
  } catch (err) {
    console.error('打开本地应用失败', err)
    return R.fail('APP_OPEN_FAIL', `打开应用失败: ${err}`)
  }
}

//#endregion

//#region ====================================< 初始化 >====================================

export const initWebCollectApi = (): void => {
  console.log('   4.6 初始化网页收藏接口 initWebCollectApi')
  ipcMain.handle('web-collect-read', (_event, req: WebCollectReq) => readWebCollect(req))
  ipcMain.handle('web-collect-save', (_event, req: WebCollectSaveReq) => saveWebCollect(req))
  ipcMain.handle('web-collect-open-folder', (_event, req: WebCollectReq) => openWebCollectFolder(req))
  ipcMain.handle('web-collect-open-app', (_event, req: WebCollectOpenAppReq) => openLocalApp(req))
}

//#endregion

//#region ====================================< 配置文件读写 >====================================

/**
 * 读取网页收藏的配置文件, 文件不存在时返回空内容
 * 同时返回目录路径与可用图标列表, 渲染进程据此拼接 blossom 协议地址
 */
export const readWebCollect = async (req: WebCollectReq): Promise<R<WebCollectRes>> => {
  const { docLibPath, error } = resolveDocLibPath(req)
  if (error) return error

  const folderPath = folderPathOf(docLibPath)
  const filePath = filePathOf(docLibPath)
  try {
    const exists = fs.existsSync(filePath)
    const content = exists ? await fs.promises.readFile(filePath, 'utf8') : ''
    const icons = await listIcons(folderPath)
    return R.ok({ folderPath, filePath, content, icons })
  } catch (err) {
    console.error('读取网页收藏配置失败', err)
    return R.fail('WEB_COLLECT_READ_FAIL', `读取网页收藏配置失败: ${err}`)
  }
}

/**
 * 保存网页收藏的配置文件
 * 写入前会校验 JSON 格式, 避免把不可解析的内容落盘
 */
export const saveWebCollect = async (req: WebCollectSaveReq): Promise<R<WebCollectRes>> => {
  const { docLibPath, error } = resolveDocLibPath(req)
  if (error) return error

  // 空内容视为清空配置, 不需要校验
  if (req.content.trim() !== '') {
    try {
      JSON.parse(req.content)
    } catch (err) {
      return R.fail('WEB_COLLECT_JSON_INVALID', `JSON 格式错误: ${(err as Error).message}`)
    }
  }

  const folderPath = folderPathOf(docLibPath)
  const filePath = filePathOf(docLibPath)
  try {
    await fs.promises.mkdir(folderPath, { recursive: true })
    await fs.promises.writeFile(filePath, req.content, 'utf8')
    const icons = await listIcons(folderPath)
    return R.ok({ folderPath, filePath, content: req.content, icons })
  } catch (err) {
    console.error('保存网页收藏配置失败', err)
    return R.fail('WEB_COLLECT_SAVE_FAIL', `保存网页收藏配置失败: ${err}`)
  }
}

/**
 * 在文件管理器中打开配置文件所在目录
 */
export const openWebCollectFolder = async (req: WebCollectReq): Promise<R<string>> => {
  const { docLibPath, error } = resolveDocLibPath(req)
  if (error) return error

  const folderPath = folderPathOf(docLibPath)
  try {
    await fs.promises.mkdir(folderPath, { recursive: true })
    const msg = await shell.openPath(folderPath)
    if (msg !== '') return R.fail('WEB_COLLECT_OPEN_FAIL', msg)
    return R.ok(folderPath)
  } catch (err) {
    console.error('打开网页收藏目录失败', err)
    return R.fail('WEB_COLLECT_OPEN_FAIL', `打开目录失败: ${err}`)
  }
}

//#endregion
