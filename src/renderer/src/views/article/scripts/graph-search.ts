import Graph from 'graphology'

/**
 * 图上标签的最大显示宽度，按中文字宽算（西文算半个字符）。
 * 文章名动辄十几二十个字，不截断会横跨半个屏幕
 */
export const LABEL_MAX_WIDTH = 8

/**
 * 搜索时最多同时显示这么多个标签。
 * 命中上千个节点时全都显示会糊成一整片黑，一个都不显示又看不清名字，
 * 所以超预算时按图空间网格挑，保证主要区域都有标签
 */
export const LABEL_BUDGET = 48

/** 全角字符（中文、中文标点、全角符号）占 1 个字宽，其余占半个 */
const isFullWidth = (ch: string): boolean => /[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)

/**
 * 标签截断：超过 LABEL_MAX_WIDTH 个中文字宽就省略。
 * 只作用于画在图上的标签，搜索匹配和详情面板仍然用完整名字
 */
export const truncateLabel = (text: string): string => {
  let width = 0
  let out = ''
  for (const ch of Array.from(text)) {
    const w = isFullWidth(ch) ? 1 : 0.5
    if (width + w > LABEL_MAX_WIDTH) {
      // 截断处常留下空格、连接号之类的分隔符，一并去掉
      return out.replace(/[\s\-_·、,，.。:：|/\\]+$/, '') + '…'
    }
    width += w
    out += ch
  }
  return out
}

export interface SearchState {
  /** 名称或地址命中关键词的节点 */
  matches: Set<string>
  /** 与命中直接相连的节点 */
  neighbors: Set<string>
  /** 最终要显示标签的节点（命中 + 关联里挑出来的） */
  labels: Set<string>
  /** 标签池超出预算、只显示了一部分 */
  limited: boolean
}

const emptyState = (): SearchState => ({
  matches: new Set<string>(),
  neighbors: new Set<string>(),
  labels: new Set<string>(),
  limited: false
})

/**
 * 计算搜索状态。
 * 标签优先给命中，其次给关联；总量在预算内就全显示，
 * 超了就在图空间上铺网格，每格取优先级最高的一个，标签才会散开而不是叠成一团
 */
export const computeSearchState = (g: Graph | null, rawQuery: string): SearchState => {
  const q = rawQuery.trim().toLowerCase()
  if (!g || !q) {
    return emptyState()
  }

  const matches = new Set<string>()
  g.forEachNode((id, attr: any) => {
    const text = `${attr.label ?? ''} ${attr.url ?? ''}`.toLowerCase()
    if (text.includes(q)) {
      matches.add(id)
    }
  })
  if (matches.size === 0) {
    return emptyState()
  }

  // 命中本身也会是别人的邻居，这里要排掉
  const neighbors = new Set<string>()
  matches.forEach((id) => {
    g.neighbors(id).forEach((n) => {
      if (!matches.has(n)) {
        neighbors.add(n)
      }
    })
  })

  const pool = new Set<string>(matches)
  neighbors.forEach((id) => pool.add(id))

  const state: SearchState = { matches, neighbors, labels: new Set<string>(), limited: pool.size > LABEL_BUDGET }
  if (pool.size <= LABEL_BUDGET) {
    pool.forEach((id) => state.labels.add(id))
    return state
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  g.forEachNode((_id: string, attr: any) => {
    minX = Math.min(minX, attr.x)
    maxX = Math.max(maxX, attr.x)
    minY = Math.min(minY, attr.y)
    maxY = Math.max(maxY, attr.y)
  })
  // 格子数跟预算对齐，格子太多会导致「每格都选一个」反而超出预算
  const side = Math.max(Math.ceil(Math.sqrt(LABEL_BUDGET)), 2)
  const cell = Math.max((maxX - minX) / side, (maxY - minY) / side, 1)

  const perCell = new Map<string, { id: string; hit: boolean; degree: number }>()
  pool.forEach((id) => {
    const attr = g.getNodeAttributes(id)
    const key = `${Math.floor((attr.x - minX) / cell)}:${Math.floor((attr.y - minY) / cell)}`
    const hit = matches.has(id)
    const degree = (attr.degree as number) ?? 0
    const cur = perCell.get(key)
    if (!cur || (hit && !cur.hit) || (hit === cur.hit && degree > cur.degree)) {
      perCell.set(key, { id, hit, degree })
    }
  })

  // 命中排在关联前面：预算不够时先保证搜到的节点都有名字
  const picked = [...perCell.values()].sort((a, b) => Number(b.hit) - Number(a.hit) || b.degree - a.degree)
  picked.slice(0, LABEL_BUDGET).forEach((p) => state.labels.add(p.id))
  return state
}
