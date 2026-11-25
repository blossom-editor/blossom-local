<template>
  <div :class="['article-tabs', 'article-tabs-' + layout]" :style="layout === 'left' ? { width: leftWidth + 'px' } : undefined">
    <div ref="ListRef" class="tabs-list">
      <div
        v-for="(tab, index) in tabs"
        :key="tab.id"
        :class="['article-tab', { 'is-active': tab.id === activeId, 'is-pinned': tab.pinned, 'is-dragging': dragIndex === index }]"
        :title="tab.name"
        draggable="true"
        @click="activateTab(tab.id)"
        @mousedown.middle.prevent.stop="onClose(tab.id)"
        @contextmenu.prevent="openMenu($event, tab)"
        @dragstart="onDragStart($event, index)"
        @dragover.prevent="onDragOver($event, index)"
        @drop.prevent
        @dragend="onDragEnd">
        <span class="tab-name">{{ tab.name }}</span>
        <span class="tab-action">
          <!-- 置顶标签平时显示图钉, 鼠标移入后换成关闭按钮 -->
          <span v-if="tab.pinned" class="tab-pin iconbl bl-pin-fill"></span>
          <span class="tab-close iconbl bl-a-closeline-line" @click.stop="onClose(tab.id)" @mousedown.stop @dragstart.stop.prevent></span>
        </span>
      </div>
    </div>

    <!-- 左侧模式：右边缘拖宽手柄 -->
    <div v-if="layout === 'left'" class="tabs-resizer" @mousedown="onResizeStart"></div>

    <!-- 左侧模式：底部状态栏，与编辑区状态栏同高同字体同底色 -->
    <div v-if="layout === 'left'" class="tabs-status">
      <div class="status-item">标签:{{ tabs.length }}</div>
    </div>

    <!-- 右键菜单：菜单里的关闭都不会动置顶标签 -->
    <Teleport to="body">
      <div v-show="menu.show" ref="MenuRef" class="tabs-menu" :style="{ left: menu.x + 'px', top: menu.y + 'px' }" @contextmenu.prevent>
        <div class="menu-title">{{ menuTab?.name }}</div>
        <div class="menu-content">
          <div class="menu-item" :class="{ 'is-disabled': !menuTab || menuTab.pinned }" @click="runMenuAction('close')">
            <span class="iconbl bl-a-closeline-line"></span>关闭
          </div>
          <div class="menu-item" :class="{ 'is-disabled': !hasClosableOther }" @click="runMenuAction('other')">
            <span class="iconbl bl-close-all"></span>关闭其他
          </div>
          <div class="menu-item-divider"></div>
          <div class="menu-item" @click="runMenuAction('pin')">
            <span class="iconbl" :class="menuTab?.pinned ? 'bl-pin' : 'bl-pin-fill'"></span>
            {{ menuTab?.pinned ? '取消置顶' : '置顶' }}
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { provideKeyCurArticleInfo } from '@renderer/views/doc/doc'
import {
  activeId,
  activateTab,
  closeOtherTabs,
  closeTab,
  closeTabByMenu,
  leftWidth,
  moveTab,
  persistLeftWidth,
  setLeftWidth,
  tabs,
  togglePinned,
  trackTab
} from './scripts/article-tabs'
import type { TabItem, TabPosition } from './scripts/article-tabs'

/**
 * 标签页
 *
 * 只负责展示与交互: 增删标签、激活、排序全部在 scripts/article-tabs.ts 里,
 * 打开文章则通过 openRequest 交回文档树 —— 与点击树节点是完全同一条路径。
 * 由 ArticleIndex 按 position 决定挂载在顶部还是左侧, 同一时刻只有一个实例。
 */
defineProps<{
  /** 停靠形态, 由挂载点决定 */
  layout: TabPosition
}>()

const emits = defineEmits(['closeArticle'])

const ListRef = ref<HTMLElement>()

/**
 * 激活标签的唯一真源是编辑区实际加载的文章
 *
 * 点击树、点击标签、主进程通知重载, 最终都由 curArticle 收敛, 所以这里只做跟随:
 * 文章进了编辑区就一定有标签、并且一定是激活的那个, 不会出现"正文打开了却没有标签"
 * 或"高亮着一个没打开的标签"。这里只写标签状态, 绝不会反向触发打开, 不存在回路。
 */
const curArticle = inject(provideKeyCurArticleInfo)
watch(
  () => curArticle?.value?.id,
  () => {
    const doc = curArticle?.value
    if (!doc || doc.type !== 'ARTICLE') return
    // DocInfo.name 带后缀(如 foo.md), 标签上统一显示无后缀名称
    trackTab({ id: doc.id, name: doc.name.replace(/\.md$/i, ''), path: doc.path })
  }
)

//#region ----------------------------------------< 关闭 >--------------------------------------

const onClose = (id: string): void => {
  // 关闭前先判断是不是最后一个: 关掉最后一个要连正文一起收尾
  const isLast = tabs.value.length === 1
  closeTab(id)
  if (isLast) emits('closeArticle')
}

//#endregion

//#region ----------------------------------------< 右键菜单 >--------------------------------------

const MenuRef = ref<HTMLElement>()

/** 菜单坐标与目标标签; show 为 false 时只隐藏不销毁 */
const menu = ref({ show: false, x: 0, y: 0, tabId: '' })

/** 菜单指向的标签(菜单打开期间可能被别处关掉, 所以每次重新查) */
const menuTab = computed<TabItem | undefined>(() => tabs.value.find((tab) => tab.id === menu.value.tabId))

/** 选中项之外还有没有能关的标签, 用于「关闭其他」置灰(置顶标签不算) */
const hasClosableOther = computed<boolean>(() => tabs.value.some((tab) => tab.id !== menu.value.tabId && !tab.pinned))

const closeMenu = (): void => {
  if (!menu.value.show) return
  menu.value.show = false
  document.removeEventListener('mousedown', onDocMousedown, true)
  document.removeEventListener('contextmenu', onDocContextmenu, true)
}

const onDocMousedown = (event: MouseEvent): void => {
  if (MenuRef.value?.contains(event.target as Node)) return
  closeMenu()
}

const onDocContextmenu = (event: MouseEvent): void => {
  if (MenuRef.value?.contains(event.target as Node)) return
  closeMenu()
}

const openMenu = (event: MouseEvent, tab: TabItem): void => {
  menu.value = { show: true, x: event.clientX, y: event.clientY, tabId: tab.id }
  nextTick(() => {
    // 先让菜单渲染出来再量尺寸, 贴右边/下边时把菜单收回视口内
    const el = MenuRef.value
    if (el) {
      menu.value.x = Math.max(4, Math.min(event.clientX, window.innerWidth - el.offsetWidth - 4))
      menu.value.y = Math.max(4, Math.min(event.clientY, window.innerHeight - el.offsetHeight - 4))
    }
    /*
     * 监听放到下一帧再挂:
     * 当前这次 contextmenu 事件还在冒泡, 挂到 document 上会被它自己触发, 菜单刚开就被关掉
     */
    document.addEventListener('mousedown', onDocMousedown, true)
    document.addEventListener('contextmenu', onDocContextmenu, true)
  })
}

/**
 * 执行菜单动作
 * 置灰项靠 CSS 的 pointer-events: none 挡住, 这里不再做可用性判断
 */
const runMenuAction = (action: 'close' | 'other' | 'pin'): void => {
  const id = menu.value.tabId
  closeMenu()
  if (!id) return
  if (action === 'pin') {
    togglePinned(id)
    return
  }
  if (action === 'close') closeTabByMenu(id)
  else closeOtherTabs(id)
  // 关完一个都不剩: 正文也一起收尾(由 ArticleIndex 先保存再清空)
  if (tabs.value.length === 0) emits('closeArticle')
}

//#endregion

//#region ----------------------------------------< 拖拽排序 >--------------------------------------

/** 正在被拖拽的标签下标, -1 表示没有拖拽 */
const dragIndex = ref(-1)

const onDragStart = (event: DragEvent, index: number): void => {
  // 从关闭按钮起手不触发拖拽(按钮自身已 stop.prevent, 这里再兜底一次)
  if ((event.target as HTMLElement | null)?.closest('.tab-close')) {
    event.preventDefault()
    return
  }
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    // 不 setData 时部分浏览器不会真正开始拖拽
    event.dataTransfer.setData('text/plain', String(index))
  }
}

/**
 * 实时换位: 拖到哪个标签上就和它换位置, 松手即完成
 * (不做插入指示线, 因为在顶部换行的场景里, 指示线反而不如直接换位直观)
 *
 * 置顶标签锁在队首, 越界的落点会被 moveTab 夹到边界上,
 * 所以这里必须用它的返回值更新拖拽下标, 否则下标会和真实位置错开
 */
const onDragOver = (_event: DragEvent, index: number): void => {
  if (dragIndex.value < 0 || dragIndex.value === index) return
  dragIndex.value = moveTab(dragIndex.value, index)
}

const onDragEnd = (): void => {
  dragIndex.value = -1
}

//#endregion

//#region ----------------------------------------< 激活项滚入可见 >--------------------------------------

/**
 * 激活项滚入可见(只有左侧竖排需要, 顶部是换行不滚动)
 *
 * 用 scrollTop 手算而不是 scrollIntoView: 后者会把祖先滚动容器一起滚走,
 * 见 article-index.scss 里关于 overflow: clip 的说明
 */
const ensureActiveVisible = (): void => {
  const list = ListRef.value
  const ele = list?.querySelector('.article-tab.is-active') as HTMLElement | null
  if (!list || !ele) return
  const listRect = list.getBoundingClientRect()
  const tabRect = ele.getBoundingClientRect()
  if (tabRect.top < listRect.top) {
    list.scrollTop += tabRect.top - listRect.top
  } else if (tabRect.bottom > listRect.bottom) {
    list.scrollTop += tabRect.bottom - listRect.bottom
  }
}

watch(activeId, () => nextTick(ensureActiveVisible))

//#endregion

//#region ----------------------------------------< 左侧拖宽 >--------------------------------------

/**
 * 拖宽
 *
 * 不复用 useResizeVertical: 它会把宽度同时写给两个元素, 而这里只需要改标签条自己
 * (编辑区靠 flex 自动吃掉剩余宽度), 否则会和文档列表的拖拽互相覆盖
 */
let removeResizeListeners: (() => void) | undefined

const onResizeStart = (event: MouseEvent): void => {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = leftWidth.value
  document.body.style.cursor = 'ew-resize'

  const onMousemove = (e: MouseEvent): void => setLeftWidth(startWidth + e.clientX - startX)
  const onMouseup = (): void => {
    document.body.style.cursor = 'auto'
    removeResizeListeners?.()
    removeResizeListeners = undefined
    persistLeftWidth()
  }

  removeResizeListeners = (): void => {
    document.removeEventListener('mousemove', onMousemove)
    document.removeEventListener('mouseup', onMouseup)
  }
  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mouseup', onMouseup)
}

onBeforeUnmount(() => {
  removeResizeListeners?.()
  document.removeEventListener('mousedown', onDocMousedown, true)
  document.removeEventListener('contextmenu', onDocContextmenu, true)
})

//#endregion
</script>

<style scoped lang="scss">
.article-tabs {
  flex: none;
  position: relative;
  display: flex;
  font-size: 12px;
  @include themeColor(#7e7e7e, #909090);

  .tabs-list {
    display: flex;
    min-width: 0;
    min-height: 0;
  }

  .article-tab {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    gap: 6px;
    min-width: 0;
    cursor: pointer;
    // transition:
    //   background-color 0.15s,
    //   color 0.15s;

    .tab-name {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /**
     * 星标与关闭共用同一格
     * 包一层是为了让两个图标叠在一起: 平时显示星标(仅置顶标签), 鼠标移入换成关闭
     */
    .tab-action {
      flex: none;
      position: relative;
      width: 14px;
      height: 14px;

      .tab-pin,
      .tab-close {
        position: absolute;
        inset: 0;
      }

      .tab-pin {
        font-size: 10px;
        line-height: 14px;
        text-align: center;
        color: var(--el-color-primary);
        transition: 0.15s;
      }
    }

    .tab-close {
      flex: none;
      width: 14px;
      height: 14px;
      line-height: 14px;
      text-align: center;
      border-radius: 3px;
      font-size: 10px;
      opacity: 0;
      transition: 0.15s;

      &:hover {
        background-color: var(--el-color-primary-light-7);
      }
    }

    &:hover {
      color: var(--bl-text-color);
      background-color: var(--el-color-primary-light-9);

      .tab-close {
        opacity: 1;
      }
    }

    &.is-active {
      // color: #ffffff;
      // background-color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-8);

      .tab-close {
        opacity: 1;
      }
    }

    // 置顶标签: 平时显示星标, 鼠标移入才出现关闭按钮
    // (放在 .is-active 之后: 两者优先级相同, 靠顺序覆盖"激活项常显关闭")
    &.is-pinned {
      .tab-pin {
        opacity: 1;
      }

      .tab-close {
        opacity: 0;
      }

      &:hover {
        .tab-pin {
          opacity: 0;
        }

        .tab-close {
          opacity: 1;
        }
      }
    }

    &.is-dragging {
      opacity: 0.45;
    }
  }

  /**
   * 拖宽手柄
   * 放在 .tabs-list 之外: 左侧模式下列表是滚动容器, 放在里面会被 overflow 裁掉
   */
  .tabs-resizer {
    position: absolute;
    top: 0;
    right: -3px;
    width: 3px;
    height: 100%;
    z-index: 1002;
    background-color: transparent;
    cursor: ew-resize;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--el-color-primary);
    }
  }
}

/** 顶部: 占满宽度, 标签填满一行后自动换行(不限行数, 高度随行数增长) */
.article-tabs-top {
  width: 100%;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--bl-editor-gutters-bg-color);

  .tabs-list {
    flex: 1;
    flex-wrap: wrap;
    gap: 3px;
  }

  .article-tab {
    height: 23px;
    max-width: 180px;
    padding: 0 6px 0 10px;
    border-radius: 4px;
  }
}

/** 左侧: 竖向排列, 标签多时纵向滚动; 宽度由 JS 控制(150~350) */
.article-tabs-left {
  flex-direction: column;
  height: 100%;
  // 内边距挪到 .tabs-list 上: 底部状态栏要贴着两侧边框, 不能被容器内边距顶进来
  border-right: 1px solid var(--el-border-color);

  .tabs-list {
    flex: 1;
    flex-direction: column;
    gap: 3px;
    padding: 4px;
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      border-radius: 2px;
    }
  }

  /**
   * 底部状态栏
   * 高度 / 字体 / 底色 / 分隔线全部对齐 editor-status-root, 左侧停靠时与编辑区状态栏连成一条
   */
  .tabs-status {
    flex: none;
    @include flex(row, flex-end, center);
    @include box(100%, 28px);
    @include font(10px, 500);
    color: var(--bl-editor-color);
    background-color: var(--bl-editor-gutters-bg-color);
    border-top: 1px solid var(--el-border-color);

    .status-item {
      @include flex(row, flex-start, center);
      height: 100%;
      padding: 0 5px;
    }
  }

  .article-tab {
    flex: none;
    height: 23px;
    padding: 0 4px 0 8px;
    border-radius: 4px;

    .tab-name {
      flex: 1;
    }

    &.is-active {
      // box-shadow: inset 2px 0 0 var(--el-color-primary);
    }
  }
}

/**
 * 标签右键菜单
 *
 * Teleport 挂到 body, 用 fixed 跟随鼠标; scoped 样式依然生效
 * (Vue 会给 teleport 出去的节点打上 data-v 属性)
 */
.tabs-menu {
  @include box(150px, auto);
  @include themeBg(#f9f9f9, #333434);
  @include themeShadow(2px 2px 5px 1px rgba(49, 49, 49, 0.2), 2px 3px 7px 2px #0f0f0f);
  position: fixed;
  z-index: 3000;
  border-radius: 5px;
  font-size: 12px;

  .menu-title {
    @include ellipsis();
    padding: 5px 10px;
    font-size: 13px;
    color: var(--el-color-primary);
  }

  .menu-content {
    border-top: 1px solid var(--el-border-color);
    padding: 5px 0;
    color: var(--bl-text-color);

    .menu-item {
      @include flex(row, flex-start, center);
      padding: 5px 5px 5px 10px;
      margin: 0 5px 5px 5px;
      border-radius: 5px;
      line-height: 0.9;
      cursor: pointer;

      .iconbl {
        margin-right: 6px;
      }

      &:hover {
        background: var(--el-color-primary-light-8);
      }

      &:last-child {
        margin-bottom: 0;
      }

      // 不可用项: 连 hover 一起挡掉, 点击也落不到它身上
      &.is-disabled {
        opacity: 0.4;
        pointer-events: none;
      }
    }

    .menu-item-divider {
      height: 1px;
      border-bottom: 1px solid var(--el-border-color);
      margin: 0 0 5px 0;
      pointer-events: none;
    }
  }
}
</style>
