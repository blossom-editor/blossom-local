import Notify from '@renderer/scripts/notify'
import { Local } from '@renderer/assets/utils/storage'
import { DOC_LIB_CUR_KEY } from '@renderer/stores/docLib'
import { isBlank, isNull } from '@renderer/assets/utils/obj'
import router from '@renderer/router'

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
  console.log(`==================================< 请求拦截器 ${channel} >==================================`)
  // 在文档库内的请求
  if (inDocLibRequest(args)) {
    const docLib = Local.get(DOC_LIB_CUR_KEY)
    if (docLib === undefined || isBlank(docLib.path)) {
      console.error(`未选择文档库: ${channel}`)
      Notify.info('', '请选择文档库')
      router.push('/settingIndex')
      return {
        ok: false,
        code: '00001',
        msg: '未选择文档库'
      }
    }
    const docLibPath = docLib.path
    const base: Base = { docLibPath: docLibPath, outsideDocLib: false }

    if (isNull(args)) {
      args = [base]
    }

    if (args.length === 0) {
      args.push(base)
    }

    // 为对象添加 docLibPath 参数
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === undefined) {
        args[i] = base
      } else if (arg && arg.docLibPath === undefined) {
        args[i] = { docLibPath: docLibPath, ...arg }
      }
    }
  } else {
    console.log(`非文档库内接口: ${channel}`)
  }

  try {
    console.warn(`[IPC >>>> ${channel} ] `, args)
    const r: R<any> = await rawInvoke(channel, ...args)
    console.warn(`[IPC <<<< ${channel} ] `, r)

    if (!isSuccessR(r)) {
      Notify.error(r.msg, r.code)
      return Promise.reject(r)
    }
    return r
  } catch (err: unknown) {
    console.error(`[IPC Error] ${channel}`, err)
    const message = err instanceof Error ? err.message : String(err)
    Notify.error(message, '处理失败')
    const r: R<any> = {
      ok: false,
      code: '系统错误',
      msg: message,
      data: null
    }
    return Promise.reject(r)
  }
}

/**
 * 判断是否是文档库内的请求, 如果 outsideDocLib = false, 则为文档库请求
 * @param args
 * @returns
 */
const inDocLibRequest = (...args: any[]): boolean => {
  let inDocLib = true
  if (isNull(args)) {
    inDocLib = true
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    // 如果参数中包含 outsideDocLib 参数，且值为 true，则表示当前请求不在文档库中
    if (arg && arg['outsideDocLib'] !== undefined && arg['outsideDocLib']) {
      inDocLib = false
      break
    }
  }
  return inDocLib
}

/**
 * 判断接口响应码是否正确
 * @param code 接口响应码
 * @returns
 */
const isSuccessR = (r: R<any>): boolean => {
  if (!r) {
    return false
  }
  return r.code === '20000'
}
