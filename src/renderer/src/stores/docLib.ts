import { defineStore } from 'pinia'
import { Local } from '@renderer/assets/utils/storage'

export const DOC_LIB_LIST_KEY = 'docLib_list'
export const DOC_LIB_CUR_KEY = 'docLib_cur'

export interface LibItems {
  items: DocLibItem[]
  cur?: DocLibItem
}


/**
 * 文档库配置
 */
export const useDocLibStore = defineStore('docLibStore', {
  state: (): LibItems => ({
    items: Local.get(DOC_LIB_LIST_KEY) || [],
    cur: {
      ...{
        name: '',
        path: '',
        icon: '',
        desc: '',
        creTime: ''
      },
      ...Local.get(DOC_LIB_CUR_KEY)
    }
  }),

  getters: {
    getCur: (state) => state.cur
  },
  actions: {
    // 添加一个文档库到 store 中, 并设为当前文档库.
    // 文档库的唯一键是文档的路径, 如果文档库已经存在, 则覆盖, 如果文档库在本地进行了重命名, 则 blossom 无法
    // 定位该文档, 该逻辑与 obsidian 相同
    addDocItem(docItem: DocLibItem) {
      let has = false
      for (const item in this.items) {
        const doc = this.items[item]
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
    setCurDoc(docItem: DocLibItem) {
      this.cur = docItem
      Local.set(DOC_LIB_CUR_KEY, this.cur)
    }
  }
})
