import { defineStore } from 'pinia'
import { Local } from '@renderer/assets/utils/storage'
import { isNotBlank, isNull } from '@renderer/assets/utils/obj'

export const DOC_LIB_LIST_KEY = 'docLib_list'
export const DOC_LIB_CUR_KEY = 'docLib_cur'

export interface LibItems {
  items: DocLibItem[]
  cur?: DocLibItem
}

// /**
//  * @deprecated
//  */
// const initCurDocLib = (): DocLibItem => {
//   // 从浏览器 storage 中获取保存的最近一次文档库, 作为默认文档库
//   const cur = Local.get(DOC_LIB_CUR_KEY)
//   if (cur && !isBlank(cur.path)) {
//     checkDocLibConfigApi({ docLibPath: cur.path })
//   }
//   return cur
// }

/**
 * 文档库配置
 */
export const useDocLibStore = defineStore('docLibStore', {
  state: (): LibItems => ({
    items: (Local.get(DOC_LIB_LIST_KEY) as DocLibItem[]) || ([] as DocLibItem[]),
    cur: {
      ...{
        name: '未选择文档库',
        path: '',
        icon: '',
        desc: '',
        isTop: false,
        creTime: ''
      }
      // ...initCurDocLib()
    }
  }),

  getters: {
    getCur: (state) => state.cur,
    /**
     * 是否选择了文档库
     */
    isLogin: (state) => {
      if (state.cur && isNotBlank(state.cur.path)) {
        return true
      }
      return false
    }
  },
  actions: {
    setCurDoc(docItem: DocLibItem) {
      this.cur = { ...docItem }
      Local.set(DOC_LIB_CUR_KEY, docItem)
    },
    /**
     * 添加一个文档库到 store 中, 并设为当前文档库.
     * 文档库的唯一键是文档的路径, 如果文档库已经存在, 则覆盖, 如果文档库在本地进行了重命名, 则 blossom 无法
     * 定位该文档, 该逻辑与 obsidian 相同
     * @param docItem
     */
    addDocItem(docItem: DocLibItem) {
      if (isNull(docItem) || isNull(docItem.name) || isNull(docItem.path)) {
        return
      }
      let has = false
      for (const index in this.items) {
        const doc = this.items[index]
        if (doc.path === docItem.path) {
          doc.name = docItem.name
          doc.icon = docItem.icon
          doc.desc = docItem.desc
          doc.creTime = docItem.creTime
          has = true
        }
      }
      if (!has) {
        this.items.push(docItem)
      }
      Local.set(DOC_LIB_LIST_KEY, this.items)
      this.setCurDoc(docItem)
    },
    /**
     * 更新一个文档库到 store 中
     */
    updItem(docItem: DocLibItem) {
      if (isNull(docItem) || isNull(docItem.name) || isNull(docItem.path)) {
        return
      }
      let has = false
      for (const i in this.items) {
        const doc = this.items[i]
        if (doc.path === docItem.path) {
          doc.name = docItem.name
          doc.icon = docItem.icon
          doc.desc = docItem.desc
          doc.creTime = docItem.creTime
          has = true
        }
      }
      if (!has) {
        this.items.push(docItem)
      }
      Local.set(DOC_LIB_LIST_KEY, this.items)
    },
    /**
     * 删除一个文档库
     */
    delItem(docItem: DocLibItem) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        if (this.items[i].path === docItem.path) {
          this.items.splice(i, 1)
        }
      }
      // 如果删除的是当前文档, 当前文档重设成未选择
      if (this.cur) {
        if (docItem.path === this.cur.path) {
          this.cur = {
            name: '未选择文档库',
            path: '',
            icon: '',
            desc: '',
            isTop: false,
            creTime: ''
          }
        }
        Local.remove(DOC_LIB_CUR_KEY)
      }

      Local.set(DOC_LIB_LIST_KEY, this.items)
    },
    toTop(docItem: DocLibItem) {
      if (isNull(docItem) || isNull(docItem.name) || isNull(docItem.path)) {
        return
      }

      docItem.isTop = !docItem.isTop

      for (const i in this.items) {
        const doc = this.items[i]
        if (docItem.path === doc.path) {
          this.items[i] = { ...docItem }
        }
      }
      Local.set(DOC_LIB_LIST_KEY, this.items)
      if (this.cur) {
        if (docItem.path === this.cur.path) {
          this.cur.isTop = !this.cur.isTop
        }
        Local.set(DOC_LIB_CUR_KEY, docItem)
      }
    }
  }
})
