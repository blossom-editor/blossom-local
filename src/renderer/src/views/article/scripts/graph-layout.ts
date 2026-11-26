import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import louvain from 'graphology-communities-louvain'
import { hierarchy, pack } from 'd3-hierarchy'

/**
 * 引用网络的分组布局。
 *
 * 分三步：
 *   1. 社区检测（Louvain）分组 —— 按连接稠密度切。
 *      换成弱连通分量的话，两个团之间只要有几篇文章同时链到两边就会被并成一组
 *   2. 每组在诱导子图上单独跑 ForceAtlas2，聚成自己的团，再归一化到统一密度
 *   3. 用 d3.pack 打包各组的外接圆，组之间留固定空隙；孤立节点铺到最外圈
 */

interface Vec2 {
  x: number
  y: number
}

/** 组内密度：组面积正比于节点数 */
const LAYOUT_SPACING = 9
/** 组与组之间的留白，太小视觉上看不出边界 */
const GROUP_GAP = 120

const FA2_SETTINGS = {
  // 四叉树近似，和 Obsidian 用的是同一类算法
  barnesHutOptimize: true,
  // 必须开：不开节点会互相堆叠，高度数枢纽会糊成一坨黑块
  adjustSizes: true,
  gravity: 1,
  scalingRatio: 10,
  slowDown: 10,
  linLogMode: false,
  outboundAttractionDistribution: false
}

export interface LayoutResult {
  groups: number
  singles: number
}

/** 在一个组的诱导子图上跑力导向，坐标写回 pos */
const simulateGroup = (ids: string[], edges: Array<[string, string]>, pos: Map<string, Vec2>) => {
  const sub = new Graph({ multi: false, type: 'undirected' })
  for (const id of ids) {
    const p = pos.get(id) as Vec2
    sub.addNode(id, { x: p.x, y: p.y })
  }
  for (const [source, target] of edges) {
    if (!sub.hasEdge(source, target)) {
      sub.addEdge(source, target)
    }
  }
  // 只有两个节点的组没什么可算的，省掉这次迭代
  if (ids.length > 2) {
    forceAtlas2.assign(sub, {
      iterations: Math.min(160, Math.max(40, ids.length)),
      settings: FA2_SETTINGS
    })
  }
  sub.forEachNode((id, attr) => {
    pos.set(id, { x: attr.x as number, y: attr.y as number })
  })
}

export const layoutByGroups = (g: Graph): LayoutResult => {
  const singles: string[] = []
  g.forEachNode((id) => {
    if (g.degree(id) === 0) {
      singles.push(id)
    }
  })

  const groups: string[][] = []
  try {
    const assignment = louvain.detailed(g, { resolution: 1 }).communities
    const buckets = new Map<number, string[]>()
    g.forEachNode((id) => {
      if (g.degree(id) === 0) {
        return
      }
      const c = assignment[id]
      if (!buckets.has(c)) {
        buckets.set(c, [])
      }
      buckets.get(c)?.push(id)
    })
    buckets.forEach((ids) => {
      if (ids.length === 1) {
        singles.push(ids[0])
      } else {
        groups.push(ids)
      }
    })
  } catch (e) {
    console.warn('[graph] 社区检测失败，退化为整体布局', e)
    const rest: string[] = []
    g.forEachNode((id) => {
      if (g.degree(id) > 0) {
        rest.push(id)
      }
    })
    if (rest.length > 0) {
      groups.push(rest)
    }
  }

  // 大的先放，让主组坐中心
  groups.sort((a, b) => b.length - a.length)

  // 每组的外接圆半径：面积正比于节点数，小组给一个下限免得看不见
  const targets = groups.map((ids) => ({
    ids,
    r: Math.max(LAYOUT_SPACING * 4, Math.sqrt(ids.length) * LAYOUT_SPACING)
  }))

  // d3.pack 排布这些圆。画布尺寸取总面积开方的两倍，
  // 让 pack 的整体缩放接近 1，padding 才能按真实单位生效
  const centers: { x: number; y: number; r: number }[] = []
  if (targets.length > 0) {
    const extent = Math.sqrt(targets.reduce((sum, t) => sum + t.r * t.r, 0))
    const side = Math.max(extent * 2, 100)
    const root = pack<any>()
      .size([side, side])
      .padding(GROUP_GAP)(
      hierarchy({ children: targets.map((t) => ({ r: t.r })) }).sum((d: any) => (d.r ? d.r * d.r : 0))
    )
    const leaves = root.leaves()
    // pack 会把整体等比缩放到画布内，半径和坐标都被缩过；
    // 这里除回去，让外接圆半径回到 targetR，否则坐标间距和实际半径对不上、组会叠在一起
    const k = leaves.length > 0 && targets[0].r > 0 ? leaves[0].r / targets[0].r : 1
    for (let i = 0; i < leaves.length; i++) {
      centers.push({ x: (leaves[i].x - root.x) / k, y: (leaves[i].y - root.y) / k, r: leaves[i].r / k })
    }
  }

  for (let i = 0; i < targets.length; i++) {
    const { ids, r: targetR } = targets[i]
    const center = centers[i]
    const inComp = new Set(ids)
    const edges: Array<[string, string]> = []
    g.forEachEdge((_edge, _attr, source, target) => {
      if (inComp.has(source) && inComp.has(target)) {
        edges.push([source, target])
      }
    })

    const pos = new Map<string, Vec2>()
    for (const id of ids) {
      const attr = g.getNodeAttributes(id)
      pos.set(id, { x: attr.x as number, y: attr.y as number })
    }

    simulateGroup(ids, edges, pos)

    let cx = 0
    let cy = 0
    for (const id of ids) {
      const p = pos.get(id) as Vec2
      cx += p.x
      cy += p.y
    }
    cx /= ids.length
    cy /= ids.length

    let maxD = 0
    for (const id of ids) {
      const p = pos.get(id) as Vec2
      maxD = Math.max(maxD, Math.hypot(p.x - cx, p.y - cy))
    }
    const scale = maxD > 0 ? targetR / maxD : 0

    for (const id of ids) {
      const p = pos.get(id) as Vec2
      g.setNodeAttribute(id, 'x', (p.x - cx) * scale + center.x)
      g.setNodeAttribute(id, 'y', (p.y - cy) * scale + center.y)
    }
  }

  // 孤立节点在外圈一圈圈铺开。它们没有关系，塞进打包里只会摊成一片稀疏的云
  let maxR = 0
  for (const c of centers) {
    maxR = Math.max(maxR, Math.hypot(c.x, c.y) + c.r)
  }
  const ringStep = LAYOUT_SPACING * 0.9
  let ringR = (maxR || LAYOUT_SPACING * 6) + ringStep * 1.6
  let cursor = 0
  while (cursor < singles.length) {
    const capacity = Math.max(1, Math.floor((Math.PI * 2 * ringR) / ringStep))
    const batch = Math.min(capacity, singles.length - cursor)
    for (let k = 0; k < batch; k++) {
      const angle = (k / batch) * Math.PI * 2 + (cursor > 0 ? 0.7 : 0)
      g.setNodeAttribute(singles[cursor + k], 'x', Math.cos(angle) * ringR)
      g.setNodeAttribute(singles[cursor + k], 'y', Math.sin(angle) * ringR)
    }
    cursor += batch
    ringR += ringStep
  }

  return { groups: groups.length, singles: singles.length }
}
