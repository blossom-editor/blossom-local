const fs = require('fs').promises
const path = require('path')

// 请将 'your_test_directory' 替换为一个包含大量文件的真实目录路径
const testDir = 'Q:\\下载-edge\\图片'

async function benchmarkStat() {
  try {
    const files = await fs.readdir(testDir)
    // 只取前10000个文件进行测试，避免文件过多
    const targetFiles = files.slice(0, 10000)
    console.log(`准备测试 ${targetFiles.length} 个文件...`)

    const start = Date.now()
    const stats = await Promise.all(targetFiles.map((file) => fs.stat(path.join(testDir, file))))
    const end = Date.now()

    console.log(`完成 ${targetFiles.length} 次 fs.promises.stat 调用，耗时 ${end - start} 毫秒。`)
  } catch (error) {
    console.error('测试失败:', error)
  }
}

benchmarkStat()
