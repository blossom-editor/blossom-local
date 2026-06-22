// 文章的拓展信息
import fs from 'fs'
import path from 'path'
import { BigIntStats } from 'fs'
import { sysFolder, docLibStatsFile, isSysFile } from './docLibManager'
import { countWords } from '../article/fileUtils'
import { nowYMD, nowYM } from '../date'
import { createDefaultBigIntStats, DEFAULT_ID, extractFileName, getUniqueId, isHttp, traceLog, warnLog } from '../utils'

/**
 * 文档库统计信息管理, 包含文档库的文章数统计, 图片数统计, 全量文档的文章和图片对应关系, 全量
 * 文档文章和链接对应关系
 */
export class DocLibStatsManager {
  /** 统计字段 */
  private stats: DocLibStats | undefined
  private docLibPath: string = ''

  /** 图片对应文章 picName: markdown 的 ID 集合 */
  private p2m: Map<string, PicToMd> = new Map()
  /** 文章对应图片 articleId: { picName: string;  picPath: string;  picMdRaw: string; } */
  private m2p: Map<string, MdToPic> = new Map()
  /** 文章对应的链接, articleId: { linkPath: string;  linkMdRaw: string; } */
  private m2m: Map<string, MdToLink> = new Map()

  private fileStatMap: Map<string, BigIntStats> = new Map()

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

  public getM2M(): Map<string, MdToLink> {
    return this.m2m
  }

  /**
   * 根据图片名称获取对应的文章信息
   * @param picName 图片名称
   * @returns
   */
  public getMdsByPic(picName: string): PicToMdItem[] {
    return this.p2m.get(picName)?.mds || []
  }

  /**
   * 统计文档库的统计信息
   * 在每次打开软件时刷新
   * 每次切换文档库时刷新
   * @param docLibPath 文档库路径
   */
  public async statsBegin(docLibPath: string): Promise<void> {
    // 三十秒一次
    // if (this.docLibPath === docLibPath && new Date().getTime() - this.lastInitStatsTime < 30 * 1000) {

    if (this.docLibPath === docLibPath) {
      return
    }

    this.docLibPath = docLibPath
    await this.init(docLibPath)

    this.m2p.clear()
    this.p2m.clear()
    this.m2m.clear()
    this.fileStatMap.clear()

    const temp: DocLibStats = {
      wordsByMonth: {},
      articleUpdByDay: {},
      articleTotal: 0,
      articleTotalWords: 0,
      pictureTotal: 0,
      pictureTotalSize: 0
    }

    await this.statsFileTreeRecursive(docLibPath, temp).then((temp: DocLibStats) => {
      this.stats!.articleTotal = temp.articleTotal
      this.stats!.articleTotalWords = temp.articleTotalWords
      this.stats!.pictureTotal = temp.pictureTotal
      this.stats!.pictureTotalSize = temp.pictureTotalSize
      this.stats!.wordsByMonth[nowYM()] = temp.articleTotalWords
      this.save(docLibPath)
      this.fileStatMap.clear()
    })
  }

  /**
   * 初始化
   * @param docLibPath 文档库路径
   */
  private async init(docLibPath: string): Promise<void> {
    this.stats = undefined
    // 读取配置文件
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
  }

  /**
   * 更新文章数, 图片数, 图片总大小
   * @param stats
   * @returns
   */
  public async updateStatsNumber(stats: DocLibStatsNumber) {
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
        const mdStat = await this.stat(mdPath)

        // 提取图片和链接
        await this.initExtracImagesAndLinks(mdStat, mdContent)

        // let start1 = new Date().getTime()
        let count = countWords(mdContent)
        temp.articleTotalWords += count
        temp.articleTotal += 1

        // end = new Date().getTime() - start1
        // console.log(`字数: ${count} 耗时: ${end} ms`)
        // console.log('=============================================================================================')
      } else {
        const fullPath = path.join(docLibPath, file.name)
        const stats = await this.stat(fullPath)
        temp.pictureTotal += 1
        temp.pictureTotalSize += Number(stats.size)
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
  private async initExtracImagesAndLinks(mdStat: BigIntStats, mdContent: string) {
    // ================= 提取链接 ================
    const markdownId = getUniqueId(mdStat)
    const links = extractImagesAndLinksFast(mdContent)
    const linkMatch = links.filter((item): item is LinkMatch => item.type === 'LINK')
    const pictureMatch = links.filter((item): item is ImageMatch => item.type === 'PICTURE')

    this.m2p.set(markdownId, { pics: [] }) // 清空该文章的图片映射关系
    this.m2m.set(markdownId, { links: [] }) // 清空该文章的链接映射关系
    this.initM2P_P2M(pictureMatch, markdownId)
    await this.initM2M(linkMatch, markdownId)
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
      let mdToPic: MdToPic = this.m2p.get(markdownId)!
      mdToPic.pics.push({ picName: picName, picPath: pic.url, picMdRaw: pic.raw })
      this.m2p.set(markdownId, mdToPic)

      // ========================================================================
      // 一张图片映射多个文章ID
      // ========================================================================
      // 图片名称: 文章[]
      let picToMd: PicToMd | undefined = this.p2m.get(picName)
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

      this.p2m.set(picName, picToMd)
    }
  }

  /**
   * 初始化文章和链接的关系
   * @param links 该文章的链接
   * @param markdownId 文章ID
   */
  private async initM2M(links: LinkMatch[], markdownId: string) {
    for (const link of links) {
      let m2m: MdToLink = this.m2m.get(markdownId)!

      let id: string
      let fullPath: string
      let type: ArticleRefNodeType = 'INNER_ARTICLE'

      if (isHttp(link.url) || link.url.startsWith(this.docLibPath)) {
        fullPath = link.url
        type = 'PUBLIC_ARTICLE'
        id = link.url
      } else {
        // 如果是内部文章, 但没有找到该文件, 则返回未知内部文章
        fullPath = path.join(this.docLibPath, link.url)
        id = getUniqueId(await this.stat(fullPath))
        if (id === DEFAULT_ID) {
          id = link.url
          type = 'UNKNOWN_INNER_ARTICLE'
        }
      }
      m2m.links.push({ markdownId: id, linkFullPath: fullPath, linkUrl: link.url, linkRaw: link.raw, type: type })
      this.m2m.set(markdownId, m2m)
    }
  }

  /**
   * 文章正文被修改时, 更新文章和图片的相互对应关系
   * 文章对应图片的关系与初始化时一样, 只有图片的逻辑不同
   *
   * @param pic 图片项
   * @param mdPath 文章的路径
   */
  public updateM2P_P2M_M2M(mdStat: BigIntStats, mdContent: string) {
    const markdownId = getUniqueId(mdStat)
    const links = extractImagesAndLinksFast(mdContent)
    const linkMatch = links.filter((item): item is LinkMatch => item.type === 'LINK')
    const pictureMatch = links.filter((item): item is ImageMatch => item.type === 'PICTURE')

    // ========================================================================
    // 一篇文章对应多个链接名称, 每次文章修改时重新赋值即可
    // ========================================================================
    this.m2m.delete(markdownId)
    for (const link of linkMatch) {
      let m2m: MdToLink = this.m2m.get(markdownId) || { links: [] }

      let id: string
      let fullPath: string
      let type: ArticleRefNodeType = 'INNER_ARTICLE'

      if (isHttp(link.url) || link.url.startsWith(this.docLibPath)) {
        fullPath = link.url
        type = 'PUBLIC_ARTICLE'
        id = link.url
      } else {
        // 如果是内部文章, 但没有找到该文件, 则返回未知内部文章
        fullPath = path.join(this.docLibPath, link.url)
        try {
          id = getUniqueId(fs.statSync(fullPath, { bigint: true }))
        } catch (e) {
          id = link.url
          type = 'UNKNOWN_INNER_ARTICLE'
        }
      }
      m2m.links.push({ markdownId: id, linkFullPath: fullPath, linkUrl: link.url, linkRaw: link.raw, type: type })
      this.m2m.set(markdownId, m2m)
    }

    // 清空该文章的图片映射关系
    this.m2p.delete(markdownId)
    // ========================================================================
    // 一篇文章对应多个图片名称, 每次文章修改时重新赋值即可
    // ========================================================================
    for (const pic of pictureMatch) {
      const picName = extractFileName(pic.url) // 从链接中获取图片的文件名
      let m2p: MdToPic = this.m2p.get(markdownId) || { pics: [] }
      m2p.pics.push({ picName: picName, picPath: pic.url, picMdRaw: pic.raw })
      this.m2p.set(markdownId, m2p)
    }

    // ========================================================================
    // 一张图片映射多个文章ID
    // ========================================================================
    // 文章变更后, 关联的图片名称
    const newPicNames: string[] = pictureMatch.map((p) => extractFileName(p.url))
    // 文章修改前, 关联的图片名称
    const oldPicNames: string[] = findPicNamesByMarkdownId(this.p2m, markdownId)
    // 变更后, 如果删除了某个图片, 获取删除的图片名
    const deletePicNames = oldPicNames.filter((oldPicName) => !newPicNames.includes(oldPicName))
    // 被删除的图片, 不再关联此文章
    for (const deletePicName of deletePicNames) {
      const markdowns: PicToMd | undefined = this.p2m.get(deletePicName)
      if (!markdowns || !markdowns.mds || markdowns.mds.length === 0) {
        continue
      }
      const index = markdowns.mds.findIndex((md) => md.id === markdownId)
      if (index !== -1) {
        markdowns.mds.splice(index, 1)
      }
    }

    // 新引用的图片, 添加到图片的关联文章中
    for (const picName of newPicNames) {
      // 图片名称: 文章[]
      let picToMd: PicToMd | undefined = this.p2m.get(picName)
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
      this.p2m.set(picName, picToMd)
    }
  }

  /**
   * 重命名, 移动时调用
   *
   * @param mdId 被重命名的文章ID
   * @param oldMdPath 被重命名的文章旧路径
   * @param newMdPath 被重命名的文章新路径
   */
  public updateMdName(mdId: string, oldMdPath: string, newMdPath: string): UpdateMdNameRes[] {
    // 文章本身引用其他的路径不修改
    // const links: MdToLink | undefined = this.m2m.get(mdId)
    // 关联该文章的文章, 路径要进行修改
    const relativeOldPath = path.relative(this.docLibPath, oldMdPath) // 旧路径的相对文档库绝对路径
    const relativeNewPath = path.relative(this.docLibPath, newMdPath) // 新路径的相对文档库绝对路径

    const results: UpdateMdNameRes[] = []
    // 所有使用了旧路径的文章, 引用该文章的图片路径也要进行修改
    this.m2m.forEach((links, _mdId) => {
      if (links.links.length === 0) {
        return
      }

      const result: UpdateMdNameRes = {
        markdownId: _mdId,
        markdowns: []
      }

      for (const link of links.links) {
        // 如果被引用的文章路径等于本次修改的文章路径
        if (link.markdownId === mdId) {
          // 如果被引用的文章ID等于本次修改的文章ID
          result.markdowns.push({
            oldLinkRaw: link.linkRaw,
            newLinkRaw: path.normalize(link.linkRaw).replaceAll(relativeOldPath, relativeNewPath)
          })
        }
      }

      if (result.markdowns.length > 0) {
        results.push(result)
      }
    })
    return results
  }

  /**
   * 文章删除
   * 清空文章 ID 为 key 的所有信息
   * 删除文章完整路径被关联的信息
   */
  public deleteM2M() {}

  /**
   * 修改图片名称时调用
   *
   * @param oldPicName
   * @param newPicName
   * @return 图片对应的文章ID
   */
  public updatePicName(oldPicName: string, newPicName: string): UpdatePicNameRes[] | undefined {
    const markdowns: PicToMd | undefined = this.p2m.get(oldPicName)
    if (markdowns === undefined) {
      return
    }

    const results: UpdatePicNameRes[] = []

    // 1. 将文章关联到新图片名称
    this.p2m.delete(oldPicName)
    this.p2m.set(newPicName, markdowns)

    // 2. 修改文章中对应的图片名称和地址
    const markdownIds: string[] = markdowns.mds.map((md) => md.id)
    for (const markdownId of markdownIds) {
      const mdToPic: MdToPic | undefined = this.m2p.get(markdownId)
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
   * 删除图片对应的文章信息, 只发生在图片删除时
   *
   * 由于图片有关联的文章时, 不允许删除, 所以删除图片时直接清除图片对应的文章信息即可
   */
  public deleteP2M(picName: string) {
    this.p2m.delete(picName)
  }

  public log() {
    warnLog('\n\n\n\n===============================================================================================================================')
    warnLog('* 文章对应的图片 / 图片对应的文章')
    warnLog('===============================================================================================================================')
    // warnLog('=====< 下列是文章对应的链接 >======================================================================================================')
    // this.m2m.forEach((m2m, key) => {
    //   console.log(`文档: [${key}] 包含 ${m2m.links.length} 个链接:`)
    //   m2m.links.forEach((link) => console.log(`  - ID: ${link.markdownId} 地址: ${link.linkFullPath}, 链接: ${link.linkUrl}  结构: ${link.linkRaw}`))
    //   traceLog('------------------------------------------------------------------------------')
    // })
    warnLog('=====< 下列是文章对应的图片 >======================================================================================================')
    this.m2p.forEach((m2p, key) => {
      console.log(`文档: [${key}] 包含 ${m2p.pics.length} 张图片:`)
      m2p.pics.forEach((pic) => console.log(`  - 名称: ${pic.picName}  路径: ${pic.picPath}  结构: ${pic.picMdRaw}`))
      traceLog('------------------------------------------------------------------------------')
    })
    // warnLog('=====< 下列是图片对应的文章 >======================================================================================================')
    // this.p2m.forEach((p2m, key) => {
    //   console.log(`图片: [${key}] 包含 ${p2m.mds.length} 个文章:`)
    //   p2m.mds.forEach((md) => console.log(`  - 文章: ${md.id}`))
    //   traceLog('------------------------------------------------------------------------------')
    // })
  }

  /**
   * 获取文件信息, 并缓存
   */
  private async stat(path: string): Promise<fs.BigIntStats> {
    if (this.fileStatMap.has(path)) {
      return this.fileStatMap.get(path)!
    }
    try {
      const stat = await fs.promises.stat(path, { bigint: true })
      this.fileStatMap.set(path, stat)
      return stat
    } catch {
      return new Promise((resolve) => resolve(createDefaultBigIntStats()))
    }
  }
}

/**
 * 获取 markdownId 使用的所有图片名
 *
 * @param map
 * @param markdownId
 * @returns
 */
function findPicNamesByMarkdownId(map: Map<string, PicToMd>, markdownId: string): string[] {
  const keys: string[] = []
  for (const [picName, value] of map.entries()) {
    for (const p2cItem of value.mds) {
      if (p2cItem.id === markdownId) {
        keys.push(picName)
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
      type: isPicture ? 'PICTURE' : 'LINK',
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
 *
 */
interface PicToMd { mds: PicToMdItem[] } // prettier-ignore
interface PicToMdItem { id: string; } //prettier-ignore

/**
 * markdown 和图片的对应结果, 一个 markdown 对应多个图片
 */
interface MdToPic { pics: MdToPicItem[] } // prettier-ignore
interface MdToPicItem { picName: string; picPath: string; picMdRaw: string; } // prettier-ignore

/**
 * markdown 和链接的对应结果, 一个 markdown 对应多个链接
 * 链接的主键为拼接了文档库路径的 linkPath
 */
export interface MdToLink { links: MdToLinkItem[] } // prettier-ignore
export interface MdToLinkItem {
  markdownId: string
  linkFullPath: string
  linkUrl: string
  linkRaw: string
  type: ArticleRefNodeType
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
  type: 'LINK'
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
  type: 'PICTURE'
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

export interface UpdateMdNameRes {
  markdownId: string
  markdowns: { oldLinkRaw: string; newLinkRaw: string }[]
}

//#endreginn
