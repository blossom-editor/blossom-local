// 文章的拓展信息
import fs from 'fs'
import path from 'path'
import { BigIntStats } from 'fs'
import { sysFolder, docLibStatsFile, isSysFile } from './docLibManager'
import { countWords } from '../article/fileUtils'
import { nowYMD, nowYM } from '../date'
import { getUniqueId } from '../utils'

/**
 * 文档库统计信息管理, 包含文档库的文章数统计, 图片数统计, 全量文档的文章和图片对应关系, 全量
 * 文档文章和链接对应关系
 */
export class DocLibStatsManager {
  /** 统计字段 */
  private stats: DocLibStats | undefined
  private lastInitStatsTime: number = 0

  private picToMdMap: Map<string, PicToMd> = new Map()
  private mdToPicMap: Map<string, MdToPic> = new Map()

  private static instance: DocLibStatsManager
  public static getInstance(): DocLibStatsManager {
    if (!DocLibStatsManager.instance) {
      DocLibStatsManager.instance = new DocLibStatsManager()
    }
    return DocLibStatsManager.instance
  }

  /**
   * 获取文档库统计信息
   * @param docLibPath 文档库路径
   * @returns
   */
  public async getStats(docLibPath: string): Promise<DocLibStats> {
    await this.checkInit(docLibPath)
    return this.stats!
  }

  public getMdsByPic(picName: string): PicToMdItem[] {
    return this.picToMdMap.get(picName)?.mds || []
  }

  /**
   * 初始化
   * @param docLibPath 文档库路径
   */
  private async init(docLibPath: string): Promise<void> {
    const rawString = await fs.promises.readFile(path.join(docLibPath, sysFolder, docLibStatsFile), 'utf-8')
    this.stats = JSON.parse(rawString) as DocLibStats
    if (this.stats.articleTotal === undefined) this.stats.articleTotal = 0
    if (this.stats.articleTotalWords === undefined) this.stats.articleTotalWords = 0

    if (this.stats.pictureTotal === undefined) this.stats.pictureTotal = 0
    if (this.stats.pictureTotalSize === undefined) this.stats.pictureTotalSize = 0

    if (this.stats.wordsByMonth === undefined) this.stats.wordsByMonth = {}
    if (this.stats.articleUpdByDay === undefined) this.stats.articleUpdByDay = {}

    // 未定义的配置项初始化, 如果有新的配置项, 在此添加
    // this.stats.articleUpdByDay[nowYMD()] = 0
  }

  /**
   * 检查是否初始化
   * @param docLibPath
   */
  private async checkInit(docLibPath: string): Promise<void> {
    if (!this.stats) {
      await this.init(docLibPath)
    }
  }

  /**
   * 持久化当前统计信息, 写入到 {@link docLibStatsFile}
   */
  public async save(docLibPath: string): Promise<void> {
    if (!this.stats) {
      return
    }
    fs.writeFileSync(path.join(docLibPath, sysFolder, docLibStatsFile), JSON.stringify(this.stats, null, 2))
    // console.log('持久化文档库统计(docLib stats)', this.stats)
    // console.log('============================================================')
  }

  /**
   * 统计文档库的统计信息
   * 在每次打开软件时刷新
   * 每次切换文档库时刷新
   * @param docLibPath 文档库路径
   */
  public async statsBegin(docLibPath: string): Promise<void> {
    // 三十秒一次
    if (new Date().getTime() - this.lastInitStatsTime < 30 * 1000) {
      return
    }
    this.lastInitStatsTime = new Date().getTime()
    if (!this.stats) {
      await this.init(docLibPath)
    }
    if (!this.stats) {
      return
    }

    const temp: DocLibStats = {
      wordsByMonth: {},
      articleUpdByDay: {},
      articleTotal: 0,
      articleTotalWords: 0,
      pictureTotal: 0,
      pictureTotalSize: 0
    }

    this.statsFileTreeRecursive(docLibPath, temp).then((temp: DocLibStats) => {
      this.stats!.articleTotal = temp.articleTotal
      this.stats!.articleTotalWords = temp.articleTotalWords
      this.stats!.pictureTotal = temp.pictureTotal
      this.stats!.pictureTotalSize = temp.pictureTotalSize
      this.stats!.wordsByMonth[nowYM()] = temp.articleTotalWords
      this.save(docLibPath)

      this.mdToPicMap.forEach((m2p, key) => {
        console.log(`文档: ${key}`)
        console.log(`包含 ${m2p.pics.length} 张图片:`)

        // 遍历当前文档下的所有图片项
        m2p.pics.forEach((pic) => {
          console.log(`  - 图片名称: ${pic.picName}, 路径: ${pic.picPath}, 结构: ${pic.picMdRaw}`)
        })

        console.log('------------------------------------------------------------------------------')
      })

      this.picToMdMap.forEach((p2m, key) => {
        console.log(`图片: ${key}`)
        console.log(`包含 ${p2m.mds.length} 个文章:`)

        // 遍历当前文档下的所有图片项
        p2m.mds.forEach((md) => {
          console.log(`  - 文章: ${md.mdPath}`)
        })

        console.log('------------------------------------------------------------------------------')
      })
    })
  }

  /**
   * 递归统计文件树
   * @param docLibPath 文档路径
   * @param temp 最终保存对象
   * @returns
   */
  private async statsFileTreeRecursive(docLibPath: string, temp: DocLibStats): Promise<DocLibStats> {
    const files = await fs.promises.readdir(docLibPath, { withFileTypes: true })

    for (const file of files) {
      if (isSysFile(file.name)) {
        continue
      }

      // 只显示文件夹和 md 文件
      if (file.isDirectory()) {
        this.statsFileTreeRecursive(path.join(docLibPath, file.name), temp)
      } else if (file.name.endsWith('.md')) {
        const mdPath = path.join(docLibPath, file.name)
        const mdContent = await fs.promises.readFile(mdPath, 'utf8')
        const mdStat = await fs.promises.stat(mdPath, { bigint: true })

        // 提取图片和链接
        this.extracImagesAndLinks(mdPath, mdStat, mdContent)

        // let start1 = new Date().getTime()
        let count = countWords(mdContent)
        temp.articleTotalWords += count
        // end = new Date().getTime() - start1
        // console.log(`字数: ${count} 耗时: ${end} ms`)

        temp.articleTotal += 1
        // console.log('=============================================================================================')
      } else {
        const fullPath = path.join(docLibPath, file.name)
        const stats = await fs.promises.stat(fullPath)
        temp.pictureTotal += 1
        temp.pictureTotalSize += stats.size
      }
    }
    return temp
  }

  /**
   * 清除当日的文章变更数
   * @param docLibPath
   * @returns
   */
  public async clecrArticleUpdToday(docLibPath: string) {
    if (!this.stats) {
      await this.init(docLibPath)
    }
    if (!this.stats) {
      return
    }
    this.stats.articleUpdByDay[nowYMD()] = 0
  }

  /**
   * 递增当日的文章变更数
   * @param updTime
   */
  public increaseArticleUpdToday(updTime: string) {
    if (updTime === nowYMD()) {
      this.stats!.articleUpdByDay[nowYMD()] += 1
    }
  }

  /**
   * 提取文章正文中的图片和链接
   * @param mdPath 文章路径
   * @param mdStat 统计信息
   * @param mdContent 文章内容
   */
  public extracImagesAndLinks(mdPath: string, mdStat: BigIntStats, mdContent: string) {
    const start = new Date().getTime()

    // ================= 提取链接 ================
    const items = extractImagesAndLinksFast(mdContent)

    for (const picItem of items) {
      if (picItem.type === 'link') {
        // console.log(`链接: ${picItem.text} -> ${picItem.url} , 标题: ${picItem.title}`)
      } else {
        // console.log(`图片: ${item.alt} -> ${item.url} , 标题: ${item.title}`)
        console.log(`图片: ${picItem.raw}`)
        this.handleMdToPic(picItem, mdPath, mdStat)
      }
    }

    // console.log(`${mdPath}, ${mdContent.length}, 耗时: ${new Date().getTime() - start} ms`)
  }

  /**
   * 处理文章和图片的对应关系
   * @param pic 图片项
   * @param mdPath 文章的路径
   */
  public handleMdToPic(pic: ImageMatch, mdPath: string, mdStat: BigIntStats) {
    const picName = extractFileName(pic.url)

    let mdToPic: MdToPic | undefined = this.mdToPicMap.get(mdPath)
    if (mdToPic === undefined) {
      mdToPic = { mdPath: mdPath, pics: [] }
    }

    let index = mdToPic.pics.findIndex((item) => item.picName === picName)
    if (index !== -1) {
      // 存在相同 picName，修改该对象
      mdToPic.pics[index].picPath = pic.url // 图片的url, 可能存在绝对路径, 相对路径, 网络路径等
      mdToPic.pics[index].picMdRaw = pic.raw // 图片的 markdown 全局格式
    } else {
      // 不存在，新增对象
      mdToPic.pics.push({ picName: picName, picPath: pic.url, picMdRaw: pic.raw })
    }

    this.mdToPicMap.set(mdPath, mdToPic)

    // ------------------------------------------------------------------------------------------

    let picToMd: PicToMd | undefined = this.picToMdMap.get(picName)
    if (picToMd === undefined) {
      picToMd = { picPath: '', mds: [] }
    }
    index = picToMd.mds.findIndex((item) => item.mdPath === mdPath)
    if (index !== -1) {
      // 存在相同 picName，修改该对象
      picToMd.mds[index].id = getUniqueId(mdStat)
      picToMd.mds[index].mdPath = mdPath
      picToMd.mds[index].mdForderPath = path.dirname(mdPath)
    } else {
      // 不存在，新增对象
      picToMd.mds.push({
        id: getUniqueId(mdStat),
        mdName: path.basename(mdPath),
        mdPath: mdPath,
        mdForderPath: path.dirname(mdPath)
      })
    }

    this.picToMdMap.set(picName, picToMd)
  }
}

/**
 * 从本地路径或网络地址中提取文件名（包含扩展名）
 * @param pathOrUrl - 待解析的字符串，支持：
 *   - Windows 路径（如 F:\folder\file.jpg）
 *   - Unix 路径（如 /home/user/file.png）
 *   - 相对路径（如 ./file.txt、../file.gif）
 *   - URL（如 https://example.com/img/photo.jpg?t=123）
 * @returns 文件名，如果没有有效文件名则返回空字符串
 */
function extractFileName(pathOrUrl: string): string {
  if (!pathOrUrl) return ''

  // 1. 将反斜杠统一替换为正斜杠，便于处理
  let normalized = pathOrUrl.replace(/\\/g, '/')

  // 2. 找到最后一个斜杠的位置，提取后面的部分
  const lastSlashIndex = normalized.lastIndexOf('/')
  let fileName = lastSlashIndex !== -1 ? normalized.substring(lastSlashIndex + 1) : normalized

  // 3. 去掉 URL 中的查询参数（?...）和锚点（#...）
  const queryIndex = fileName.indexOf('?')
  if (queryIndex !== -1) {
    fileName = fileName.substring(0, queryIndex)
  }
  const hashIndex = fileName.indexOf('#')
  if (hashIndex !== -1) {
    fileName = fileName.substring(0, hashIndex)
  }

  return fileName
}

/**
 * 提取图片和链接
 * @param markdown
 * @returns
 */
export function extractImagesAndLinksFast(markdown: string): (ImageMatch | LinkMatch)[] {
  const results: (ImageMatch | LinkMatch)[] = []
  const len = markdown.length
  let i = 0

  const tryParseTitle = (str: string, offset: number): { title: string; nextIdx: number } | null => {
    // 跳过空白
    let j = offset
    while (j < str.length && /\s/.test(str[j])) j++
    if (j >= str.length) return null
    const quote = str[j]
    if (quote !== '"' && quote !== "'") return null
    j++
    const titleStart = j
    while (j < str.length && str[j] !== quote) j++
    if (j >= str.length) return null
    const title = str.slice(titleStart, j)
    return { title, nextIdx: j + 1 }
  }

  while (i < len) {
    const ch = markdown[i]
    let isImage = false
    let startIdx = i

    if (ch === '!') {
      if (i + 1 < len && markdown[i + 1] === '[') {
        isImage = true
        i += 2
      } else {
        i++
        continue
      }
    } else if (ch === '[') {
      isImage = false
      i++
    } else {
      i++
      continue
    }

    // 此时 i 指向 '[' 之后
    const textStart = i
    while (i < len && markdown[i] !== ']') i++
    if (i >= len || markdown[i] !== ']') {
      i = startIdx + 1
      continue
    }
    const text = markdown.slice(textStart, i)
    i++ // 跳过 ']'

    if (i >= len || markdown[i] !== '(') {
      i = startIdx + 1
      continue
    }
    i++ // 跳过 '('

    const urlStart = i
    while (i < len && markdown[i] !== ')' && !/\s/.test(markdown[i])) i++
    const url = markdown.slice(urlStart, i)
    let title: string | undefined = undefined

    // 尝试解析 title（可能存在于空白之后、右括号之前）
    const afterUrl = i
    if (afterUrl < len && /\s/.test(markdown[afterUrl])) {
      const titleResult = tryParseTitle(markdown, afterUrl)
      if (titleResult) {
        title = titleResult.title
        i = titleResult.nextIdx
      } else {
        i = afterUrl
      }
    }

    // 跳过空白直到遇到 ')'
    while (i < len && markdown[i] !== ')') i++
    if (i >= len) {
      i = startIdx + 1
      continue
    }
    const endIdx = i + 1 // 包含 ')'

    results.push({
      type: isImage ? 'image' : 'link',
      raw: markdown.slice(startIdx, endIdx),
      start: startIdx,
      end: endIdx,
      ...(isImage ? { alt: text } : { text }),
      url,
      title
    } as any)

    i = endIdx
  }
  return results
}

/**
 * 文档库统计信息
 */
type DocLibStats = {
  /** 每月字数, 在选择文档库时刷新 */
  wordsByMonth: Record<string, number>
  /** 当天修改的文章数, 每次刷新文章列表时更新 */
  articleUpdByDay: Record<string, number>
  /** 文章总数, 在选择文档库时刷新 */
  articleTotal: number
  /** 文章总字数, 在选择文档库时刷新 */
  articleTotalWords: number
  /** 图片总数, 在选择文档库时刷新 */
  pictureTotal: number
  /** 图片总大小, 在选择文档库时刷新 */
  pictureTotalSize: number
}

/**
 * 图片和 markdown 的对应结果, 一个图片对应多个 markdown
 */
interface PicToMd {
  picPath: string
  mds: PicToMdItem[]
}

interface PicToMdItem {
  id: string
  mdName: string
  mdPath: string
  mdForderPath: string
}

/**
 * markdown 和图片的对应结果, 一个 markdown 对应多个图片
 */
interface MdToPic {
  mdPath: string
  pics: MdToPicItem[]
}

interface MdToPicItem {
  picName: string
  picPath: string
  picMdRaw: string
}

/**
 * 基础匹配信息（包含公共字段）
 */
interface BaseMatch {
  /** 原始文本（整个匹配到的 `[...](...)` 或 `![...](...)` 字符串） */
  raw: string
  /** 匹配在源字符串中的起始索引 */
  start: number
  /** 匹配在源字符串中的结束索引（开区间） */
  end: number
}

/**
 * 链接匹配结果
 */
export interface LinkMatch extends BaseMatch {
  type: 'link'
  /** 链接显示文本（方括号内的内容） */
  text: string
  /** 链接 URL（圆括号内的第一个 token） */
  url: string
  /** 可选的标题（例如 `"example title"`），未提供时为 `undefined` */
  title?: string
}

/**
 * 图片匹配结果
 */
export interface ImageMatch extends BaseMatch {
  type: 'image'
  /** 图片 alt 文本 */
  alt: string
  /** 图片 URL */
  url: string
  /** 可选的标题 */
  title?: string
}
