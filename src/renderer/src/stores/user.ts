import { defineStore } from 'pinia'
import { Local } from '@renderer/assets/utils/storage'
import { loginApi, logoutApi, checkApi, userinfoApi } from '@renderer/api/auth'
import { setUserinfo } from '@renderer/assets/utils/electron'

export const storeKey = 'token'
export const userinfoKey = 'userinfo'
/**
 * blossom 对象存储域名参数名, 其值与后台的 `--project.iaas.blos.domain` 相同
 */
export const KEY_BLOSSOM_OBJECT_STORAGE_DOMAIN: string = 'BLOSSOM_OBJECT_STORAGE_DOMAIN'
/**
 * 博客访问地址参数名
 */
export const KEY_WEB_ARTICLE_URL: string = 'WEB_ARTICLE_URL'

/**
 * 登录状态枚举
 */
export const enum AuthStatus {
  Wait = '请登录',
  Loging = '登录中...',
  Checking = '检查登录...',
  Succ = '已登录',
  Fail = '登录失败'
}

/**
 * 初始化登录状态
 */
const initAuth = () => {
  let auth = {
    token: '',
    status: AuthStatus.Wait
  }
  Local.set(storeKey, auth)
  return auth
}

/**
 * 默认用户信息
 */
export const DEFAULT_USER_INFO = {
  id: '1',
  type: 2,
  username: '用户A',
  nickName: '用户A',
  avatar: '',
  remark: '',
  articleCount: 0,
  articleWords: 0,
  location: '',
  creTime: '',
  delTime: '',
  osRes: {
    osType: '',
    bucketName: '',
    domain: '',
    defaultPath: ''
  },
  /**
   * 服务器参数配置
   */
  params: {
    /**
     * @deprecated 1.12.0 该字段已不使用, 博客地址改用 userParams.WEB_ARTICLE_URL, 使用该地址会报错
     */
    WEB_ARTICLE_URL: '',
    BACKUP_PATH: '',
    BACKUP_EXP_DAYS: '',
    ARTICLE_LOG_EXP_DAYS: '',
    ARTICLE_RECYCLE_EXP_DAYS: '',
    HEFENG_KEY: '',
    HEFENG_HOST: '',
    HEFENG_ENABLED: '1',
    BLOSSOM_OBJECT_STORAGE_DOMAIN: '',
    SENTINEL_ENABLED: '1',
    SERVER_MACHINE_EXPIRE: '',
    SERVER_DATABASE_EXPIRE: '',
    SERVER_HTTPS_EXPIRE: '',
    SERVER_DOMAIN_EXPIRE: '',
    SERVER_VERSION: ''
  },
  /**
   * 用户参数配置
   */
  userParams: {
    WEB_ARTICLE_URL: '',
    WEB_IPC_BEI_AN_HAO: '',
    WEB_LOGO_NAME: '',
    WEB_LOGO_URL: '',
    WEB_GONG_WANG_AN_BEI: '',
    WEB_BLOG_URL_ERROR_TIP_SHOW: 1,
    WEB_BLOG_LINKS: '',
    WEB_BLOG_SUBJECT_TITLE: false,
    WEB_BLOG_COLOR: '',
    WEB_BLOG_SHOW_ARTICLE_NAME: true,
    WEB_BLOG_WATERMARK_ENABLED: false,
    WEB_BLOG_WATERMARK_CONTENT: '',
    WEB_BLOG_WATERMARK_FONTSIZE: 15,
    WEB_BLOG_WATERMARK_COLOR: '',
    WEB_BLOG_WATERMARK_GAP: 100
  }
}

export type Userinfo = typeof DEFAULT_USER_INFO

/**
 * 初始化用户默认值
 * 用户配置会缓存在 localStorage 中, 但每次登录都会重新设置, 只要服务端返回默认值, 就不需要合并数据
 */
const initUserinfo = (): Userinfo => {
  Local.set(userinfoKey, { ...DEFAULT_USER_INFO })
  return { ...DEFAULT_USER_INFO }
}

/**
 * 用户和登录信息存储
 */
export const useUserStore = defineStore('userStore', {
  state: () => ({
    /**
     * 用户登录状态
     */
    auth: Local.get(storeKey) || initAuth(),
    /**
     * 用户信息与用户参数配置, 服务器参数配置
     */
    userinfo: (Local.get(userinfoKey) as Userinfo) || initUserinfo()
  }),
  getters: {
    currentUserId(state) {
      return state.userinfo.id
    },
    /**
     * 是否登录
     */
    isLogin(state) {
      // return state.auth.status === AuthStatus.Succ
      return true
    },
    /**
     * 获取系统个人配置信息
     */
    sysParams(state) {
      return state.userinfo.params
    },
    /**
     * 获取用户个人配置信息
     */
    userParams(state) {
      return state.userinfo.userParams
    },
    /**
     * 必要参数配置是否正确
     * @returns true: 参数校验正确, 或者无需校验
     *          false: 参数校验不正确
     */
    paramIsCorrect: (state): boolean => {
      // if (state.auth.status !== AuthStatus.Succ) {
      //   return true
      // }
      return true
    }
  },
  actions: {
    /**
     * 根据用户名密码登录
     * @param username 用户名
     * @param password 密码
     */
    async loginByPassword(username: string, password: string) {
      this.auth.status = AuthStatus.Loging
      let auth = { token: '123123', status: AuthStatus.Succ }
      this.auth = auth
      Local.set(storeKey, auth)
      this.getUserinfo()
    },
    /**
     * 退出登录
     */
    async logout() {},
    /**
     * 检查登录状态
     */
    async checkToken(succ: any, fail: any) {
      this.auth.status = AuthStatus.Succ
      Local.set(storeKey, { token: "1", status: AuthStatus.Succ })
      this.getUserinfo()
    },
    /**
     * 获取用户信息
     */
    getUserinfo() {
      this.userinfo = DEFAULT_USER_INFO
      Local.set(userinfoKey, DEFAULT_USER_INFO)
      setUserinfo(DEFAULT_USER_INFO)
    },
    /**
     * 重置登录状态和用户信息
     */
    reset() {
      Local.remove(storeKey)
      Local.remove(userinfoKey)
      this.auth = initAuth()
      this.userinfo = initUserinfo()
    }
  }
})
