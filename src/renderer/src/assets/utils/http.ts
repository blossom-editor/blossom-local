// index.ts
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export class Request {
  /** axios 实例 */
  instance: AxiosInstance
  /** 基础配置，url和超时时间 */
  baseConfig: AxiosRequestConfig = { timeout: 60000 }

  /**
   * 构造方法中会设置拦截器逻辑，配置文件为可选项
   * @param config 配置文件内容，为可选项
   */
  constructor(config?: AxiosRequestConfig) {
    this.instance = axios.create(Object.assign(this.baseConfig, config))
    /** 请求拦截 */
    this.instance.interceptors.request.use(
      (config: AxiosRequestConfig): any => {
        config.headers = {
          ...config.headers
        }
        return config
      },
      (err: any) => {
        return Promise.reject(err)
      }
    )
    /** 响应拦截 */
    this.instance.interceptors.response.use(
      (res: AxiosResponse) => {
        return res
      },
      /** 返回非 200 接口 */
      (err: any) => {
        return Promise.reject(err)
      }
    )
  }

  // 定义请求方法
  public request(config: AxiosRequestConfig): Promise<any> {
    return this.instance.request(config)
  }

  public head(url: string, params?: object): Promise<any> {
    return this.instance.head(url, params)
  }

  public get(url: string, params?: object): Promise<any> {
    return this.instance.get(url, params)
  }

  public post(url: string, data?: object, config?: AxiosRequestConfig): Promise<any> {
    return this.instance.post(url, data, config)
  }

  public delete(url: string, params?: object): Promise<any> {
    return this.instance.delete(url, params)
  }
}

export const defaultRequest = new Request()
