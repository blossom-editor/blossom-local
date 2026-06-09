// 文章的拓展信息
import fs from 'fs'
import path from 'path'
import { sysFolder, docLibStatsFile } from './docLibManager'
import { countWords } from '../article/fileUtils'
import { nowYMD, nowYM } from '../date'

type DocLibStats = {
  /**
   * 每月字数, 在选择文档库时刷新
   */
  wordsByMonth: Record<string, number>
  /**
   * 当天修改的文章数, 每次刷新文章列表时更新
   */
  articleUpdByDay: Record<string, number>
  /**
   * 文章总数, 在选择文档库时刷新
   */
  articleTotal: number
  /**
   * 文章总字数, 在选择文档库时刷新
   */
  articleTotalWords: number
}

/**
 * 文档库统计信息管理
 */
export class DocLibStatsManager {
  private stats: DocLibStats | undefined
  private static instance: DocLibStatsManager
  public static getInstance(): DocLibStatsManager {
    if (!DocLibStatsManager.instance) {
      DocLibStatsManager.instance = new DocLibStatsManager()
    }
    return DocLibStatsManager.instance
  }

  public async getStats(docLibPath: string): Promise<DocLibStats> {
    await this.checkInit(docLibPath)
    return this.stats!
  }

  private async init(docLibPath: string) {
    const rawString = await fs.promises.readFile(path.join(docLibPath, sysFolder, docLibStatsFile), 'utf-8')
    this.stats = JSON.parse(rawString) as DocLibStats // 类型断言
    if (this.stats.articleTotal === undefined) {
      this.stats.articleTotal = 0
    }

    // 未定义的配置项初始化, 如果有新的配置项, 在此添加
    if (this.stats.articleTotalWords === undefined) {
      this.stats.articleTotalWords = 0
    }
    if (this.stats.wordsByMonth === undefined) {
      this.stats.wordsByMonth = {}
    }
    if (this.stats.articleUpdByDay === undefined) {
      this.stats.articleUpdByDay = {}
    }
    // this.stats.articleUpdByDay[nowYMD()] = 0
  }

  private async checkInit(docLibPath: string) {
    if (!this.stats) {
      await this.init(docLibPath)
    }
    if (!this.stats) {
      return
    }
  }

  /**
   * 持久化当前统计信息
   * @returns
   */
  public async save(docLibPath: string) {
    if (!this.stats) {
      return
    }
    fs.writeFileSync(path.join(docLibPath, sysFolder, docLibStatsFile), JSON.stringify(this.stats, null, 2))
    // console.log('持久化文档库统计(docLib stats)', this.stats)
    // console.log('============================================================')
  }

  /**
   * 统计文档库的统计信息, 在每次打开软件时刷新
   * @param docLibPath 文档库路径
   */
  public async statsBegin(docLibPath: string) {
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
      articleTotalWords: 0
    }

    this.statsFileTreeRecursive(docLibPath, temp).then((temp: DocLibStats) => {
      this.stats!.articleTotal = temp.articleTotal
      this.stats!.articleTotalWords = temp.articleTotalWords
      this.stats!.wordsByMonth[nowYM()] = temp.articleTotalWords
      this.save(docLibPath)
    })
  }

  private async statsFileTreeRecursive(docLibPath: string, temp: DocLibStats) {
    const files = await fs.promises.readdir(docLibPath, { withFileTypes: true })

    for (const file of files) {
      // 只显示文件夹和 md 文件
      if (file.isDirectory()) {
        this.statsFileTreeRecursive(path.join(docLibPath, file.name), temp)
      } else if (file.name.endsWith('.md')) {
        const fullPath = path.join(docLibPath, file.name)
        const data = await fs.promises.readFile(fullPath, 'utf8')
        temp.articleTotal += 1
        temp.articleTotalWords += countWords(data)
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
}
