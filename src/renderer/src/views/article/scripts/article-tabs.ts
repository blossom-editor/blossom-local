import { computed, ref } from 'vue'
import { Local } from '@renderer/assets/utils/storage'
import { useDocLibStore } from '@renderer/stores/docLib'

/**
 * 已打开文章的标签页
 *
 * 这里只是一个「最近打开过的文档列表」：点击标签页不负责加载文章，
 * 而是通过 openRequest 把请求交给文档树，由它走与「点击树节点」完全相同的路径。
 */

/** 标签页停靠位置 */
export type TabPosition = 'top' | 'left'

/** 一个标签页, name 为无后缀名称(与文档树显示保持一致) */
export interface TabItem {
  id: string
  name: string
  path: string
  /** 置顶: 右键菜单里的关闭(含左右/全部)不会动它, 只能用标签上的 x 关 */
  pinned?: boolean
}

/** 文档库路径 -> 该库的标签页列表 */
type TabsStore = Record<string, TabItem[]>

const TABS_KEY = 'article_tabs'
const POSITION_KEY = 'article_tabs_position'
const LEFT_WIDTH_KEY = 'article_tabs_left_width'

/** 左侧标签条的宽度范围(px) */
const MIN_LEFT_WIDTH = 150
const MAX_LEFT_WIDTH = 350
const DEFAULT_LEFT_WIDTH = 200

const clampWidth = (width: number): number => Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, Math.round(width)))

/**
 * 置顶标签必须排在队首
 *
 * 拖动限制、以及「取消置顶挪到最后一个置顶标签之后」都依赖这个前提。
 * 老版本数据里可能存在置顶标签散落在中间的排列, 读取时先稳定地分流一次。
 */
const pinnedFirst = (list: TabItem[]): TabItem[] => [...list.filter((tab) => tab.pinned), ...list.filter((tab) => !tab.pinned)]

/**
 * 读取历史数据时做一次容错
 * localStorage 是用户可改、跨版本残留的地方, 脏数据不应该把页面搞崩
 */
const normalizeStore = (raw: unknown): TabsStore => {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: TabsStore = {}
  Object.entries(raw as Record<string, unknown>).forEach(([libPath, value]) => {
    if (!Array.isArray(value)) return
    result[libPath] = pinnedFirst(
      value
        .filter((tab): tab is TabItem => tab != null && typeof tab === 'object' && typeof (tab as TabItem).id === 'string')
        .map((tab) => ({ id: tab.id, name: tab.name ?? '', path: tab.path ?? '', pinned: tab.pinned === true }))
    )
  })
  return result
}

const tabStore = ref<TabsStore>(normalizeStore(Local.get(TABS_KEY)))

/**
 * 当前文档库路径
 *
 * ⚠️ useDocLibStore() 只能在函数/computed 里调用: 本模块在 pinia 安装前就被 import 了
 */
const libPath = (): string => useDocLibStore().cur?.path ?? ''

/** 空列表用固定引用, 避免没有文档库时每次求值都产生新数组 */
const EMPTY_TABS: TabItem[] = []

/** 当前文档库的标签页 */
export const tabs = computed<TabItem[]>(() => {
  const path = libPath()
  return path ? (tabStore.value[path] ?? EMPTY_TABS) : EMPTY_TABS
})

/** 标签页停靠位置 */
export const position = ref<TabPosition>(Local.get(POSITION_KEY) === 'left' ? 'left' : 'top')

/** 左侧标签条宽度 */
export const leftWidth = ref<number>(clampWidth(Number(Local.get(LEFT_WIDTH_KEY)) || DEFAULT_LEFT_WIDTH))

/**
 * 当前激活的标签页 id
 *
 * 刻意不持久化: 重启后正文是空的, 此时还高亮某个标签反而误导
 */
const activeByLib = ref<Record<string, string>>({})

export const activeId = computed<string>(() => {
  const path = libPath()
  return path ? (activeByLib.value[path] ?? '') : ''
})

const persist = (): void => Local.set(TABS_KEY, tabStore.value)

/** 取得当前文档库的标签数组, 未选择文档库时返回 undefined */
const ensureLibTabs = (): TabItem[] | undefined => {
  const path = libPath()
  if (!path) return undefined
  if (!tabStore.value[path]) tabStore.value[path] = []
  return tabStore.value[path]
}

const setActive = (id?: string): void => {
  const path = libPath()
  if (!path) return
  if (!id) {
    delete activeByLib.value[path]
    return
  }
  if (activeByLib.value[path] === id) return
  activeByLib.value[path] = id
}

//#region ----------------------------------------< 打开请求 >--------------------------------------

let requestSeq = 0

/**
 * 标签页 -> 文档树的单向「请打开这篇文章」信号
 *
 * 只有 activateTab / closeTab 会写它, ArticleTreeDocs 监听它, 然后由文档树走与
 * 「点击树节点」完全相同的路径去加载文章 —— 这里不重复实现任何加载逻辑。
 *
 * 千万不要写成 watch(activeId) => requestOpen(): 关闭标签时会发出 id 为空的脏请求,
 * 并且会与 curArticle 的同步互相拉锯。
 */
export const openRequest = ref<{ id: string; seq: number } | null>(null)

const requestOpen = (id: string): void => {
  openRequest.value = { id, seq: ++requestSeq }
}

//#endregion

/**
 * 记录一个标签页
 *
 * 已存在时只更新名称与路径, 不改变顺序(保留用户拖拽后的排列)
 */
export const trackTab = (doc: TabItem): void => {
  const list = ensureLibTabs()
  if (!list) return
  const exist = list.find((tab) => tab.id === doc.id)
  if (exist) {
    if (exist.name !== doc.name || exist.path !== doc.path) {
      exist.name = doc.name
      exist.path = doc.path
      persist()
    }
  } else {
    list.push({ id: doc.id, name: doc.name, path: doc.path })
    persist()
  }
  setActive(doc.id)
}

/** 点击标签页: 先乐观高亮, 再请文档树打开 */
export const activateTab = (id: string): void => {
  setActive(id)
  requestOpen(id)
}

/**
 * 批量移除标签
 *
 * @param ids 候选标签
 * @param skipPinned 是否跳过置顶标签（右键菜单里的关闭全部跳过，标签上的 x 不跳过）
 */
const removeTabs = (ids: string[], skipPinned: boolean): void => {
  const list = ensureLibTabs()
  if (!list || ids.length === 0) return
  const targets = new Set(ids)
  // 记住激活项的原位置：关完之后由「原位置上的标签」顶上，也就是它的右侧邻居
  const activeIndex = list.findIndex((tab) => tab.id === activeId.value)
  let removed = false
  let removedActive = false
  for (let i = list.length - 1; i >= 0; i--) {
    const tab = list[i]
    if (!targets.has(tab.id)) continue
    if (skipPinned && tab.pinned) continue
    // 倒序删除，比 i 小的下标不受影响，所以可以直接和原位置比较
    if (i === activeIndex) removedActive = true
    list.splice(i, 1)
    removed = true
  }
  if (!removed) return
  persist()
  if (!removedActive) return
  const next = list[activeIndex] ?? list[list.length - 1]
  if (next) {
    setActive(next.id)
    requestOpen(next.id)
  } else {
    setActive('')
  }
}

/**
 * 关闭标签页（标签上的 x、鼠标中键）
 *
 * 这里不跳过置顶标签：置顶只是挡住右键菜单的批量关闭，单独关一个是明确意图
 */
export const closeTab = (id: string): void => removeTabs([id], false)

/** 右键菜单：关闭（置顶标签不动） */
export const closeTabByMenu = (id: string): void => removeTabs([id], true)

/** 右键菜单：关闭其他（选中项之外的都关，置顶标签不动） */
export const closeOtherTabs = (id: string): void => {
  const list = ensureLibTabs()
  if (!list) return
  removeTabs(
    list.filter((tab) => tab.id !== id).map((tab) => tab.id),
    true
  )
}

/** 置顶 / 取消置顶 */
export const togglePinned = (id: string): void => {
  const list = ensureLibTabs()
  if (!list) return
  const index = list.findIndex((item) => item.id === id)
  if (index < 0) return
  const tab = list[index]
  tab.pinned = !tab.pinned
  /*
   * 置顶后挪到第一位；
   * 取消置顶挪到最后一个置顶标签之后（一个置顶标签都不剩时就是第一位），
   * 这样它正好落在置顶区与非置顶区的交界处，不会夹在置顶标签中间
   */
  const target = tab.pinned ? 0 : list.filter((item) => item.pinned).length
  if (target !== index) {
    list.splice(index, 1)
    list.splice(target, 0, tab)
  }
  persist()
}

/**
 * 拖拽排序
 *
 * 置顶标签被锁在队首：置顶的只能在置顶区内部挪，非置顶的不能挪到置顶标签前面，
 * 越界的落点会被夹到边界上（表现为"顶到置顶区就停住"）。
 *
 * @returns 拖拽项实际落到的下标：调用方要拿它更新自己的拖拽下标，
 *          否则被夹住之后序号会和真实位置错开
 */
export const moveTab = (from: number, to: number): number => {
  const list = ensureLibTabs()
  if (!list || from < 0 || from >= list.length) return from
  const tab = list[from]
  const pinnedCount = list.filter((item) => item.pinned).length
  const min = tab.pinned ? 0 : pinnedCount
  const max = tab.pinned ? pinnedCount - 1 : list.length - 1
  const target = Math.min(max, Math.max(min, to))
  if (target === from || target < 0 || target > list.length - 1) return from
  // 先摘出来再插到 target 上：无论往前往后，最终位置都是 target
  list.splice(from, 1)
  list.splice(target, 0, tab)
  persist()
  return target
}

/**
 * 用文档树校正标签页: 更新名称/路径, 剔除确实已不存在的标签
 *
 * 匹配策略是「id 优先, path 兜底」:
 * - 同一台机器上重命名/移动文件, id 不变
 * - 换机器或恢复备份后 inode 全变(id 是 dev-ino), 但路径还在
 * 两者都匹配不到, 才认为文件已经被删除
 *
 * ⚠️ treeData 为空时直接返回: 首次加载、切换文档库、读取失败都会短暂为空,
 * 不能把它当成「所有文件都被删了」, 否则会把持久化的标签清光
 */
export const syncTabsFromTree = (treeData?: DocTree[]): void => {
  const path = libPath()
  const list = path ? tabStore.value[path] : undefined
  if (!list || !treeData || treeData.length === 0) return
  /*
   * 树数据未必属于当前文档库: 切库与请求的时序可能错开一帧。
   * 用路径前缀确认一下, 否则会拿别的库的树把本库的标签全判成"已删除"
   */
  if (!treeData[0]?.path?.startsWith(path)) return

  const byId = new Map<string, DocTree>()
  const byPath = new Map<string, DocTree>()
  const walk = (nodes: DocTree[]): void => {
    nodes.forEach((node) => {
      byId.set(node.id, node)
      byPath.set(node.path, node)
      if (node.children && node.children.length > 0) walk(node.children)
    })
  }
  walk(treeData)

  let changed = false
  for (let i = list.length - 1; i >= 0; i--) {
    const tab = list[i]
    const doc = byId.get(tab.id) ?? byPath.get(tab.path)
    if (!doc) {
      list.splice(i, 1)
      changed = true
      continue
    }
    const name = doc.formatName || doc.name
    if (tab.id !== doc.id || tab.path !== doc.path || tab.name !== name) {
      tab.id = doc.id
      tab.path = doc.path
      tab.name = name
      changed = true
    }
  }
  if (changed) persist()

  // 当前文章被删 / 被移出文档库: 清掉激活态, 正文保持不动
  const active = path ? activeByLib.value[path] : ''
  if (active && !byId.has(active)) delete activeByLib.value[path!]
}

/** 切换停靠位置 */
export const setPosition = (next: TabPosition): void => {
  if (position.value === next) return
  position.value = next
  Local.set(POSITION_KEY, next)
}

export const togglePosition = (): void => setPosition(position.value === 'top' ? 'left' : 'top')

/** 拖动过程中改宽度(内部限位) */
export const setLeftWidth = (width: number): void => {
  const next = clampWidth(width)
  if (leftWidth.value !== next) leftWidth.value = next
}

/** 拖动结束后落盘, 拖动过程中只改内存 */
export const persistLeftWidth = (): void => Local.set(LEFT_WIDTH_KEY, leftWidth.value)
