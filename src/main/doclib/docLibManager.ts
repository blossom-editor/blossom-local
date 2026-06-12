export const sysFolder = '.blossom'

/**
 * 系统配置文件
 */
export const sysConfigFile = 'blossom.json'

/**
 * 文章的拓展信息文件
 */
export const articleExtensionFile = 'article-extension.json'

/**
 * 文档库统计文件
 */
export const docLibStatsFile = 'doclib-stats.json'

/**
 * 系统文件
 * .blossom 系统文件文件夹
 * .obsidian obsidian 文件夹
 */
export const SysFile: string[] = [sysFolder, '.obsidian']

/**
 * 判断是否是系统文件
 * @param pathName 文件路径
 * @returns
 */
export const isSysFile = (pathName: string) => {
  return SysFile.includes(pathName)
}
