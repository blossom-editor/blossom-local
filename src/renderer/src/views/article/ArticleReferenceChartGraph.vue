<template>
  <div class="header">
    <AppHeader simple></AppHeader>
  </div>
  <div class="article-reference-root">
    <div class="setting">
      <bl-row>
        <el-button-group class="ml-4">
          <el-button type="primary" @click="getArticleRefList(true)">仅内部文章</el-button>
          <el-button type="primary" @click="getArticleRefList(false)">含外网文章</el-button>
        </el-button-group>
      </bl-row>
      <bl-row style="margin-top: 10px">
        <el-checkbox v-model="showOutsideName" border @change="getArticleRefList(false)">显示外网文章名称</el-checkbox>
      </bl-row>
      <bl-row class="title" just="center"> 文章引用网络 </bl-row>
      <bl-row just="center">
        <bl-col class="symbol" just="center">
          <div class="inside"></div>
          内部文章<br /><span>({{ stat.inside }}篇)</span>
        </bl-col>
        <bl-col class="symbol" just="center">
          <div class="outside"></div>
          外网文章<br /><span>({{ stat.outside }}篇)</span>
        </bl-col>
      </bl-row>
    </div>
    <div class="desc">
      <div style="margin-bottom: 0">说明:</div>
      <ol>
        <li>使用简短的链接名称, 有助于在知识网络中显示.</li>
        <li>点击查看详情.</li>
      </ol>
    </div>
    <div class="app-relation-graph-chart" ref="ChartGraphRef"></div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import { useDark } from '@vueuse/core'
import { articleRefListApi } from '@renderer/api/blossom'

// echarts
import * as echarts from 'echarts/core'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { GraphChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { isNotBlank, isNotNull } from '@renderer/assets/utils/obj'
import { getPrimaryColor } from '@renderer/scripts/global-theme'
import AppHeader from '@renderer/components/AppHeader.vue'
import createLayout from 'mgraph.forcelayout'
import createGraph from 'mgraph.graph'

/**
 * 力布局只用于「预算坐标」，算完即弃。
 * mgraph 的 layout 绑定在 graph 实例上，且 dispose 之后不能复用；
 * 旧实现把 graph/layout 放在模块作用域反复使用，第二次加载时链路会重复累加、
 * 位置还带着上一轮的状态，越点越慢。
 */
const LAYOUT_OPTIONS = {
  dimensions: 2, // 默认为2D[reference:4]
  springLength: 2, // 理想边长[reference:5]
  springCoefficient: 0.8, // 弹簧强度[reference:6]
  gravity: -25 // 重力 (负值为斥力)[reference:7]
}

// 大图降级阈值：超过后关掉标签避让和邻接聚焦，这两项在大图上都要遍历全图
const LABEL_NODE_LIMIT = 200
const LABEL_OVERLAP_LIMIT = 800
const FOCUS_ADJACENCY_LIMIT = 800
// 边符号是大图绘制成本的大头，超过该节点数就只画线
const EDGE_SYMBOL_LIMIT = 500
// 放大到该倍率以上才显示标签
const LABEL_ZOOM_THRESHOLD = 1.5

//////////////

echarts.use([TitleComponent, TooltipComponent, LegendComponent, GraphChart, CanvasRenderer])

const isDark = useDark()
const route = useRoute()

onMounted(() => {
  document.title = '双链图表'
  init()
  windowResize()
  articleId = route.query.articleId as string
  getArticleRefList(false)
  window.addEventListener('resize', windowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', windowResize)
})

// -------------------- data
const showOutsideName = ref(false)
const ChartGraphRef = ref<any>(null)
const stat = ref({ inside: 0, outside: 0 })
let articleId = ''
let chartGraph: any
let nodes: any = [{}]
let links: any = [{}]

let inner: any = { itemStyle: {}, label: {} }
let innerUnknown: any = { itemStyle: {}, label: {} }
let outside: any = { itemStyle: {}, label: {} }
const changeStyle = () => {
  // 节点数量统计
  stat.value = { inside: 0, outside: 0 }
  inner = {
    label: { fontSize: 12, color: isDark.value ? '#BABABA' : '#000000' },
    itemStyle: { color: isDark.value ? '#6E6E6E' : '#9B9B9B' }
  }
  innerUnknown = {
    label: { fontSize: 12, color: isDark.value ? '#7B0000' : '#EB6969' },
    itemStyle: { color: isDark.value ? '#7B0000' : '#EB6969' }
  }
  outside = {
    itemStyle: { color: isDark.value ? '#7B5E00' : '#DEAE10' },
    label: {
      fontSize: 12,
      show: showOutsideName.value,
      color: isDark.value ? '#959595' : '#B5B5B5'
    }
  }
}

/**
 * 获取文章内容
 * @param onlyInner
 * @param articleId
 */
const getArticleRefList = (onlyInner: boolean) => {
  changeStyle()
  let req: ArticleRefReq
  if (isNotNull(articleId) && isNotBlank(articleId)) {
    req = { onlyInner: onlyInner, articleId: articleId }
  } else {
    req = { onlyInner: onlyInner }
  }

  articleRefListApi(req).then((resp) => {
    if (!resp.data || !resp.data.nodes) {
      return
    }

    // 连接数单遍统计，原来每个节点都要扫一遍全部 links（O(n×m)）
    const degree = buildDegreeMap(resp.data.links)
    nodes = resp.data!.nodes.map((node: ArticleRefNode) => {
      if (node.type == 'INNER_ARTICLE') {
        node.itemStyle = inner.itemStyle
        node.label = inner.label
        stat.value.inside += 1
      } else if (node.type === 'UNKNOWN_INNER_ARTICLE') {
        node.itemStyle = innerUnknown.itemStyle
        node.label = innerUnknown.label
      } else if (node.type == 'PUBLIC_ARTICLE') {
        node.itemStyle = outside.itemStyle
        node.label = outside.label
        stat.value.outside += 1
      }
      // 与原 getLinkCount 等价：基数 10，每连接 +1，上限 50
      node.symbolSize = Math.min(10 + (degree.get(node.id) ?? 0), 50)
      return node
    })
    links = resp.data.links

    let start = Date.now()
    const positions = precomputeLayout(nodes, links)
    nodes.forEach((node: { id: string; x: number; y: number }) => {
      const pos = positions.get(node.id)
      if (pos) {
        node.x = pos.x
        node.y = pos.y
      }
    })
    console.log(`layout + position map took ${Date.now() - start}ms`)

    start = Date.now()
    randerChat2(nodes)
    console.log(`randerChat2 took ${Date.now() - start}ms`)
  })
}

/**
 * 单遍统计每个节点的连接数，用于计算 symbolSize。
 * 旧实现每算一个节点都要从头发扫一遍全部 links，整体是 O(n×m)。
 */
const buildDegreeMap = (allLinks: ArticleRefLink[]): Map<string, number> => {
  const degree = new Map<string, number>()
  if (!allLinks) {
    return degree
  }
  for (let i = 0; i < allLinks.length; i++) {
    const link = allLinks[i]
    degree.set(link.source, (degree.get(link.source) ?? 0) + 1)
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1)
  }
  return degree
}

/**
 * 用力布局预跑若干步，拿到 id -> 坐标 的映射。
 * 图和布局实例都是本次专用的，算完立刻 dispose，避免跨次加载互相污染。
 */
const precomputeLayout = (
  graphNodes: { id: string }[],
  graphLinks: ArticleRefLink[]
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>()
  const layoutGraph = createGraph()
  const forceLayout = createLayout(layoutGraph, LAYOUT_OPTIONS)

  graphNodes.forEach((node) => layoutGraph.addNode(node.id))
  graphLinks.forEach((link) => layoutGraph.addLink(link.source, link.target))

  const iterations = 200
  for (let i = 0; i < iterations; i++) {
    if (forceLayout.step()) {
      break
    }
  }

  layoutGraph.forEachNode((graphNode) => {
    const pos = forceLayout.getNodePosition(graphNode.id)
    positions.set(graphNode.id as string, { x: pos.x, y: pos.y })
  })

  forceLayout.dispose()
  return positions
}

const randerChat2 = (nodes1: any[]) => {
  const useEdgeSymbol = nodes1.length <= EDGE_SYMBOL_LIMIT
  chartGraph.setOption({
    tooltip: {
      // position: [20, 50],
      triggerOn: 'click',
      enterable: true,
      alwaysShowContent: false,
      borderWidth: 0,
      borderColor: 'none',
      padding: 0,
      formatter: (params: any) => {
        if (params.dataType === 'edge') return

        let url = ''
        let type = ''
        if (params.data.type === 'INNER_ARTICLE') {
          url = `<div>地址: <span href="${params.data.url}">${params.data.url}</span></div>`
          type = `<div>类型: 文档库内文章</div>`
        } else if (params.data.type === 'UNKNOWN_INNER_ARTICLE') {
          type = `<div style="color:${innerUnknown.itemStyle.color}">类型: 未知文章, 可能已被删除或 Markdown 链接格式错误</div>`
          url = `<div>地址: ${params.data.url}</div>`
        } else if (params.data.type === 'PUBLIC_ARTICLE') {
          url = `<div>地址: <a target="_blank" href="${params.data.url}">${params.data.url}</a></div>`
          type = `<div>类型: 外网文章</div>`
        }
        return `<div class="chart-graph-article-ref-tooltip" style="border:1px solid ${params.data.itemStyle.color}">
          <div class="title">${params.data.name}</div>
          <div class="content">
            ${type}
            ${url}
          </div>
          </div>`
      }
    },
    series: [
      {
        type: 'graph',
        layout: 'none', // 采用力引导布局
        top: 100,
        bottom: 100,
        draggable: false,
        symbolSize: 15,
        // animationDuration: 1000,
        // animationThreshold: 500, // 是否开启动画的阈值，当单个系列显示的图形数量大于这个阈值时会关闭动画。
        zoom: 0.5,
        roam: true,
        label: {
          show: nodes1.length > LABEL_NODE_LIMIT ? false : true,
          position: 'bottom',
          // formatter: '{b}'
          formatter: (param: any) => {
            let len = param.name.length
            if (len < 20) {
              return param.name.replace('.md', '')
            }
            return (param.name as string).substring(0, 15) + '...'
          }
        },
        labelLayout: {
          // 标签避让要遍历全部标签做碰撞检测，大图直接关掉
          hideOverlap: nodes1.length <= LABEL_OVERLAP_LIMIT
        },
        lineStyle: {
          color: isDark.value ? '#5E5E5E' : '#7E7E7E',
          width: 1,
          curveness: 0 // 直线或曲线
        },
        // 每条边会额外建 2 个符号图元，实测占绘制开销的三分之二：
        // 4000 节点 314ms → 44ms，1000 节点 34ms → 11ms（见 .bench 压测）
        // 起点的 circle 尺寸本来就是 0，纯白建一个图元，无论多少节点都不需要；
        // 箭头在边少时还能看出方向，边一多只是噪点，一并关掉
        edgeSymbol: useEdgeSymbol ? ['none', 'arrow'] : ['none', 'none'], // 箭头的开始, 结束图形
        edgeSymbolSize: useEdgeSymbol ? [0, 5] : [0, 0], // 箭头的开始, 结束图形大小
        // =========== 高亮状态的图形样式 ===========
        emphasis: {
          // 邻接聚焦在悬停时要算全图邻接、再把其余元素整体淡出，
          // 节点一多每次 hover 都是全量重绘，大图只保留自身高亮
          focus: nodes1.length > FOCUS_ADJACENCY_LIMIT ? 'none' : 'adjacency',
          scale: false,
          lineStyle: { width: 2, color: getPrimaryColor().color },
          itemStyle: { color: getPrimaryColor().color }
          // label: { show: true },
          // edgeLabel: { show: false },
        },
        // =========== 被淡出的节点样式 ===========
        blur: {
          itemStyle: { opacity: 0.1 },
          lineStyle: { opacity: 0.1 },
          label: { show: false },
          edgeLabel: { show: false } // 连线标题的样式
        },
        data: nodes1,
        links: links
      }
    ]
  })

  bindLabelToggle(nodes1.length)
}

/** 当前标签显隐状态，只在跨过阈值时同步一次 option */
let labelsVisible = false

/**
 * 从 series model 直接读当前 zoom（O(1)）。
 * 旧实现每帧调 getOption()，那会把整份 option（含全部节点和边）深拷贝一遍，
 * 鼠标动一下就是一次大对象分配 + GC，这是平移缩放掉帧的主因。
 */
const getZoom = (): number => {
  try {
    const seriesModel = chartGraph.getModel()?.getSeriesByIndex(0)
    return seriesModel?.option?.zoom ?? 1
  } catch {
    return 1
  }
}

/**
 * 大图按缩放倍率切换标签显隐。
 * 只在状态真正变化时提交 option，且只提交 series 片段（不带 data），
 * 避免整份图数据重新 merge。
 */
const bindLabelToggle = (nodeCount: number) => {
  labelsVisible = nodeCount <= LABEL_NODE_LIMIT
  if (nodeCount <= LABEL_NODE_LIMIT) {
    return
  }
  // 每次重新加载都会重新绑定，先摘掉上一次的，否则监听器会越叠越多
  chartGraph.off('graphroam')
  chartGraph.on('graphroam', () => {
    const next = getZoom() > LABEL_ZOOM_THRESHOLD
    if (next === labelsVisible) {
      return
    }
    labelsVisible = next
    setOption({
      series: [{ label: { show: next }, blur: { label: { show: next } } }]
    })
  })
}


const init = () => {
  chartGraph = echarts.init(ChartGraphRef.value)
}

/**
 * 防抖
 */
let debounceTimeout: NodeJS.Timeout | undefined
function debounce(fn: () => void, time = 500) {
  if (debounceTimeout != undefined) {
    clearTimeout(debounceTimeout)
  }
  debounceTimeout = setTimeout(fn, time)
}

const setOption = (option: any) => {
  // 只用于标签显隐这类轻量片段，120ms 足够把连续缩放合并成一次
  debounce(() => {
    chartGraph.setOption(option, { lazyUpdate: true })
  }, 120)
}

const windowResize = () => {
  debounce(() => {
    chartGraph.resize()
  }, 300)
}
</script>

<style scoped lang="scss">
.header {
  @include box(100%, 30px);
}
.article-reference-root {
  @include box(100%, calc(100% - 30px));
  position: relative;

  .setting {
    @include absolute(0, '', '', 20px);
    border: 1px solid var(--el-border-color);
    padding: 10px;
    border-radius: 10px;

    .title {
      color: var(--el-color-primary);
      text-shadow: var(--bl-text-shadow);
      font-weight: bold;
      height: 40px;
    }

    .symbol {
      font-size: 12px;
      color: var(--el-color-primary);
      margin-bottom: 10px;
      margin-right: 10px;
    }

    .inside,
    .outside {
      @include box(20px, 20px);
      box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.441);
      border-radius: 50%;
      margin-bottom: 10px;
    }

    .inside {
      background-color: var(--el-color-primary);
    }

    .outside {
      background-color: #fdc81a;
    }
  }

  .desc {
    @include font(12px, 300);
    @include absolute('', '', 20px, 20px);
    color: var(--bl-text-color-light);
    border: 1px dashed var(--bl-text-color-light);
    border-radius: 5px;
    padding: 10px;

    ol {
      margin: 0;
      padding-left: 30px;
    }
  }

  .setting,
  .desc {
    backdrop-filter: blur(4px);
    z-index: 99;
  }

  .app-relation-graph-chart {
    @include box(100%, 100%);
  }
}
</style>

<style lang="scss">
.chart-graph-article-ref-tooltip {
  max-width: 400px;
  word-break: break-all;
  white-space: normal;
  background-color: var(--bl-html-color);
  border-radius: 4px;
  color: var(--bl-text-color);

  .title {
    @include ellipsis();
    @include font(15px, 500);
    border-bottom: 1px solid var(--el-color-primary-light-5);
    padding: 10px;
  }

  .content {
    font-size: 12px;
    padding: 5px 10px;
  }
}
</style>
