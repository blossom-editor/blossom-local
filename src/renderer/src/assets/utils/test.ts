/**
 * 从文件路径中提取目录部分
 * 如果传入的是文件, 则返回文件所在的文件夹
 * 如果传入的是个文件夹路径, 则不做修改返回文件夹路径
 */
export function getDirPath(filePath: string): string {
  const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')) + 1
  if (lastSlashIndex === -1) {
    return ''
  }
  return filePath.substring(0, lastSlashIndex)
}

/**
 * 从文件路径中提取父目录部分
 * 如果传入的是文件, 则返回文件所在的文件夹
 * 如果传入的是文件夹, 则返回文件夹所在的文件夹
 */
export function getParentDirPath(filePath: string): string {
  const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')) + 1
  if (lastSlashIndex === -1) {
    return ''
  }
  return filePath.substring(0, lastSlashIndex)
}

console.log(getDirPath('F:\\WebProjects\\blossom-demo-workspace\\1.md'))
