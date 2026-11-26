<template>
  <div class="header">
    <AppHeader simple></AppHeader>
  </div>
  <div class="graph-root">
    <div class="stage">
      <!-- sigma 必须独占一个容器：它的 kill() 会删光容器下所有子节点，
           和 Vue 托管的遮罩层放在一起，第二次加载就会把 DOM 弄坏 -->
      <div class="sigma-host" ref="StageRef"></div>

      <div v-show="loading" class="mask">
        <div class="spinner"></div>
        <div class="mask-text">{{ loadingText }}</div>
      </div>
      <div v-if="!loading && nodeCount === 0" class="mask">没有引用关系</div>
    </div>

    <div class="panel">
      <div class="panel-title">
        引用知识网络
        <span class="badge">WebGL</span>
      </div>
      <div class="row">
        <span class="label">节点</span>
        <span class="value">{{ nodeCount }}</span>
        <span class="label">连接</span>
        <span class="value">{{ edgeCount }}</span>
      </div>
      <div class="row">
        <span class="label">分组</span>
        <span class="value">{{ groupCount }}</span>
        <span class="label">孤立</span>
        <span class="value">{{ singleCount }}</span>
      </div>
      <div class="legend">
        <div class="legend-item"><i class="dot inside"></i>内部文章 {{ stat.inside }}</div>
        <div class="legend-item"><i class="dot outside"></i>外网文章 {{ stat.outside }}</div>
        <div class="legend-item"><i class="dot unknown"></i>未知文章</div>
      </div>

      <div class="ops">
        <el-button size="small" @click="loadGraph(true)">仅内部文章</el-button>
        <el-button size="small" @click="loadGraph(false)">含外网文章</el-button>
        <!-- <el-button size="small" @click="loadGraph(onlyInnerRef)">刷新</el-button> -->
      </div>

      <div class="search">
        <el-input v-model="searchText" size="small" clearable placeholder="搜索节点名称或地址" />
        <div class="search-tip">
          <span v-if="!searchText.trim()"> </span>
          <span v-else-if="matchCount > 0"> 匹配 {{ matchCount }} 个节点<span v-if="labelLimited">，仅显示部分标签</span> </span>
          <span v-else class="none">没有匹配的节点</span>
        </div>
      </div>

      <div v-if="selected" class="detail">
        <div class="detail-title">{{ selected.label }}</div>
        <div class="detail-line">{{ typeText(selected.nodeType) }} · 连接 {{ selected.degree ?? 0 }}</div>
        <div class="detail-line url" v-if="selected.url">{{ selected.url }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDark } from '@vueuse/core'
import Sigma from 'sigma'
import Graph from 'graphology'
import { articleRefListApi } from '@renderer/api/blossom'
import AppHeader from '@renderer/components/AppHeader.vue'
import { buildRefGraph, nodeColorOf } from './scripts/graph-build'
import { layoutByGroups } from './scripts/graph-layout'
import { computeSearchState, truncateLabel } from './scripts/graph-search'
import { getPrimaryColor } from '@renderer/scripts/global-theme'

const isDark = useDark()
const route = useRoute()

const StageRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadingText = ref('')
const nodeCount = ref(0)
const edgeCount = ref(0)
const groupCount = ref(0)
const singleCount = ref(0)
const onlyInnerRef = ref(false)
const stat = ref({ inside: 0, outside: 0 })
const selected = ref<any>(null)

let articleId = ''
let renderer: Sigma | null = null
let graph: Graph | null = null
let hovered: string | null = null
let neighbors = new Set<string>()

const searchText = ref('')
const matchCount = ref(0)
/** 标签多到要挑选时才提示「仅显示部分标签」 */
const labelLimited = ref(false)
let searchMatches = new Set<string>()
/** 与命中节点直接相连的节点：保留原色，也参与标签 */
let searchNeighbors = new Set<string>()
/** 最终要显示标签的节点（命中 + 关联里挑出来的） */
let searchLabelSet = new Set<string>()

let searchTimer: ReturnType<typeof setTimeout> | undefined
let hoverTimer: ReturnType<typeof setTimeout> | undefined

/**
 * 悬停多久之后，其他节点才开始渐隐。
 * 语义是「指针在某个节点上停住」再变暗，而不是先变暗再等恢复 ——
 * 鼠标快速掠过一排节点时，一次渐隐都不会发生，也就不会闪
 */
const HOVER_ENTER_DELAY = 200

/**
 * 离开节点后多久恢复全亮。
 * 留一小段缓冲是因为「从 A 移到相邻的 B」时 sigma 会先发 leave 再发 enter，
 * 立刻恢复的话中间会闪一帧全亮
 */
const HOVER_LEAVE_DELAY = 0

/** 搜索：匹配名称或地址；命中的节点放大，命中和它的邻居都显示标签，其余淡出 */
const applySearch = () => {
  const state = computeSearchState(graph, searchText.value)
  searchMatches = state.matches
  searchNeighbors = state.neighbors
  searchLabelSet = state.labels
  matchCount.value = state.matches.size
  labelLimited.value = state.limited
  renderer?.refresh()
}

watch(searchText, () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(applySearch, 180)
})

const clearHoverTimer = () => {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = undefined
  }
}

/**
 * 画布配色。
 * 这层是 canvas，拿不到 CSS 变量，只能按 isDark 给两套值；
 * 切换主题时由下面的 watch 触发一次重绘。
 */
const fadedColor = () => (isDark.value ? '#262626' : '#E6E6E6')
/** 默认连线：夜间中灰、日间浅灰，都不该抢节点的视觉重心 */
const edgeColor = () => (isDark.value ? '#000000' : '#EBEBEB')
/** 与悬停节点或搜索命中直接相关的连线 */
const edgeActiveColor = () => (isDark.value ? '#000000' : getPrimaryColor().color)
/** 默认标签：夜间浅灰，日间深灰 */
const labelColor = () => (isDark.value ? '#A6A6A6' : '#000000')
/** 悬停节点的标签：再亮一档，保证在密集区里能读到 */
const labelActiveColor = () => (isDark.value ? '#000000' : '#000000')

const typeText = (type: string): string => {
  if (type === 'PUBLIC_ARTICLE') return '外网文章'
  if (type === 'UNKNOWN_INNER_ARTICLE') return '未知文章，可能已被删除或链接格式错误'
  return '文档库内文章'
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

const nodeReducer = (node: string, data: any) => {
  const res = { ...data }
  const text = truncateLabel(String(data.label ?? ''))
  const searching = searchMatches.size > 0

  // 节点颜色不写死在建图阶段，按当前主题现算，切主题时不用重建图
  res.color = nodeColorOf(String(data.nodeType ?? ''), isDark.value)
  res.labelColor = labelColor()
  // 默认交给 sigma 按密度决定要不要画；下面再按搜索/悬停状态覆盖
  res.label = text

  if (searching) {
    if (searchMatches.has(node)) {
      res.size = (data.size as number) * 1.8
      res.zIndex = 3
    } else if (searchNeighbors.has(node)) {
      // 与命中直接相连：保留原色，和命中一起参与标签
      res.zIndex = 1
    } else {
      res.color = fadedColor()
      res.label = ''
      res.zIndex = 0
    }

    if (!searchLabelSet.has(node)) {
      res.label = ''
    } else {
      // 命中的标签是强制的，绕过 sigma 的尺寸阈值和密度抽稀
      res.forceLabel = true
    }
  }

  if (!hovered) {
    return res
  }

  if (node === hovered) {
    res.highlighted = true
    // 指到哪个就显示哪个的标签，不管它有没有被搜索命中
    res.label = text
    res.labelColor = labelActiveColor()
    res.forceLabel = true
    res.zIndex = 4
  } else if (neighbors.has(node)) {
    res.zIndex = Math.max((res.zIndex as number) ?? 0, 2)
    // 悬停邻居被搜索淡掉的话，看不出它和当前节点是一伙的
    if (searching && !searchMatches.has(node) && !searchNeighbors.has(node)) {
      res.color = nodeColorOf(String(data.nodeType ?? ''), isDark.value)
    }
  } else if (!searching) {
    res.color = fadedColor()
    res.label = ''
  }
  return res
}

const edgeReducer = (edge: string, data: any) => {
  const res = { ...data }
  const searching = searchMatches.size > 0
  // 连线颜色同样按主题现算，默认值只用于兜底
  res.color = edgeColor()
  if (!graph) {
    return res
  }

  const [s, t] = graph.extremities(edge)
  if (searching) {
    // 只留和命中直接相连的边，否则标签挂在点上看不出它们的关系
    res.color = searchMatches.has(s) || searchMatches.has(t) ? edgeActiveColor() : fadedColor()
  }

  if (!hovered) {
    return res
  }
  if (s === hovered || t === hovered) {
    res.color = edgeActiveColor()
    res.zIndex = 1
  } else if (!searching) {
    res.color = fadedColor()
  }
  return res
}

/** 应用高亮：记住当前节点和它的邻居，其余节点由 reducer 淡出 */
const applyHover = (node: string) => {
  hoverTimer = undefined
  hovered = node
  neighbors = graph ? new Set(graph.neighbors(node)) : new Set()
  renderer?.refresh()
}

/** 恢复全亮 */
const clearHover = () => {
  hoverTimer = undefined
  if (!hovered) {
    return
  }
  hovered = null
  neighbors = new Set()
  renderer?.refresh()
}

const createRenderer = (g: Graph) => {
  destroyRenderer()
  if (!StageRef.value) {
    return
  }
  renderer = new Sigma(g, StageRef.value, {
    renderLabels: true,
    // 标签按网格密度抽稀：屏幕上一格最多放几个，等效于 LOD。
    // 格子按标签宽度定：8 个中文字约 85px，fitView 下相机 ratio 约 0.55，
    // 换成图坐标约 155，取 180 才不会让相邻格子的标签互相压字
    labelDensity: 0.18,
    labelGridCellSize: 50,
    labelRenderedSizeThreshold: 4,
    labelSize: 11,
    defaultEdgeColor: edgeColor(),
    // 标签颜色由 nodeReducer 写进 labelColor 属性，这里给兜底值和取色方式
    labelColor: { attribute: 'labelColor', color: labelColor() },
    minCameraRatio: 0.01,
    maxCameraRatio: 20,
    nodeReducer,
    edgeReducer
  })

  renderer.on('enterNode', ({ node }) => {
    clearHoverTimer()
    if (hovered === node) {
      return
    }
    // 已经亮着就直接切过去，否则高亮会停在上一个节点上；
    // 从「全亮」进入才等 HOVER_ENTER_DELAY，让指针停住再变暗
    if (hovered) {
      applyHover(node)
    } else {
      hoverTimer = setTimeout(() => applyHover(node), HOVER_ENTER_DELAY)
    }
  })
  renderer.on('leaveNode', () => {
    // 不立刻恢复：移到相邻节点时 sigma 会先发 leave 再发 enter，
    // 留出 HOVER_LEAVE_DELAY 的取消窗口，中间才不会闪一帧全亮
    clearHoverTimer()
    hoverTimer = setTimeout(clearHover, HOVER_LEAVE_DELAY)
  })
  renderer.on('clickNode', ({ node }) => {
    selected.value = g.getNodeAttributes(node)
  })
  renderer.on('clickStage', () => {
    selected.value = null
  })
}

/**
 * 销毁渲染器。
 * 注意 sigma 的 kill() 会清空容器子节点，所以它只能拿到 .sigma-host，
 * 不能拿到 .stage（里面还有 Vue 管的遮罩层和注释锚点）。
 */
const destroyRenderer = () => {
  if (!renderer) {
    return
  }
  try {
    renderer.kill()
  } catch (e) {
    console.warn('[webgl graph] 销毁渲染器失败', e)
  }
  renderer = null
  hovered = null
  neighbors = new Set()
  clearHoverTimer()
}

const resetCamera = () => {
  renderer?.getCamera().animatedReset({ duration: 400 })
}

/**
 * 切换主题：两个 reducer 每次绘制都会按 isDark 重新取色，
 * 所以不需要重建图，只要把 sigma 自己的默认值同步过去再刷一帧
 */
watch(isDark, () => {
  if (!renderer) {
    return
  }
  renderer.setSettings({
    defaultEdgeColor: edgeColor(),
    labelColor: { attribute: 'labelColor', color: labelColor() }
  })
  renderer.refresh()
})

const loadGraph = async (onlyInner: boolean) => {
  loading.value = true
  loadingText.value = '正在读取引用关系...'
  selected.value = null
  stat.value = { inside: 0, outside: 0 }
  onlyInnerRef.value = onlyInner

  const req: ArticleRefReq = { onlyInner: onlyInner }
  if (articleId) {
    req.articleId = articleId
  }

  try {
    const resp = await articleRefListApi(req)
    if (!resp.data || !resp.data.nodes || resp.data.nodes.length === 0) {
      destroyRenderer()
      graph = null
      nodeCount.value = 0
      edgeCount.value = 0
      groupCount.value = 0
      singleCount.value = 0
      return
    }

    resp.data.nodes.forEach((n: ArticleRefNode) => {
      if (n.type === 'INNER_ARTICLE') stat.value.inside += 1
      else if (n.type === 'PUBLIC_ARTICLE') stat.value.outside += 1
    })
    console.log(`[webgl graph] 后端返回 ${resp.data.nodes.length} 节点 / ${resp.data.links.length} 连接（含重复与自环）`)

    const built = buildRefGraph(resp.data.nodes, resp.data.links, isDark.value)
    graph = built.graph
    nodeCount.value = graph.order
    edgeCount.value = graph.size
    if (built.repaired > 0 || built.duplicates > 0 || built.selfLoops > 0) {
      console.warn(`[webgl graph] 补齐缺失端点节点 ${built.repaired} 个, 重复边 ${built.duplicates} 条, 自环 ${built.selfLoops} 条`)
    }

    // 度数 Top5，方便对照 echarts 那边是不是少算/多算了边
    const top: { label: string; degree: number }[] = []
    graph.forEachNode((id, attr) => top.push({ label: attr.label, degree: attr.degree ?? 0 }))
    top.sort((a, b) => b.degree - a.degree)
    console.log(
      '[webgl graph] 度数 Top5: ' +
        top
          .slice(0, 5)
          .map((t) => `${t.label}(${t.degree})`)
          .join(', ')
    )

    loadingText.value = `正在计算布局（${graph.order} 节点 / ${graph.size} 连接）...`
    // 先把遮罩画出来，再跑同步的布局计算
    await nextFrame()

    const start = Date.now()
    const layoutStat = layoutByGroups(graph)
    groupCount.value = layoutStat.groups
    singleCount.value = layoutStat.singles
    console.log(
      `[webgl graph] 布局耗时 ${Date.now() - start}ms, ${graph.order} 节点 / ${graph.size} 连接, ` +
        `${layoutStat.groups} 个分组 + ${layoutStat.singles} 个孤立节点`
    )

    createRenderer(graph)
    applySearch()
  } catch (e) {
    console.error('[webgl graph] 加载引用关系失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  document.title = '引用知识网络 (WebGL)'
  // 主进程拼的是 '/articleGraphSigma?articleId=' + id，没有文章时 id 是 undefined，
  // 会拼出字符串 'undefined'，不能当成有效 id 传给后端
  const rawId = (route.query.articleId as string) || ''
  articleId = ['', 'undefined', 'null'].includes(rawId) ? '' : rawId
  loadGraph(false)
})

onUnmounted(() => {
  destroyRenderer()
  graph = null
})
</script>

<style scoped lang="scss">
.header {
  @include box(100%, 30px);
}

.graph-root {
  @include box(100%, calc(100% - 30px));
  position: relative;
  overflow: hidden;

  .stage {
    @include box(100%, 100%);
    position: relative;
    background-color: var(--bl-html-color);
  }

  .sigma-host {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .mask {
    @include flex(column, center, center);
    position: absolute;
    inset: 0;
    z-index: 10;
    gap: 12px;
    color: var(--bl-text-color-light);
    font-size: 13px;
    background-color: var(--bl-html-color);
    backdrop-filter: blur(2px);
  }

  .spinner {
    width: 22px;
    height: 22px;
    border: 2px solid var(--el-border-color);
    border-top-color: var(--el-color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .panel {
    @include absolute(20px, '', '', 20px);
    z-index: 20;
    width: 230px;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color);
    border-radius: 10px;
    background-color: var(--bl-html-color);
    backdrop-filter: blur(4px);

    .panel-title {
      font-size: 15px;
      font-weight: 500;
      color: var(--el-color-primary);
      margin-bottom: 12px;

      .badge {
        margin-left: 6px;
        padding: 1px 6px;
        font-size: 11px;
        font-weight: 400;
        border-radius: 4px;
        color: var(--el-color-primary);
        border: 1px solid var(--el-color-primary-light-5);
      }
    }

    .scope {
      margin: -6px 0 10px;
      font-size: 11px;
      color: var(--bl-text-color-light);
    }

    .search {
      margin-top: 10px;
      margin-bottom: 10px;

      .search-tip {
        margin-top: 5px;
        min-height: 15px;
        font-size: 11px;
        color: var(--bl-text-color-light);

        .none {
          color: var(--el-color-danger);
        }
      }
    }

    .row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 12px;
      color: var(--bl-text-color-light);

      & + .row {
        margin-top: 2px;

        .value {
          font-size: 13px;
        }
      }

      .value {
        font-size: 16px;
        font-weight: 500;
        color: var(--bl-text-color);
        margin-right: 8px;
      }
    }

    .legend {
      margin-top: 12px;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--bl-text-color-light);
        line-height: 22px;
      }

      .dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        display: inline-block;
      }

      .inside {
        background-color: #9b9b9b;
      }

      .outside {
        background-color: #deae10;
      }

      .unknown {
        background-color: #eb6969;
      }
    }

    .ops {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      .el-button + .el-button {
        margin-left: 0;
      }
    }

    .hint {
      margin-top: 10px;
      font-size: 11px;
      line-height: 1.6;
      color: var(--bl-text-color-light);
    }

    .detail {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed var(--el-border-color);
      font-size: 12px;

      .detail-title {
        font-size: 13px;
        font-weight: 500;
        color: var(--bl-text-color);
        margin-bottom: 4px;
        word-break: break-all;
      }

      .detail-line {
        color: var(--bl-text-color-light);
        line-height: 1.6;
      }

      .url {
        word-break: break-all;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
