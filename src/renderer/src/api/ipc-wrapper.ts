import Notify from '@renderer/scripts/notify'

// 获取 preload 暴露的 invoke 函数
const rawInvoke = (window.electronAPI as any)?.invoke
if (!rawInvoke) {
  throw new Error('Electron API not found')
}

/**
 * 带拦截器的 invoke 调用
 * @param {string} channel - IPC 通道名
 * @param  {...any} args - 参数
 * @returns {Promise<any>}
 */
export const invoke = async (channel: string, ...args: any[]): Promise<any> => {
  try {
    console.log(`[IPC 请求: ${channel} ] `, args)
    const r: R<any> = await rawInvoke(channel, ...args)
    console.log(`[IPC 响应 : ${channel} ] `, r)

    if (r && r.code !== undefined && r.code !== 20000) {
      Notify.error(r.msg, '处理失败')
    }
    return r
    // return new Promise((resolve, reject) => {
    //   resolve(r)
    // })
  } catch (error: unknown) {
    console.error(`[IPC Error] ${channel}`, error)
    const message = error instanceof Error ? error.message : String(error)
    Notify.error(message, '处理失败')
    throw error
  }
}
