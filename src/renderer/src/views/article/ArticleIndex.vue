<template>
  <div class="index-article-root">
    <!-- 文档列表 -->
    <div class="doc-container" ref="DocsRef" v-show="docsExpand">
      <div class="doc-tree-menu-container">
        <ArticleTreeDocs @click-doc="clickCurDoc" @clear-cur-doc="clearCurDoc" ref="ArticleTreeDocsRef"></ArticleTreeDocs>
      </div>
      <div class="doc-tree-bottom"></div>
    </div>
    <div class="resize-divider-vertical" ref="ResizeDocsDividerRef"></div>

    <!-- 编辑区 -->
    <div class="editor-container" ref="EditorContainerRef" v-loading="editorLoading" element-loading-text="正在读取文章内容...">
      <!-- 工具栏 -->
      <div class="editor-tools">
        <EditorTools
          :source-visible="sourceVisible"
          @save="saveCurArticleContent()"
          @command="handleCommand"
          @toggle-source="toggleSource"
          @scroll-top="scrollToTop"
          @scroll-bottom="scrollToBottom">
        </EditorTools>
      </div>

      <!-- 主体：所见即所得编辑器 + 源码分屏 + 右侧目录 -->
      <div class="editor-body" :style="editorFontStyle">
        <!-- 编辑器列：markdown 挂载点 + 未选中文章时的占位 -->
        <div class="editor-main">
          <!-- milkdown 挂载点，同时是滚动容器 -->
          <div class="editor-wysiwyg" ref="EditorRef" @click.right="handleEditorClickRight" @scroll.passive="handleEditorScroll"></div>

          <!-- 正文查找框（Ctrl + F） -->
          <EditorSearch
            ref="SearchRef"
            :visible="search.show"
            :total="search.total"
            :current="search.current"
            @search="doSearch"
            @next="searchNext"
            @prev="searchPrev"
            @close="closeSearch" />
          <div v-if="!curArticle" class="ep-placeholder">
            <ArticleIndexPlaceholder></ArticleIndexPlaceholder>
          </div>
        </div>

        <!-- markdown 源码分屏（只读） -->
        <EditorSourcePane v-if="sourceVisible" :markdown="sourceMarkdown" @refresh="refreshViewData" @close="toggleSource"> </EditorSourcePane>

        <!-- 右侧目录 + 图片 -->
        <EditorToc :headings="articleToc" :images="articleImg" @click-heading="toHeading" @refresh-images="refreshCache" @click-image="showPicInfo">
        </EditorToc>
      </div>

      <!-- 底部状态栏 -->
      <div class="editor-status">
        <EditorStatus :render-interval="renderInterval" ref="EditorStatusRef"></EditorStatus>
      </div>
    </div>

    <PictureViewerInfo ref="PictureViewerInfoRef" @saved="refreshCache"></PictureViewerInfo>

    <!-- 图片设置面板（点击图片上的「编辑」按钮时出现） -->
    <Teleport to="body">
      <div
        v-show="imageTooltip.show"
        ref="ImagePanelRef"
        class="bl-image-tooltip"
        :style="{ left: imageTooltip.left + 'px', top: imageTooltip.top + 'px' }">
        <div class="bl-image-tooltip-row">
          <span class="label">地址</span>
          <el-input
            v-model="imageTooltip.src"
            size="small"
            placeholder="图片库文件名 或 https:// 链接"
            @change="applyImageSrc"
            @keydown.enter="applyImageSrc" />
        </div>
        <div class="bl-image-tooltip-row">
          <span class="label">宽度</span>
          <el-input-number
            v-model="imageTooltip.width"
            :min="0"
            :max="3000"
            :step="10"
            size="small"
            style="width: 104px"
            @change="applyImageTooltip" />
          <!--
            单位切换用两个按钮而不是 el-select 下拉：
            面板是 position:fixed 的浮层，el-select 的弹层 teleport 出去后
            定位会跑到屏幕左上角，按钮切换则完全没有弹层问题
          -->
          <div class="bl-unit-switch">
            <span :class="['unit-item', imageTooltip.unit === 'px' ? 'is-active' : '']" title="像素" @click="setImageUnit('px')"> px </span>
            <span :class="['unit-item', imageTooltip.unit === '%' ? 'is-active' : '']" title="百分比" @click="setImageUnit('%')"> % </span>
          </div>
        </div>
        <div class="bl-image-tooltip-row">
          <span class="label">阴影</span>
          <el-switch v-model="imageTooltip.shadow" size="small" @change="applyImageTooltip" />
          <div class="spacer"></div>
          <el-button text size="small" @click="openImageInfoFromTooltip">图片信息</el-button>
        </div>
      </div>
    </Teleport>

    <!-- 编辑器右键菜单 -->
    <Teleport to="body">
      <div
        v-show="editorRightMenu.show"
        class="editor-right-menu"
        :style="{ left: editorRightMenu.clientX + 'px', top: editorRightMenu.clientY + 'px' }">
        <div class="menu-content">
          <div class="menu-item" @click="rightMenuCopy"><span class="iconbl bl-copy-line"></span>复制</div>
          <div class="menu-item" @click="rightMenuPaste"><span class="iconbl bl-a-texteditorpastetext-line"></span>黏贴</div>
          <div class="menu-item" @click="selectPicAndMove"><span class="iconbl bl-image--line"></span>插入图片</div>
          <div class="menu-item" @click="upper"><span class="iconbl bl-daxie"></span>大写</div>
          <div class="menu-item" @click="lower"><span class="iconbl bl-xiaoxie"></span>小写</div>
          <div class="menu-item" @click="openExtenal('https://katex.org/#demo')">
            <span class="iconbl bl-a-texteditorsuperscript-line"></span>Katex 在线校验
          </div>
          <div class="menu-item" @click="openExtenal('https://mermaid.live/edit')">
            <span class="iconbl bl-a-statisticalviewpiechart3-line"></span>Mermaid 在线校验
          </div>
          <div class="menu-item" @click="openExtenal('https://www.emojiall.com/zh-hans')">
            <span style="margin-right: 4px; padding: 2px 0">😉</span>Emoji网站
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 文章引用预览浮层 -->
    <Teleport to="body">
      <div v-if="articleReferenceView.show" ref="ArticleViewRef" class="article-view-absolute" :style="articleReferenceView.style">
        <div class="content-view" :style="editorFontStyle">
          {{ articleReferenceView.html }}
        </div>
        <bl-row v-if="articleReferenceView.articleId !== '' && articleReferenceView.path !== ''" class="workbench" just="space-between">
          <div class="btns">
            <div @click="openArticleWindow(articleReferenceView.articleId)">新窗口打开</div>
            <div @click="openFileLocation(articleReferenceView.path)">查看原文件</div>
          </div>
          <div class="infos">{{ articleReferenceView.name }}</div>
        </bl-row>
      </div>
    </Teleport>

    <!-- 公式编辑弹窗（双击编辑器中的公式时打开） -->
    <el-dialog class="bl-dialog-hidden-header-fixed-body" v-model="mathDialog.show" width="580px" :close-on-click-modal="false" append-to-body>
      <div style="padding: 20px">
        <div style="margin-bottom: 5px">编辑公式内容</div>
        <el-input
          v-model="mathDialog.value"
          type="textarea"
          :rows="8"
          resize="vertical"
          placeholder="例如：E = mc^2 ，行内公式用 $...$ 包裹，块级公式放在单独一段" />
        <div class="bl-math-editor-preview" ref="MathPreviewRef"></div>
      </div>
      <template #footer>
        <div style="padding: 10px">
          <el-button @click="mathDialog.show = false">取消</el-button>
          <el-button type="primary" @click="confirmMath">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// vue
import {
  ref,
  shallowRef,
  provide,
  computed,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  defineAsyncComponent,
  watch,
  nextTick,
  reactive
} from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@renderer/stores/config'
import { useDocLibStore } from '@renderer/stores/docLib'
import { selectPicAndMoveDialog } from '@renderer/api/picture'
import { openFileLocation } from '@renderer/api/docLib'
import { articleInfoApi, saveArticleContentApi } from '@renderer/api/blossom'
// utils
import { isBlank, isNotBlank, isNull } from '@renderer/assets/utils/obj'
import { isElectron, pathJoin } from '@renderer/assets/utils/util'
import { openExtenal, readText, openNewArticleWindow } from '@renderer/assets/utils/electron'
// component
import ArticleTreeDocs from './ArticleTreeDocs.vue'
import ArticleIndexPlaceholder from './ArticleIndexPlaceholder.vue'
import EditorTools from './EditorTools.vue'
import EditorToc from './EditorToc.vue'
import EditorSourcePane from './EditorSourcePane.vue'
import EditorSearch from './EditorSearch.vue'
// ts
import { treeToInfo, provideKeyCurArticleInfo, isArticle, DefaultDocTree, getDocByPath } from '@renderer/views/doc/doc'
import { ArticleReference, countWords, parseImageRefs } from './scripts/article'
import { picCacheWrapper, protocolWrapper, picCacheRefresh, uploadForm, DefaultPicture } from '@renderer/views/picture/scripts/picture'
import { useResizeVertical } from '@renderer/scripts/resize-devider-vertical'
import { useArticleHtmlEvent } from './scripts/article-html-event'
// milkdown
import { WysiwygEditor, REQUEST_EVENT } from './scripts/milkdown/editor'
import type { HeadingItem, EditorRequestDetail } from './scripts/milkdown/editor'
import { LINK_CLICK_EVENT, MATH_EDIT_EVENT } from './scripts/milkdown/constants'
import type { MathEditDetail } from './scripts/milkdown/plugins/math'
import { IMAGE_CLICK_EVENT, parseImageAlt, primeImageSizes } from './scripts/milkdown/plugins/image'
import type { ImageClickDetail } from './scripts/milkdown/plugins/image'
import type { LinkClickDetail } from './scripts/milkdown/plugins/link'
import type { EditorCommandName } from './scripts/milkdown/commands'
import katex from 'katex'

//#region ----------------------------------------< 页面参数 >--------------------------------------

const docLibStore = useDocLibStore()
/**
 * ⚠️ 这里**不能**写成 `const { editorStyle } = useConfigStore()`：
 * 解构拿到的是普通对象，store 里 `editorStyle` 被整体替换后，
 * 页面上的字体 / 字号就不会再更新（旧版本「设置不生效」的根因）。
 * 统一通过 store 读取，保持响应式。
 */
const configStore = useConfigStore()
const PictureViewerInfo = defineAsyncComponent(() => import('@renderer/views/picture/PictureViewerInfo.vue'))
const EditorStatus = defineAsyncComponent(() => import('./EditorStatus.vue'))

const DocsRef = ref()
const EditorContainerRef = ref()
const ResizeDocsDividerRef = ref()
/** milkdown 的挂载容器，同时是滚动容器 */
const EditorRef = ref<HTMLElement>()
const EditorStatusRef = ref()
const MathPreviewRef = ref<HTMLElement>()

/**
 * 编辑区字体样式
 *
 * 只取真正合法的 CSS 属性，避免把 defaultPreLanguage / maxWordsCount 这类配置项
 * 一起塞进 style（旧代码直接绑定了整个 editorStyle 对象，属于历史遗留问题）
 *
 * `--bl-code-font-size` 是给多行代码块（CodeMirror）用的：CodeMirror 的 DOM 在
 * 编辑器内部，样式表不好直接拿到设置项，所以用 CSS 变量下发，见 styles/bl-milkdown.css。
 */
const editorFontStyle = computed(() => ({
  fontFamily: configStore.editorStyle.fontFamily,
  fontSize: configStore.editorStyle.fontSize,
  '--bl-code-font-size': configStore.editorStyle.codeFontSize || '13px'
}))

/** 文档列表展开 / 收起 */
const docsExpand = ref<boolean>(true)
/** 是否显示 markdown 源码分屏 */
const sourceVisible = ref(false)

/** 源码分屏内容 */
const sourceMarkdown = ref('')
/** 目录 */
const articleToc = shallowRef<HeadingItem[]>([])
/** 文章引用的图片 */
const articleImg = shallowRef<ArticleReference[]>([])
/** markdown 导出用时（状态栏展示） */
const renderInterval = ref(0)

let isMounted = false

onMounted(async () => {
  // 编辑器需要先挂载 DOM 再创建，因此这里是异步初始化
  await ensureEditor()
  initAutoSaveInterval()
  listenMainMessage()
  bindEditorEvents()
  // 无条件绑定：onActivated 可能已经先跑过（keep-alive 首次挂载两者都会触发）
  enterView()
  bindKeys()
})

onBeforeUnmount(() => {
  unbindKeys()
  closeImageTooltip()
  removeListenerEditorRightMenu()
  distoryAutoSaveInterval()
  unbindEditorEvents()
  wysiwyg?.destroy()
  wysiwyg = undefined
})

/**
 * 编辑器滚动位置
 *
 * 页面被 keep-alive 缓存，切走时 Vue 会把子树从文档里摘下来，滚动容器的
 * `scrollTop` 会被浏览器清零 —— 所以在 deactivated 里读已经来不及了。
 * 这里改成：每次滚动都记录（滚动事件里读到的永远是真实值），
 * 切回来时再写回去。
 */
let editorScrollTop = 0

/**
 * 每篇文章各自的滚动位置（仅本次运行期间有效）
 *
 * 放在模块作用域而不是组件里：页面虽然是 keep-alive 缓存的，但组件一旦重建，
 * 这份记忆不该丢。应用重启后自然清空 —— 也就是「本次没打开过的文章从顶部开始」。
 */
const articleScrollMemory = new Map<string, number>()

/** 滚动时记录位置（passive，不影响滚动性能） */
const handleEditorScroll = () => {
  const el = EditorRef.value
  if (!el) return
  editorScrollTop = el.scrollTop
  // 记住当前文章读到哪了，下次打开这篇文章原位恢复
  if (isArticle(curArticle.value)) articleScrollMemory.set(curArticle.value!.id, el.scrollTop)
  // 图片设置面板跟随图片滚动
  if (imageTooltip.show) positionImageTooltip()
}

/**
 * 把编辑区滚到指定位置
 *
 * 切换文章时正文是刚塞进去的，图片等资源可能还没撑开高度，所以除了 nextTick
 * 之外再等一帧补一次；`scrollTop` 超过可滚动上限时浏览器会自动 clamp，不会越界。
 *
 * @param top 目标 scrollTop
 */
const applyEditorScroll = (top: number) => {
  editorScrollTop = top
  nextTick(() => {
    const el = EditorRef.value
    if (!el) return
    el.scrollTop = top
    requestAnimationFrame(() => {
      // 这一帧里正文高度才稳定（图片占位 / 代码高亮），再补一次
      if (EditorRef.value) EditorRef.value.scrollTop = top
    })
  })
}

/**
 * 还原滚动位置
 *
 * 需要等两帧：第一帧组件重新插入文档，第二帧 milkdown 内容尺寸才稳定，
 * 否则设置 scrollTop 会被随后的布局修正覆盖掉。
 */
const restoreEditorScroll = () => {
  if (editorScrollTop <= 0) return
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (EditorRef.value) EditorRef.value.scrollTop = editorScrollTop
      })
    })
  })
}

onActivated(() => {
  if (isMounted) {
    enterView()
    bindKeys()
    restoreEditorScroll()
  }
  isMounted = true
})

onDeactivated(() => {
  // 注意：这里不要再读 scrollTop —— keep-alive 已经把 DOM 摘下来，读到的是 0，
  // 会把滚动过程中记录的真实位置覆盖掉。
  exitView()
  unbindKeys()
})

watch(
  () => docLibStore.cur?.path,
  (newPath) => {
    if (isNotBlank(newPath)) {
      setNewState('')
      curDoc.value = undefined
      curArticle.value = undefined
    }
  }
)

//#endregion

//#region ----------------------------------------< 文档选择与保存 >--------------------------------------

const editorLoading = ref(false)
const ArticleTreeDocsRef = ref()
/** 当前选中的文档（可能是文件夹） */
const curDoc = ref<DocInfo>()
/** 当前选中的文章 */
const curArticle = ref<DocInfo>()

/** 自动保存间隔：5 分钟无保存动作则自动保存 */
const authSaveMs = 5 * 60 * 1000
/** 编辑器内容是否发生变更，避免无意义的保存请求 */
let articleChanged = false
/** 上次保存时间 */
let lastSaveTime: number = new Date().getTime()
let autoSaveInterval: NodeJS.Timeout
let editorLoadingTimeout: NodeJS.Timeout

provide(provideKeyCurArticleInfo, curArticle)

/**
 * 点击文档树的回调
 *
 * @param tree 选中的文档
 * @param isClickRepeat 是否允许重复点击同一篇文章（主进程通知内容被外部修改时使用）
 */
const clickCurDoc = async (tree: DocTree, isClickRepeat: boolean = false) => {
  const doc: DocInfo = treeToInfo(tree)
  curDoc.value = doc
  if (doc.type !== 'ARTICLE') {
    return
  }
  if (isArticle(curArticle.value) && curArticle.value!.id == doc.id && !isClickRepeat) {
    return
  }

  // 离开这篇文章前，把它读到的位置记下来
  if (isArticle(curArticle.value) && EditorRef.value) {
    articleScrollMemory.set(curArticle.value!.id, EditorRef.value.scrollTop)
  }

  closeSearch()
  editorLoadingTimeout = setTimeout(() => (editorLoading.value = true), 100)
  // 切换文章前先保存当前文章
  await saveCurArticleContent(true)
  await ensureEditor()

  await articleInfoApi({ id: doc.id })
    .then(async (resp) => {
      if (isNull(resp) || isNull(resp.data)) {
        return
      }
      curArticle.value = resp.data
      const markdown = resp.data!.markdown ?? ''
      curArticle.value!.words = isBlank(markdown) ? 0 : countWords(markdown)
      /*
       * 先把图片的固有尺寸预热一遍再渲染正文：
       * 这样 <img> 一进 DOM 就带着 width/height，浏览器能提前占位，
       * 图片陆续加载时不会把下方内容顶下去（长文章尤其明显）。
       */
      await primeImageSizes(parseImageRefs(markdown).map((item) => item.url))
      setNewState(markdown, curArticle.value!.words)
    })
    .finally(() => {
      if (editorLoadingTimeout) clearTimeout(editorLoadingTimeout)
      editorLoading.value = false
      articleChanged = false
    })

  closeImageTooltip()
  // 恢复这篇文章上次读到的位置；本次运行没打开过就从顶部开始
  applyEditorScroll(articleScrollMemory.get(doc.id) ?? 0)
}

/**
 * 清空当前文档
 */
const clearCurDoc = (tree: DocTree) => {
  if (curArticle.value && curArticle.value!.id === tree.id) {
    curArticle.value = undefined
    setNewState('')
  }
  if (curDoc.value && curDoc.value!.id === tree.id) {
    curDoc.value = undefined
  }
}

/**
 * 保存文章正文
 *
 * @param auto 是否自动保存（自动保存不弹提示）
 */
const saveCurArticleContent = async (auto: boolean = false) => {
  if (!isArticle(curArticle.value) || !wysiwyg) {
    return
  }
  const saveCallback = () => {
    EditorStatusRef.value?.isSave()
    if (!auto) {
      ElMessage.success({ message: '保存成功', duration: 1000, offset: 70, grouping: true })
    }
  }
  if (!articleChanged) {
    console.info('%c文档内容无变化, 无需保存', 'background:#057620;color:#fff;padding-top:2px')
    saveCallback()
    return
  }

  articleChanged = false
  const content = wysiwyg.getMarkdown()
  /*
   * 序列化失败（返回 null）：绝对不能把空内容写盘，否则整篇文章就被清空了。
   * 这里保持「有改动」状态，等下一次保存再试，并明确告诉用户本次没保存。
   */
  if (content === null) {
    articleChanged = true
    ElMessage.error({ message: '读取正文失败，本次未保存，请重试', duration: 2000, offset: 70, grouping: true })
    return
  }
  const req: SaveFileContentReq = { id: curArticle.value!.id!, content }
  curArticle.value!.words = countWords(content)

  await saveArticleContentApi(req)
    .then(() => {
      lastSaveTime = new Date().getTime()
      wysiwyg?.markClean()
      saveCallback()
    })
    .catch(() => {
      articleChanged = true
    })
}

const initAutoSaveInterval = () => {
  autoSaveInterval = setInterval(() => {
    const current = new Date().getTime()
    if (current - lastSaveTime > authSaveMs) {
      autoSave()
    }
  }, 30 * 1000)
}

const distoryAutoSaveInterval = () => clearInterval(autoSaveInterval)

const autoSave = () => saveCurArticleContent(true)

/** 进入页面时保存并定位 */
const enterView = () => {
  autoSave()
}

/** 退出页面时保存 */
const exitView = () => autoSave()

const { hideOne, resotreOne } = useResizeVertical(DocsRef, EditorContainerRef, ResizeDocsDividerRef, undefined, {
  persistent: true,
  keyOne: 'article_docs_width',
  keyTwo: 'article_editor_preview_width',
  defaultOne: '250px',
  defaultTwo: 'calc(100% - 250px)',
  maxOne: 700,
  minOne: 250
})

//#endregion

//#region ----------------------------------------< milkdown 编辑器 >--------------------------------------

/** 编辑器实例，创建完成前为 undefined */
let wysiwyg: WysiwygEditor | undefined
/** 初始化中的 Promise，避免重复创建 */
let editorPromise: Promise<void> | null = null

/**
 * 确保编辑器已经创建完成
 */
const ensureEditor = async () => {
  if (!editorPromise) {
    editorPromise = initEditor()
  }
  return editorPromise
}

/**
 * 创建 milkdown 编辑器
 *
 * 这里只做「装配」，所有编辑器内部实现都在 scripts/milkdown 下，
 * 页面层拿到的只是一个语义化的包装对象。
 */
const initEditor = async () => {
  await nextTick()
  if (!EditorRef.value) return

  wysiwyg = await WysiwygEditor.create({
    root: EditorRef.value,
    defaultValue: '',
    // 内容变化：标记脏数据 + 防抖刷新目录 / 源码 / 字数
    onChange: () => {
      articleChanged = true
      EditorStatusRef.value?.noSave()
      debounceRefresh()
    },
    // 拖拽 / 黏贴图片
    uploadImage: (file: File) =>
      new Promise<string>((resolve) => {
        if (!isArticle(curArticle.value)) return resolve('')
        uploadForm(curArticle.value!.id, file, (fileName: string) => resolve(fileName))
      })
  })
}

/**
 * 把 markdown 设置到编辑器中
 *
 * @param md markdown 内容
 * @param words 字数（可选，避免重复计算）
 */
const setNewState = (md: string, words: number = 0) => {
  if (!wysiwyg) {
    // 编辑器还没就绪时先忽略，等 clickCurDoc 的 ensureEditor 完成后再设置
    return
  }
  wysiwyg.setMarkdown(md ?? '')
  articleChanged = false
  articleToc.value = []
  articleImg.value = []
  sourceMarkdown.value = md ?? ''
  if (words > 0) curArticle.value && (curArticle.value.words = words)
  /*
   * 等一帧再序列化 / 解析目录。
   *
   * 长文档 getMarkdown() 要几百毫秒，如果和 setMarkdown 同步执行，
   * 浏览器要等这些都算完才能画第一帧 —— 表现就是「点开文章后顿一下才出现」。
   * 放到下一帧，正文先画出来，再慢慢算目录与源码。
   */
  requestAnimationFrame(() => refreshViewData())
}

/** 防抖刷新视图数据 */
let refreshTimer: NodeJS.Timeout | undefined
/** 上一次导出 markdown 的长度，用于对大文档做自适应降频 */
let lastMarkdownSize = 0
const debounceRefresh = (time?: number) => {
  if (refreshTimer) clearTimeout(refreshTimer)
  // 大文档序列化开销明显，按「最大渲染字数」设置降低刷新频率，避免输入卡顿
  const huge = lastMarkdownSize > (configStore.editorStyle.maxWordsCount || 120000)
  const delay = time ?? (huge ? 1500 : 400)
  refreshTimer = setTimeout(refreshViewData, delay)
}

/**
 * 刷新目录、源码分屏、图片列表、字数
 *
 * 这些数据都来自同一份 markdown，统一在这里计算，避免多处重复序列化。
 */
const refreshViewData = () => {
  if (!wysiwyg) return
  const begin = Date.now()
  const markdown = wysiwyg.getMarkdown()
  renderInterval.value = Date.now() - begin
  // 序列化失败（极少见）：保留上一次的目录 / 源码，不要用空内容把界面刷没
  if (markdown === null) return
  lastMarkdownSize = markdown.length

  sourceMarkdown.value = markdown
  articleToc.value = wysiwyg.getHeadings()
  articleImg.value = parseImageRefs(markdown).map((item) => ({
    targetId: curArticle.value?.id ?? '',
    targetName: curArticle.value?.name ?? '',
    // 渲染用地址：本地图片走 blossom 自定义协议，并带上缓存时间戳
    targetUrl: picCacheWrapper(protocolWrapper(item.url)),
    type: 'PICTURE'
  }))
  if (curArticle.value) {
    curArticle.value.words = countWords(markdown)
  }
}

/**
 * 工具栏命令分发
 *
 * 大部分命令直接转给编辑器，只有需要弹窗的（图片）由页面处理。
 */
const handleCommand = (name: EditorCommandName, payload?: any) => {
  if (!wysiwyg) return
  if (name === 'image') return selectPicAndMove()
  wysiwyg.run(name, payload)
}

/** 切换源码分屏 */
const toggleSource = () => {
  sourceVisible.value = !sourceVisible.value
  if (sourceVisible.value) refreshViewData()
}

/** 目录点击跳转 */
const toHeading = (index: number) => wysiwyg?.scrollToHeading(index)

/** 回到顶部 / 前往底部（工具栏按钮） */
const scrollToTop = () => wysiwyg?.scrollToTop()
const scrollToBottom = () => wysiwyg?.scrollToBottom()

//#endregion

//#region ----------------------------------------< 编辑器内部事件 >--------------------------------------

/**
 * 监听编辑器内部派发的自定义事件
 *
 * 这些事件都从编辑器内部 DOM 冒泡到 EditorRef，所以只需要绑定一次。
 */
const bindEditorEvents = () => {
  const root = EditorRef.value
  if (!root) return
  root.addEventListener(MATH_EDIT_EVENT, handleMathEdit as EventListener)
  root.addEventListener(IMAGE_CLICK_EVENT, handleImageClick as EventListener)
  root.addEventListener(LINK_CLICK_EVENT, handleLinkClick as EventListener)
  root.addEventListener(REQUEST_EVENT, handleEditorRequest as EventListener)
}

const unbindEditorEvents = () => {
  const root = EditorRef.value
  if (!root) return
  root.removeEventListener(MATH_EDIT_EVENT, handleMathEdit as EventListener)
  root.removeEventListener(IMAGE_CLICK_EVENT, handleImageClick as EventListener)
  root.removeEventListener(LINK_CLICK_EVENT, handleLinkClick as EventListener)
  root.removeEventListener(REQUEST_EVENT, handleEditorRequest as EventListener)
}

/**
 * 双击公式：打开编辑弹窗
 */
const mathDialog = reactive({
  show: false,
  value: '',
  display: false,
  apply: null as ((value: string) => void) | null
})

const handleMathEdit = (event: CustomEvent<MathEditDetail>) => {
  const detail = event.detail
  if (!detail) return
  mathDialog.value = detail.value
  mathDialog.display = detail.display
  mathDialog.apply = detail.apply
  mathDialog.show = true
}

/** 公式输入时实时预览 */
watch(
  () => [mathDialog.value, mathDialog.show],
  () => {
    if (!mathDialog.show) return
    nextTick(() => {
      const el = MathPreviewRef.value
      if (!el) return
      try {
        katex.render(mathDialog.value || '', el, { displayMode: mathDialog.display, throwOnError: false, output: 'html' })
      } catch (e) {
        el.textContent = '公式解析失败'
      }
    })
  }
)

const confirmMath = () => {
  mathDialog.apply?.(mathDialog.value)
  mathDialog.show = false
  nextTick(() => debounceRefresh(0))
}

/**
 * 点击图片：弹出「宽度 / 阴影」设置面板
 *
 * 面板固定在点击位置下方（超出窗口时翻到上方），
 * 修改会立刻写回节点的 alt（`##shadow##` / `##w100`），
 * 保存时由 milkdown 序列化成 `![名称##shadow##w100](a.png)`。
 */
const imageTooltip = reactive({
  show: false,
  /** 图片节点位置 */
  pos: -1,
  left: 0,
  top: 0,
  /** 原始引用地址（相对文档库路径 / http） */
  src: '',
  /** alt 里的名称部分（不含标记） */
  name: '',
  /** 宽度，0 表示自动 */
  width: 0,
  unit: 'px' as 'px' | '%',
  shadow: false
})

/** 面板元素，用来量真实高度（内容会变化，写死高度会导致贴边或遮挡） */
const ImagePanelRef = ref<HTMLElement>()

/**
 * 面板定位锚点（图片外层元素）
 *
 * 不用响应式：它只是一个 DOM 引用，放进 reactive 会被 Vue 代理，比较与回收都变麻烦。
 */
let imageAnchorEl: HTMLElement | null = null

/**
 * 依据锚点元素重新计算面板位置
 *
 * 面板是 `position: fixed`，所以每次滚动 / 窗口尺寸变化都要按图片当前的
 * 屏幕坐标重算，否则会「钉」在打开时的位置不动。
 */
const positionImageTooltip = () => {
  if (!imageTooltip.show) return
  const anchor = imageAnchorEl
  if (!anchor || !document.contains(anchor)) {
    closeImageTooltip()
    return
  }
  const rect = anchor.getBoundingClientRect()
  const panelWidth = ImagePanelRef.value?.offsetWidth || 268
  const panelHeight = ImagePanelRef.value?.offsetHeight || 132
  imageTooltip.left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8))
  const below = rect.bottom + 8
  imageTooltip.top = below + panelHeight > window.innerHeight ? Math.max(8, rect.top - panelHeight - 8) : below
}

const closeImageTooltip = () => {
  imageTooltip.show = false
  imageAnchorEl = null
  document.removeEventListener('mousedown', onDocMouseDownForImage, true)
  window.removeEventListener('resize', positionImageTooltip)
}

function onDocMouseDownForImage(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target?.closest?.('.bl-image-tooltip') || target?.closest?.('.bl-image-node')) return
  closeImageTooltip()
}

/**
 * 打开图片设置面板
 *
 * 注意：**单击图片本身不会触发**（NodeView 里只做选中），
 * 只有点图片右上角的「编辑」按钮才会派发事件到这里。
 */
const handleImageClick = (event: CustomEvent<ImageClickDetail>) => {
  const detail = event.detail
  if (!detail || detail.pos < 0) return

  const parsed = parseImageAlt(detail.alt ?? '')
  imageTooltip.src = detail.src
  imageTooltip.name = parsed.alt
  imageTooltip.shadow = parsed.shadow
  // `w100` => 100px，`w50%` => 50%
  const widthText = parsed.width === 'auto' ? '' : parsed.width
  imageTooltip.unit = widthText.endsWith('%') ? '%' : 'px'
  imageTooltip.width = Number(widthText.replace('%', '').replace('px', '')) || 0
  imageTooltip.pos = detail.pos

  // 以图片外框作为锚点，滚动时按它重新定位
  imageAnchorEl = detail.anchor ?? (event.target as HTMLElement)
  imageTooltip.show = true
  // 先显示再定位：面板高度要靠 DOM 量，v-show 之后才有尺寸
  nextTick(positionImageTooltip)

  window.addEventListener('resize', positionImageTooltip)
  setTimeout(() => document.addEventListener('mousedown', onDocMouseDownForImage, true), 0)
}

/** 切换宽度单位（px / %），切换后立刻应用 */
/** 修改图片地址（网络链接 / 文档库相对路径） */
const applyImageSrc = () => {
  if (!wysiwyg || imageTooltip.pos < 0) return
  const src = imageTooltip.src.trim()
  if (!src) return
  wysiwyg.updateImageAttrs(imageTooltip.pos, { src })
  debounceRefresh(0)
  requestAnimationFrame(() => positionImageTooltip())
}

const setImageUnit = (unit: 'px' | '%') => {
  if (imageTooltip.unit === unit) return
  imageTooltip.unit = unit
  applyImageTooltip()
}

/** 把面板上的宽度 / 阴影写回图片节点 */
const applyImageTooltip = () => {
  if (!wysiwyg || imageTooltip.pos < 0) return
  let alt = imageTooltip.name ?? ''
  if (imageTooltip.shadow) alt += '##shadow##'
  if (imageTooltip.width > 0) {
    alt += `##w${Math.round(imageTooltip.width)}${imageTooltip.unit === '%' ? '%' : ''}`
  }
  wysiwyg.updateImageAttrs(imageTooltip.pos, { alt })
  debounceRefresh(0)
  // 宽度变化会改变图片高度，一帧后重新贴到图片下方
  requestAnimationFrame(() => positionImageTooltip())
}

/** 面板上的「图片信息」按钮：打开老的图片详情弹窗 */
const openImageInfoFromTooltip = () => {
  const src = imageTooltip.src
  closeImageTooltip()
  if (src) showPicInfo(picCacheWrapper(protocolWrapper(src)))
}

/**
 * Ctrl / Cmd + 单击链接
 *
 * 普通单击只会把光标放进链接（编辑器内部处理），只有按住修饰键才会走到这里：
 *
 * - 外部链接：交给系统浏览器打开
 * - 内部链接：解析成文档库中的文章，弹出引用预览浮层（与旧版一致）
 */
const handleLinkClick = (event: CustomEvent<LinkClickDetail>) => {
  const detail = event.detail
  if (!detail) return
  const { href, isExternal, event: rawEvent } = detail

  if (isExternal) {
    openExtenal(href)
    return
  }

  const docTrees = ArticleTreeDocsRef.value?.getDocTreeData() ?? []
  const targetPath = pathJoin(docLibStore.cur!.path, decodeURI(href))
  const target = getDocByPath(targetPath, docTrees)

  if (target) {
    window.onHtmlEventDispatch?.(rawEvent.target, '', rawEvent, 'ARTICLE_REFERENCE_VIEW', target.id)
  } else {
    window.onHtmlEventDispatch?.(rawEvent.target, '', rawEvent, 'UNKNOWN_INNER_ARTICLE')
  }
}

/**
 * 编辑器请求（Alt+M 插入图片 / Alt+K 插入链接）
 */
const handleEditorRequest = (event: CustomEvent<EditorRequestDetail>) => {
  const detail = event.detail
  if (!detail) return
  if (detail.type === 'image') selectPicAndMove()
  if (detail.type === 'link') openLink()
}

//#endregion

//#region ----------------------------------------< 图片管理 >--------------------------------------

const PictureViewerInfoRef = ref()

const showPicInfo = (path: string) => {
  const picture = new DefaultPicture()
  picture.localProtocolPath = path
  PictureViewerInfoRef.value?.showPicInfo(picture, path)
}

/** 重新加载图片（清理缓存后刷新目录中的图片列表） */
const refreshCache = () => {
  picCacheRefresh()
  refreshViewData()
}

/**
 * 从图片管理中选择图片并插入编辑器
 */
const selectPicAndMove = () => {
  if (!isArticle(curArticle.value)) return
  const req: SelectPicAndMoveReq = {
    targetDocId: curArticle.value!.id,
    replace: false,
    targetDocLibRoot: false
  }
  selectPicAndMoveDialog(req).then((resp) => {
    if (resp.code === '20000' && resp.data) {
      wysiwyg?.insertMarkdown(`![${resp.data.fileName}](${resp.data.fileName})`)
      nextTick(() => debounceRefresh(0))
    }
  })
}

/**
 * 插入 / 编辑链接的入口（Alt+K）
 *
 * 全部交给编辑器：光标已在链接里就进入「编辑」，否则在选区上方弹出输入框。
 * 两者都是同一个 inline 输入框，不再有弹窗，见 scripts/milkdown/plugins/link-edit.ts。
 */
const openLink = () => wysiwyg?.openLinkTooltip()

//#endregion

//#region ----------------------------------------< 文章引用浮层 >--------------------------------------

const ArticleViewRef = ref()
const { articleReferenceView } = useArticleHtmlEvent(ArticleViewRef)
const openArticleWindow = (id: string) => openNewArticleWindow('article_window_' + id, id)

//#endregion

//#region ----------------------------------------< 编辑器右键菜单 >--------------------------------------

const editorRightMenu = ref<RightMenu>({ show: false, clientX: 0, clientY: 0 })
const rightMenuHeight = isElectron() ? 270 : 220

const handleEditorClickRight = (event: MouseEvent) => {
  event.preventDefault()
  editorRightMenu.value = { show: false, clientX: 0, clientY: 0 }
  let y = event.clientY
  if (document.body.clientHeight - event.clientY < rightMenuHeight) {
    y = event.clientY - rightMenuHeight
  }
  editorRightMenu.value = { show: true, clientX: event.clientX, clientY: y }
  setTimeout(() => {
    document.body.addEventListener('click', closeEditorRightMenu)
  }, 100)
}

const closeEditorRightMenu = () => {
  removeListenerEditorRightMenu()
  editorRightMenu.value.show = false
}

const removeListenerEditorRightMenu = () => {
  document.body.removeEventListener('click', closeEditorRightMenu)
}

/**
 * 复制选中内容
 *
 * 与 Ctrl+C 走完全相同的浏览器原生复制流程（ProseMirror 的 copy 处理器），
 * 因此纯文本、富文本（HTML）两种格式都会正确写入剪贴板。
 * 旧的 `writeText(纯文本)` 只写文本，黏贴到富文本编辑器时格式就丢了。
 */
const rightMenuCopy = () => {
  if (!wysiwyg) return
  const ok = wysiwyg.copySelection()
  if (!ok) {
    ElMessage.info({ message: '未选中内容', duration: 1200, offset: 70, grouping: true })
  }
}

/**
 * 黏贴
 *
 * 走编辑器提供的 `pasteText`（内部触发原生 paste 事件），
 * 与 Ctrl+V 的结果保持一致；代码块 / 表格里不会再出现结构错乱。
 */
const rightMenuPaste = () => {
  const text = readText()
  if (isBlank(text)) return
  wysiwyg?.pasteText(text)
  nextTick(() => debounceRefresh(0))
}

/** 转大写 / 小写 */
const upper = () => wysiwyg?.toCase(true)
const lower = () => wysiwyg?.toCase(false)

//#endregion

//#region ----------------------------------------< 快捷键 >--------------------------------------

/**
 * 收起文档列表（Alt+1）
 *
 * 说明：Alt+2 / Alt+3 / Alt+4（浮动目录、全屏预览、全屏编辑）
 * 在所见即所得模式下已经没有意义，对应快捷键一并移除。
 */
/** 收起 / 展开左侧文档列表 */
const alt_1 = (): void => {
  docsExpand.value = !docsExpand.value
  if (!docsExpand.value) {
    hideOne()
  } else {
    resotreOne()
  }
}

// ---------------------------------------------------------------- 正文查找

const SearchRef = ref()
const search = reactive({ show: false, query: '', total: 0, current: -1 })

/** 同步查找结果到查找框 */
const applySearchResult = (result: { total: number; current: number }) => {
  search.total = result.total
  search.current = result.current
}

/** 关键字变化（查找框的 input 事件） */
const doSearch = (keyword: string) => {
  if (!wysiwyg) return
  search.query = keyword
  applySearchResult(wysiwyg.search(keyword))
}

const searchNext = () => {
  if (!wysiwyg || !search.query) return
  applySearchResult(wysiwyg.searchStep(1))
}

const searchPrev = () => {
  if (!wysiwyg || !search.query) return
  applySearchResult(wysiwyg.searchStep(-1))
}

const openSearch = () => {
  search.show = true
  nextTick(() => SearchRef.value?.focus())
}

const closeSearch = () => {
  search.show = false
  search.query = ''
  search.total = 0
  search.current = -1
  SearchRef.value?.reset()
  wysiwyg?.clearSearch()
}

/**
 * 全局快捷键（捕获阶段）
 *
 * 之前用 hotkeys-js，但它默认会过滤掉 contenteditable / 输入框内的按键，
 * 而 ProseMirror 与 CodeMirror 都是 contenteditable —— Alt+1 因此在编辑器里失效。
 * 改成 document 上的捕获阶段监听：无论焦点在编辑器、代码块还是查找框里都能命中。
 *
 * 保存（Ctrl/Cmd + S）同样放在这里：代码块是 CodeMirror 自己的 contenteditable，
 * 键盘事件不会走到 ProseMirror 的 handleKeyDown，挂在编辑器插件里一进代码块就失效。
 */
const onGlobalKeydown = (event: KeyboardEvent) => {
  const mod = event.ctrlKey || event.metaKey

  // Ctrl / Cmd + S：保存正文
  if (mod && !event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault()
    saveCurArticleContent()
    return
  }

  // Ctrl / Cmd + F：正文查找
  if (mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
    event.preventDefault()
    openSearch()
    return
  }

  // Alt + 1：收起 / 展开文档列表
  if (event.altKey && !mod && !event.shiftKey && (event.key === '1' || event.code === 'Digit1')) {
    event.preventDefault()
    alt_1()
  }
}

/**
 * 快捷键绑定（幂等）
 *
 * ⚠️ 之前只在 `onMounted` 的 `if (!isMounted)` 分支里绑定，而 `onMounted` 里有
 * `await ensureEditor()`，`onActivated` 会先把它置为 true，导致从首页进入本页时
 * 一次都没绑上（Alt+1 / Ctrl+F 全部失效）。现在改成：谁先到谁绑，重复调用无副作用。
 */
let keysBound = false
const bindKeys = () => {
  if (keysBound) return
  document.addEventListener('keydown', onGlobalKeydown, true)
  keysBound = true
}
const unbindKeys = () => {
  document.removeEventListener('keydown', onGlobalKeydown, true)
  keysBound = false
}

//#endregion

//#region 监听主进程发来的消息
const listenMainMessage = () => {
  if (isElectron()) {
    //@ts-ignore
    window.electronAPI.replaceContentArticleId((_event: any, articleIds: string[]): void => {
      console.log('主进程发来的文章ID: ' + articleIds)
      if (articleIds.length > 0 && isArticle(curArticle.value)) {
        if (articleIds.includes(curArticle.value!.id)) {
          const tree: DocTree = new DefaultDocTree()
          tree.id = curArticle.value!.id
          tree.type = 'ARTICLE'
          clickCurDoc(tree, true)
        }
      }
    })
  }
}
//#endregion
</script>

<style scoped lang="scss">
@import '@renderer/assets/styles/bl-resize-divider.scss';
@import '@renderer/assets/styles/bl-loading-spinner.scss';
@import './styles/article-index.scss';
@import './styles/article-view-absolute.scss';
@import './styles/editor-right-menu.scss';
</style>

<!-- 编辑器内部由 milkdown 动态创建 DOM，scoped 样式无法命中，因此这部分样式是全局的 -->
<style lang="scss">
/* 官方组件（表格 / 列表 / 代码块）的样式，先加载，后面再用项目样式做局部覆盖 */
@import './styles/bl-milkdown-official.css';
@import './styles/bl-milkdown.css';
</style>
