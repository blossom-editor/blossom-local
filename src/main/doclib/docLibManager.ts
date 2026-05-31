export const sysFolder = '.blossom'
export const sysConfigFile = 'blossom.json'
export const articleExtensionFile = 'article-extension.json'
export const docLibStatsFile = 'doclib-stats.json'

// 系统文件
// .blossom 系统文件文件夹
export const SysFile: string[] = [sysFolder, '.obsidian']

/**
 * 判断是否是系统文件
 * @param pathName 文件路径
 * @returns
 */
export const isSysFile = (pathName: string) => {
  return SysFile.includes(pathName)
}
