// 文章的拓展信息
import fs from 'fs'
import path from 'path'
import { BigIntStats } from 'fs'
import { sysFolder, docLibStatsFile, isSysFile } from './docLibManager'
import { countWords } from '../article/fileUtils'
import { nowYMD, nowYM } from '../date'
import { extractFileName, getUniqueId, traceLog, warnLog } from '../utils'

/**
 * 文档库统计信息管理, 包含文档库的文章数统计, 图片数统计, 全量文档的文章和图片对应关系, 全量
 * 文档文章和链接对应关系
 */
export class DocLibStatsManager {
  /** 统计字段 */
  private stats: DocLibStats | undefined
  private lastInitStatsTime: number = 0
  private docLibPath: string = ''

  /** 图片对应文章 picName: markdown 的 ID 集合 */
  private picToMdMap: Map<string, PicToMd> = new Map()
  /** 文章对应图片 articleId: { picName: string;  picPath: string;  picMdRaw: string; } */
  private mdToPicMap: Map<string, MdToPic> = new Map()

  // TODO: 文章和链接的关系

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

  /**
   * 根据图片名称获取对应的文章信息
   * @param picName 图片名称
   * @returns
   */
  public getMdsByPic(picName: string): PicToMdItem[] {
    return this.picToMdMap.get(picName)?.mds || []
  }

  /**
   * 统计文档库的统计信息
   * 在每次打开软件时刷新
   * 每次切换文档库时刷新
   * @param docLibPath 文档库路径
   */
  public async statsBegin(docLibPath: string): Promise<void> {
    // 三十秒一次
    if (this.docLibPath === docLibPath && new Date().getTime() - this.lastInitStatsTime < 30 * 1000) {
      return
    }

    this.docLibPath = docLibPath
    this.lastInitStatsTime = new Date().getTime()
    if (!this.stats) {
      await this.init(docLibPath)
    }
    if (!this.stats) {
      return
    }

    this.mdToPicMap.clear()
    this.picToMdMap.clear()

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
    })
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

    // this.stats.articleUpdByDay[nowYMD()] = 0 // 当日修改数不持久化, 每次打开时更新
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
    // console.log(this.stats)
  }

  /**
   * 更新文章数, 图片数, 图片总大小
   * @param stats
   * @returns
   */
  public updateStatsNumber(stats: DocLibStatsNumber) {
    if (this.stats === undefined) return
    this.stats.articleTotal = stats.articleTotal
    this.stats.pictureTotal = stats.pictureTotal
    this.stats.pictureTotalSize = stats.pictureTotalSize
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
        await this.statsFileTreeRecursive(path.join(docLibPath, file.name), temp)
      } else if (file.name.endsWith('.md')) {
        const mdPath = path.join(docLibPath, file.name)
        const mdContent = await fs.promises.readFile(mdPath, 'utf8')
        const mdStat = await fs.promises.stat(mdPath, { bigint: true })

        // 提取图片和链接
        this.extracImagesAndLinks(mdStat, mdContent)

        // let start1 = new Date().getTime()
        let count = countWords(mdContent)
        temp.articleTotalWords += count
        temp.articleTotal += 1

        // end = new Date().getTime() - start1
        // console.log(`字数: ${count} 耗时: ${end} ms`)
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
   * 提取单个文章正文中的图片和链接
   *
   * @param mdStat 统计信息
   * @param mdContent 文章内容
   */
  public extracImagesAndLinks(mdStat: BigIntStats, mdContent: string) {
    const start = new Date().getTime()

    // ================= 提取链接 ================
    const markdownId = getUniqueId(mdStat)
    const links = extractImagesAndLinksFast(mdContent)
    const linkMatch = links.filter((item): item is LinkMatch => item.type === 'link')
    const pictureMatch = links.filter((item): item is ImageMatch => item.type === 'picture')

    // 清空该文章的图片映射关系
    this.mdToPicMap.set(markdownId, { pics: [] })
    this.initM2P_P2M(pictureMatch, markdownId)
    // TODO: 更新文章和链接的关系
  }

  /**
   * 初始化处理文章和图片的相互对应关系
   *
   * @param pic 图片项
   * @param mdPath 文章的路径
   */
  private initM2P_P2M(pics: ImageMatch[], markdownId: string) {
    for (const pic of pics) {
      const picName = extractFileName(pic.url) // 从链接中获取图片的文件名
      // ========================================================================
      // 一篇文章对应多个图片名称, 每次文章的映射重新赋值即可
      // ========================================================================
      // 文章ID: 图片[]
      let mdToPic: MdToPic = this.mdToPicMap.get(markdownId)!
      mdToPic.pics.push({ picName: picName, picPath: pic.url, picMdRaw: pic.raw })
      this.mdToPicMap.set(markdownId, mdToPic)

      // ========================================================================
      // 一张图片映射多个文章ID
      // ========================================================================

      // 图片名称: 文章[]
      let picToMd: PicToMd | undefined = this.picToMdMap.get(picName)
      if (picToMd === undefined) {
        picToMd = { mds: [] }
      }

      // 图片对应的文章, 只记录文章的ID, 路径与名称等会因为文章拖拽, 重命名等原因发生变化
      // 文章的名称与路径需通过 idMapping 获取
      const index = picToMd.mds.findIndex((item) => item.id === markdownId)
      if (index !== -1) {
        picToMd.mds[index].id = markdownId
      } else {
        picToMd.mds.push({ id: markdownId })
      }

      this.picToMdMap.set(picName, picToMd)
    }
  }

  /**
   * 更新处理文章和图片的相互对应关系, 通常用在文章正文被修改时
   * 文章对应图片的关系与初始化时一样, 只有图片的逻辑不同
   *
   * @param pic 图片项
   * @param mdPath 文章的路径
   */
  public updateM2P_P2M(mdStat: BigIntStats, mdContent: string) {
    const markdownId = getUniqueId(mdStat)
    const links = extractImagesAndLinksFast(mdContent)
    const linkMatch = links.filter((item): item is LinkMatch => item.type === 'link')
    const pictureMatch = links.filter((item): item is ImageMatch => item.type === 'picture')
    // 清空该文章的图片映射关系
    this.mdToPicMap.delete(markdownId)
    // ========================================================================
    // 一篇文章对应多个图片名称, 每次文章的映射重新赋值即可
    // ========================================================================
    for (const pic of pictureMatch) {
      const picName = extractFileName(pic.url) // 从链接中获取图片的文件名
      let mdToPic: MdToPic = this.mdToPicMap.get(markdownId) || { pics: [] }
      mdToPic.pics.push({ picName: picName, picPath: pic.url, picMdRaw: pic.raw })
      this.mdToPicMap.set(markdownId, mdToPic)
    }

    // ========================================================================
    // 一张图片映射多个文章ID
    // ========================================================================
    // 1. 先删除没有关联该文章的图片中, 记录的文章ID
    const newPicNames: string[] = pictureMatch.map((p) => extractFileName(p.url))
    const oldPicNames: string[] = findKeysByMarkdownId(this.picToMdMap, markdownId)
    const deletePicNames = oldPicNames.filter((oldPicName) => !newPicNames.includes(oldPicName))
    for (const deletePicName of deletePicNames) {
      const markdowns: PicToMd | undefined = this.picToMdMap.get(deletePicName)
      if (!markdowns || !markdowns.mds || markdowns.mds.length === 0) {
        continue
      }
      const index = markdowns.mds.findIndex((md) => md.id === markdownId)
      if (index !== -1) {
        markdowns.mds.splice(index, 1)
      }
    }

    // 2. 图片中增加该文章ID
    for (const picName of newPicNames) {
      // 图片名称: 文章[]
      let picToMd: PicToMd | undefined = this.picToMdMap.get(picName)
      if (picToMd === undefined) {
        picToMd = { mds: [] }
      }

      // 图片对应的文章, 只记录文章的ID, 路径与名称等会因为文章拖拽, 重命名等原因发生变化
      // 文章的名称与路径需通过 idMapping 获取
      const index = picToMd.mds.findIndex((item) => item.id === markdownId)
      if (index !== -1) {
        picToMd.mds[index].id = markdownId
      } else {
        picToMd.mds.push({ id: markdownId })
      }
      this.picToMdMap.set(picName, picToMd)
    }
  }

  /**
   * TODO:
   * @param oldPicName
   * @param newPicName
   * @return 图片对应的文章ID
   */
  public updatePicName(oldPicName: string, newPicName: string): UpdatePicNameRes[] | undefined {
    const markdowns: PicToMd | undefined = this.picToMdMap.get(oldPicName)
    if (markdowns === undefined) {
      return
    }

    const results: UpdatePicNameRes[] = []

    // 1. 将文章关联到新图片名称
    this.picToMdMap.delete(oldPicName)
    this.picToMdMap.set(newPicName, markdowns)

    // 2. 修改文章中对应的图片名称和地址
    const markdownIds: string[] = markdowns.mds.map((md) => md.id)
    for (const markdownId of markdownIds) {
      const mdToPic: MdToPic | undefined = this.mdToPicMap.get(markdownId)
      if (mdToPic === undefined) {
        continue
      }
      const result: UpdatePicNameRes = { markdownId: markdownId, pictures: [] }
      mdToPic.pics.forEach((pic) => {
        if (pic.picName === oldPicName) {
          const replace = { oldPicMdRaw: pic.picMdRaw, newPicMdRaw: '' }
          pic.picName = newPicName
          pic.picPath = pic.picPath.replaceAll(oldPicName, newPicName)
          pic.picMdRaw = pic.picMdRaw.replaceAll(oldPicName, newPicName)
          replace.newPicMdRaw = pic.picMdRaw
          result.pictures.push(replace)
        }
      })
      results.push(result)
    }
    return results
  }

  /**
   * 删除图片对应的文章信息, 发生在图片删除和图片重命名时
   */
  public deleteP2M(picName: string) {
    this.picToMdMap.delete(picName)
  }

  public log() {
    warnLog('\n\n\n\n===============================================================================================================================')
    warnLog('* 文章对应的图片 / 图片对应的文章')
    warnLog('===============================================================================================================================')
    this.mdToPicMap.forEach((m2p, key) => {
      console.log(`文档: [${key}] 包含 ${m2p.pics.length} 张图片:`)
      m2p.pics.forEach((pic) => console.log(`  - 图片名称: ${pic.picName}  路径: ${pic.picPath}  结构: ${pic.picMdRaw}`))
      traceLog('------------------------------------------------------------------------------')
    })
    warnLog('=====< 下列是图片对应的文章 >======================================================================================================')
    this.picToMdMap.forEach((p2m, key) => {
      console.log(`图片: [${key}] 包含 ${p2m.mds.length} 个文章:`)
      p2m.mds.forEach((md) => console.log(`  - 文章ID: ${md.id}`))
      traceLog('------------------------------------------------------------------------------')
    })
  }
}

function findKeysByMarkdownId(map: Map<string, PicToMd>, markdownId: string): string[] {
  const keys: string[] = []
  for (const [key, value] of map.entries()) {
    // 检查值对象中是否包含目标值（根据需求自定义检查逻辑）
    for (const p2cItem of value.mds) {
      if (p2cItem.id === markdownId) {
        keys.push(key)
      }
    }
  }
  return keys
}

/**
 * 提取图片和链接
 * @param markdown
 * @returns
 */
export const extractImagesAndLinksFast = (markdown: string): (ImageMatch | LinkMatch)[] => {
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
    let isPicture = false
    let startIdx = i

    if (ch === '!') {
      if (i + 1 < len && markdown[i + 1] === '[') {
        isPicture = true
        i += 2
      } else {
        i++
        continue
      }
    } else if (ch === '[') {
      isPicture = false
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
      type: isPicture ? 'picture' : 'link',
      raw: markdown.slice(startIdx, endIdx),
      start: startIdx,
      end: endIdx,
      ...(isPicture ? { alt: text } : { text }),
      url,
      title
    } as any)

    i = endIdx
  }
  return results
}

//#region 类型声明 ================================================================

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

export type DocLibStatsNumber = {
  articleTotal: number
  pictureTotal: number
  pictureTotalSize: number
}

/**
 * 图片和 markdown 的对应结果, 一个图片对应多个 markdown
 */
interface PicToMd {
  mds: PicToMdItem[]
}

interface PicToMdItem {
  id: string
}

/**
 * markdown 和图片的对应结果, 一个 markdown 对应多个图片
 */
interface MdToPic {
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
  type: 'picture'
  /** 图片 alt 文本 */
  alt: string
  /** 图片 URL */
  url: string
  /** 可选的标题 */
  title?: string
}

//#endregion

//#region 方法参数与返回值
export interface UpdatePicNameRes {
  markdownId: string
  pictures: { oldPicMdRaw: string; newPicMdRaw: string }[]
}
//#endreginn
