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
import createGraph, { NodeId } from 'mgraph.graph'

const graph = createGraph()
const layout = createLayout(graph, {
  dimensions: 2, // 默认为2D[reference:4]
  springLength: 2, // 理想边长[reference:5]
  springCoefficient: 0.8, // 弹簧强度[reference:6]
  gravity: -25 // 重力 (负值为斥力)[reference:7]
})

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
  layout.dispose()
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
      node.symbolSize = getLinkCount(node.id, resp.data!.links)
      return node
    })
    links = resp.data.links

    nodes.forEach((node: { id: NodeId }) => {
      graph.addNode(node.id)
    })

    links.forEach((link: { source: NodeId; target: NodeId }) => {
      graph.addLink(link.source, link.target)
    })

    let start = Date.now()
    const iterations = 200
    for (let i = 0; i < iterations; i++) {
      if (layout.step()) {
        break
      }
    }
    console.log(`layout took ${Date.now() - start}ms`)

    start = Date.now()
    graph.forEachNode((graphNode: any) => {
      const pos = layout.getNodePosition(graphNode.id)
      nodes.forEach((data: { id: any; x: number; y: number }) => {
        if (data.id === graphNode.id) {
          data.x = pos.x
          data.y = pos.y
        }
      })
    })

    console.log(`getNodePosition took ${Date.now() - start}ms`)

    start = Date.now()
    randerChat2(nodes)
    console.log(`randerChat2 took ${Date.now() - start}ms`)

    layout.dispose()
    //
  })
}

/**
 * 统计节点被被链接的数量, 用于计算 symbolSize
 * @param name  节点名称
 * @param links 全部节点关系
 */
const getLinkCount = (name: string, links: ArticleRefLink[]): number => {
  let count: number = 10
  for (let i = 0; i < links.length; i++) {
    if (count >= 50) {
      break
    }
    let link = links[i]
    if (link.source == name) {
      count += 1
    }
    if (link.target == name) {
      count += 1
    }
  }
  return count
}

const randerChat2 = (nodes1: any[]) => {
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
        if (params.dataType === 'edge') {
          return
        }
        let url = ''
        if (!params.data.inner) {
          url = `<div>地址: <a target="_blank" href="${params.data.url}">${params.data.url}</a></div>`
        } else {
          url = `<div>地址: <a target="_blank" href="${params.data.url}">${params.data.url}</a></div>`
        }
        let type = ''
        if (params.data.type === 'INNER_ARTICLE') {
          type = `<div>类型: 文档库内文章</div>`
        } else if (params.data.type === 'UNKNOWN_INNER_ARTICLE') {
          type = `<div style="color:${innerUnknown.itemStyle.color}">类型: 未知文章, 可能已被删除或 Markdown 链接格式错误</div>`
        } else if (params.data.type === 'PUBLIC_ARTICLE') {
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
          show: nodes1.length > 200 ? false : true,
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
          hideOverlap: true // 标签重叠时进行遮盖
        },
        lineStyle: {
          color: isDark.value ? '#5E5E5E' : '#7E7E7E',
          width: 1,
          curveness: 0 // 直线或曲线
        },
        edgeSymbol: ['circle', 'arrow'], // 箭头的开始, 结束图形
        edgeSymbolSize: [0, 5], // 箭头的开始, 结束图形大小
        // =========== 高亮状态的图形样式 ===========
        emphasis: {
          focus: 'adjacency', // 聚焦关系图中的邻接点和边的图形。
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

  if (nodes1.length < 200) {
    return
  }

  chartGraph.on('graphroam', function (_params: any) {
    // console.log('graphroam', params)
    // // 1. 获取当前的 option
    const option = chartGraph.getOption()
    // // 2. 获取当前的缩放比例，默认是1[reference:3]
    const currentZoom = option.series[0].zoom || 1
    // console.log('currentZoom', currentZoom)
    if (currentZoom > 1.5) {
      if (option.series[0].label.show === false) {
        option.series[0].label = { show: true }
        option.series[0].blur.label = { show: true }
        setOption(option)
      }
    } else {
      if (option.series[0].label.show === true) {
        option.series[0].label = { show: false }
        option.series[0].blur.label = { show: false }
        setOption(option)
      }
    }
  })
}

const renderChart = () => {
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
        if (params.dataType === 'edge') {
          return
        }
        let url = ''
        if (!params.data.inner) {
          url = `<div>地址: <a target="_blank" href="${params.data.url}">${params.data.url}</a></div>`
        } else {
          url = `<div>地址: <a target="_blank" href="${params.data.url}">${params.data.url}</a></div>`
        }
        let type = ''
        if (params.data.type === 'INNER_ARTICLE') {
          type = `<div>类型: 文档库内文章</div>`
        } else if (params.data.type === 'UNKNOWN_INNER_ARTICLE') {
          type = `<div style="color:${innerUnknown.itemStyle.color}">类型: 未知文章, 可能已被删除或 Markdown 链接格式错误</div>`
        } else if (params.data.type === 'PUBLIC_ARTICLE') {
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
        layout: 'force', // 采用力引导布局
        top: 100,
        bottom: 100,
        draggable: false,
        symbolSize: 15,
        // animation: false,
        // animationDuration: 1000,
        // animationThreshold: 500,
        // animationEasingUpdate: 'quinticInOut',
        zoom: 0.5,
        roam: true,
        label: {
          show: false,
          position: 'bottom',
          formatter: '{b}'
          // formatter: (param: any) => {
          //   let len = param.name.length
          //   if (len < 20) {
          //     return param.name
          //   }
          //   return (param.name as string).substring(0, 15) + '...'
          // }
        },
        labelLayout: {
          // 标签重叠时进行遮盖
          hideOverlap: true
        },
        // itemStyle: {
        //   shadowColor: '#000000',
        //   shadowBlur: 10,
        //   shadowOffsetX: 2,
        //   shadowOffsetY: 3
        // },
        // autoCurveness: true,
        lineStyle: {
          color: isDark.value ? '#5E5E5E' : '#7E7E7E',
          width: 1,
          curveness: 0 // 直线或曲线
        },
        force: {
          layoutAnimation: true,
          repulsion: 500, // 节点之间的斥力因子。
          friction: 0.1, // 这个参数能减缓节点的移动速度. 取值范围 0 到 1, 越大越快, 值越大时, 节点之间会更加内聚, 否则会混在一起
          gravity: 1 // 节点受到的向中心的引力因子. 该值越大, 所有节点越往中心点靠拢.
        },
        // 箭头的开始, 结束图形
        edgeSymbol: ['circle', 'arrow'],
        // 箭头的开始, 结束图形大小
        edgeSymbolSize: [0, 9],
        // 连线的标题
        // edgeLabel: {
        //   show: false,
        //   fontSize: 10,
        //   width: 30,
        //   overflow: 'truncate'
        // },
        // =========== 高亮状态的图形样式 ===========
        emphasis: {
          focus: 'adjacency', // 聚焦关系图中的邻接点和边的图形。
          scale: false,
          lineStyle: {
            width: 1
          },
          itemStyle: {
            color: getPrimaryColor().color
          }
          // label: { show: true },
          // edgeLabel: { show: false },
        },
        // =========== 被淡出的节点样式 ===========
        blur: {
          itemStyle: {
            opacity: 0.1
          },
          lineStyle: {
            opacity: 0.1
          },
          label: {
            show: false
          },
          // 连线标题的样式
          edgeLabel: {
            show: false
          }
        },
        data: nodes,
        links: links
        // categories:
        //   nodes.length > 0
        //     ? nodes.map((item: any) => {
        //         return item.name
        //       })
        //     : ''
      }
    ]
  })

  chartGraph.on('graphroam', function (_params: any) {
    // console.log('graphroam', params)
    // // 1. 获取当前的 option
    const option = chartGraph.getOption()
    // // 2. 获取当前的缩放比例，默认是1[reference:3]
    const currentZoom = option.series[0].zoom || 1
    // console.log('currentZoom', currentZoom)
    if (currentZoom > 1.5) {
      if (option.series[0].label.show === false) {
        option.series[0].label = { show: true }
        option.series[0].blur.label = { show: true }
        setOption(option)
      }
    } else {
      if (option.series[0].label.show === true) {
        option.series[0].label = { show: false }
        option.series[0].blur.label = { show: false }
        setOption(option)
      }
    }
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
  debounce(() => {
    console.log('setOption')
    chartGraph.setOption(option, { lazyUpdate: true })
  }, 500)
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
