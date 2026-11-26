import Graph from 'graphology'

/**
 * 引用关系 -> graphology 图
 *
 * 建图与样式映射都收在这里，布局见 graph-layout.ts
 */

/**
 * 节点配色。
 * 夜间不是把日间的颜色压暗，而是换成低饱和的浅色：日间的红 #EB6969 压暗成
 * #7B0000 之后，在 #1e1e1e 的画布上几乎看不见
 */
export const NODE_COLORS: Record<string, { light: string; dark: string }> = {
  INNER_ARTICLE: { light: '#9B9B9B', dark: '#6E6E6E' },
  UNKNOWN_INNER_ARTICLE: { light: '#EB6969', dark: '#C05C5C' },
  PUBLIC_ARTICLE: { light: '#DEAE10', dark: '#BE9A33' }
}

export const nodeColorOf = (type: string, dark: boolean): string => {
  const c = NODE_COLORS[type] ?? NODE_COLORS.INNER_ARTICLE
  return dark ? c.dark : c.light
}

export interface BuildResult {
  graph: Graph
  /** 端点缺失、被补出来的节点数 */
  repaired: number
  /** 重复边数 */
  duplicates: number
  /** 自环数 */
  selfLoops: number
}

export const buildRefGraph = (rawNodes: ArticleRefNode[], rawLinks: ArticleRefLink[], dark: boolean): BuildResult => {
  const g = new Graph({ multi: false, type: 'directed' })
  const total = rawNodes.length || 1

  rawNodes.forEach((node, i) => {
    if (g.hasNode(node.id)) {
      return
    }
    const angle = i * 2.399963
    const radius = Math.sqrt((i + 1) / total) * 100
    g.addNode(node.id, {
      label: String(node.name ?? node.id).replace(/\.md$/, ''),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      size: 3,
      color: nodeColorOf(node.type, dark),
      nodeType: node.type,
      url: node.url
    })
  })

  // echarts 那边是把 links 原样丢进去的，端点缺失时它会隐式补一个节点；
  // 这里也必须补，不能悄悄丢掉，否则和 echarts 版画出来的图不一样
  let repaired = 0
  let selfLoops = 0
  let duplicates = 0

  const ensureNode = (id: string) => {
    if (g.hasNode(id)) {
      return
    }
    const angle = (g.order + 1) * 2.399963
    const radius = Math.sqrt(g.order / total) * 100
    g.addNode(id, {
      label: String(id).split(/[\\/]/).pop()?.replace(/\.md$/i, '') || String(id),
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      size: 3,
      color: nodeColorOf('UNKNOWN_INNER_ARTICLE', dark),
      nodeType: 'UNKNOWN_INNER_ARTICLE',
      url: String(id)
    })
    repaired += 1
  }

  rawLinks.forEach((link) => {
    if (link.source === link.target) {
      selfLoops += 1
      return
    }
    ensureNode(link.source)
    ensureNode(link.target)
    if (g.hasEdge(link.source, link.target)) {
      duplicates += 1
      return
    }
    g.addEdge(link.source, link.target)
  })

  // 连接越多球越大；开平方映射，否则连 5 条边的节点和叶子一样大，看不出枢纽
  g.forEachNode((id) => {
    const degree = g.degree(id)
    g.setNodeAttribute(id, 'degree', degree)
    g.setNodeAttribute(id, 'size', Math.min(10, 3 + Math.sqrt(degree) * 1))
  })

  return { graph: g, repaired, selfLoops, duplicates }
}
