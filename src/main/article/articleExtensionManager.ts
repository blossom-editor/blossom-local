// 文章的拓展信息
import fs from 'fs'
import path from 'path'
import { sysFolder, articleExtensionFile } from '../doclib/docLibManager'

type ArticleExtension = Record<string, { words: Record<string, number> }>

export class ArticleExtensionManager {
  public articles: ArticleExtension | undefined
  public articleStats: Record<string, number> | undefined

  // 单例
  private static instance: ArticleExtensionManager
  public static getInstance(): ArticleExtensionManager {
    if (!ArticleExtensionManager.instance) {
      ArticleExtensionManager.instance = new ArticleExtensionManager()
    }
    return ArticleExtensionManager.instance
  }

  public async init(docLibPath: string) {
    const rawString = await fs.promises.readFile(path.join(docLibPath, sysFolder, articleExtensionFile), 'utf-8')
    this.articles = JSON.parse(rawString) as ArticleExtension // 类型断言
    console.log('文章扩展信息初始化完成', this.articles)
  }

  /**
   * 添加文件
   * @param file 文件
   */
  public async addWords(id: string, newWords: number, docLibPath: string) {
    if (!this.articles) {
      await this.init(docLibPath)
    }

    if (!this.articles) {
      return
    }

    const ym = new Date().toISOString().substring(0, 7)
    newWords = Math.max(newWords, 0)
    const article = this.articles[id]
    if (article) {
      const wordsList: Record<string, number> = (this.articles[id].words = this.articles[id].words)
      if (wordsList) {
        wordsList[ym] = newWords
      } else {
        this.articles[id] = { words: { [ym]: newWords } }
      }
    } else {
      this.articles[id] = { words: { [ym]: newWords } }
    }

    console.log(this.articles)
    fs.writeFileSync(path.join(docLibPath, sysFolder, articleExtensionFile), JSON.stringify(this.articles, null, 2))
  }

  /**
   * 删除文件
   * @param id 文件ID
   */
  public clear() {
    this.articles = undefined
  }
}
