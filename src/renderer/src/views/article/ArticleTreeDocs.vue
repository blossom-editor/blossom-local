<template>
  <!-- 文件夹操作 -->
  <div class="doc-workbench">
    <ArticleTreeWorkbench ref="ArticleTreeWorkbenchRef"> </ArticleTreeWorkbench>
  </div>
  <!--   -->
  <div class="doc-tree-operator">
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="根目录下新建文章">
      <div class="iconbl bl-fileadd-line" @click="addArticleToRoot()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="根目录下新建文件夹">
      <div class="iconbl bl-folderadd-line" @click="addFolderToRoot()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="显示子文件数量">
      <div class="iconbl bl-a-leftdirection-line" @click="handleShowChildFileCount()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="搜索文件名">
      <div class="iconbl bl-search-item" @click="showTreeFilter()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="刷新">
      <div class="iconbl bl-refresh-line" @click="refreshDocTree()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="折叠所有文件夹">
      <div class="iconbl bl-collapse" @click="collapseAll()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="定位到当前文章">
      <div class="iconbl bl-collimation" @click="collimationCurrentArticle()"></div>
    </el-tooltip>
    <div class="doc-tree-search" ref="DocTreeSearch" v-show="isShowTreeFilter">
      <el-input v-model="treeFilterText" style="width: 180px" ref="DocTreeSearchInput">
        <template #append>
          <div ref="DocTreeSearchMove" style="cursor: move; border-right: 1px solid var(--el-border-color)">
            <el-icon><Rank /></el-icon>
          </div>
          <div style="cursor: pointer" @click="showTreeFilter()">
            <el-icon size="14"><Close /></el-icon>
          </div>
        </template>
      </el-input>
    </div>
  </div>
  <div
    ref="DocTreeContainer"
    class="doc-trees-container"
    v-loading="docTreeLoading"
    element-loading-text="正在读取文档..."
    :style="{ fontSize: viewStyle.treeDocsFontSize }">
    <el-tree
      v-if="docTreeData.length > 0"
      ref="DocTreeRef"
      class="doc-tree"
      :data="docTreeData"
      :allow-drag="handleAllowDrag"
      :allow-drop="handleAllowDrop"
      :highlight-current="true"
      :indent="14"
      :icon="ArrowRightBold"
      :default-expanded-keys="Array.from(docTreeCurrentExpandIdSet)"
      :filter-node-method="filterNode"
      :draggable="isBlank(treeFilterText)"
      node-key="id"
      @nodeClick="clickCurDoc"
      @nodeExpand="handleNodeExpand"
      @nodeCollapse="handleNodeCollapse"
      @nodeDrop="handleDrop">
      <template #default="{ node, data }">
        <div v-if="viewStyle.isShowFolderFileCount" class="sort-tag" :style="getChildFileCountColor(node)">
          {{ data.childrenFileCount }}
        </div>
        <div class="menu-item-wrapper" :id="'article-doc-wrapper-' + data.id" @click.right="handleClickRightMenu($event, data)">
          <div :class="[viewStyle.isShowSubjectStyle ? (data.t?.includes('subject') ? 'subject-title' : 'doc-title') : 'doc-title']">
            <div class="doc-name">
              <svg v-if="isShowSvg(data, viewStyle)" class="icon menu-icon" aria-hidden="true">
                <use :xlink:href="'#' + data.icon"></use>
              </svg>
              <el-input
                v-if="data?.updn"
                v-model="data.formatName"
                :id="'article-doc-name-' + data.id"
                @input="changeArticleNameInput(data)"
                @blur="blurArticleNameInput(data)"
                @keyup.enter="blurArticleNameInput(data)"
                style="width: 95%"></el-input>
              <div v-else class="name-wrapper" :style="{ maxWidth: isNotBlank(data.icon) ? 'calc(100% - 25px)' : '100%' }">
                {{ data.formatName }}
              </div>
            </div>
            <div
              v-if="viewStyle.isShowArticleType"
              v-for="(line, index) in tagLins(data)"
              :key="line"
              :class="[line]"
              :style="{ left: -1 * (index + 1.5) * 4 + 'px' }"></div>
          </div>
        </div>
      </template>
    </el-tree>
    <bl-row v-else class="doc-trees-placeholder" just="center">
      无文档，点击
      <div class="iconbl bl-fileadd-line" @click="addArticleToRoot()"></div>
      /
      <div class="iconbl bl-folderadd-line" @click="addFolderToRoot()"></div>
      添加
    </bl-row>
  </div>

  <Teleport to="body">
    <div v-show="rMenu.show" class="tree-menu" :style="{ left: rMenu.clientX + 'px', top: rMenu.clientY + 'px' }" ref="ArticleDocTreeRightMenuRef">
      <div class="doc-name">{{ curDoc.name }}</div>
      <div class="menu-content">
        <div @click="rename"><span class="iconbl bl-pen"></span>重命名</div>
        <div @click="openFileLocation(curDoc.path)">
          <span class="iconbl bl-computer-line"></span>{{ platformText('在资源管理器中查看', '在访达中查看') }}
        </div>
        <div v-if="curDoc.type === 'FOLDER'" @click="addFolderToDoc()"><span class="iconbl bl-folderadd-line"></span>新增文件夹</div>
        <div v-if="curDoc.type === 'FOLDER'" @click="addArticleToDoc()"><span class="iconbl bl-fileadd-line"></span>新增笔记</div>
        <div v-if="curDoc.type === 'ARTICLE'" @click="createUrlLink()"><span class="iconbl bl-correlation-line"></span>复制双链引用</div>
        <!-- <div v-if="curDoc.type === 'ARTICLE'" @click="star(1)"><span class="iconbl bl-star-line"></span>收藏{{ curDocType }}</div>
        <div v-if="curDoc.type === 'ARTICLE'" @click="star(0)"><span class="iconbl bl-star-line"></span>取消收藏{{ curDocType }}</div> -->

        <!-- <div @mouseenter="handleHoverRightMenuLevel2($event, 2)" data-bl-prevet="true">
          <span class="iconbl bl-a-rightsmallline-line"></span>
          <span class="iconbl bl-apps-line"></span>更多
          <div class="tree-menu-level2" :style="rMenuLevel2">
            <div v-if="curDoc.ty === 3 && !curDoc.t.includes('toc')" @click="addArticleTag('toc')">
              <span class="iconbl bl-list-ordered"></span>设为专题目录
            </div>
          </div>
        </div> -->

        <div v-if="curDoc.type === 'ARTICLE'" class="menu-item-divider"></div>
        <div v-if="curDoc.type === 'ARTICLE'" @click="openArticleWindow"><span class="iconbl bl-a-computerend-line"></span>新窗口查看</div>
        <div class="menu-item-divider"></div>
        <div @click="deleteDoc()"><span class="iconbl bl-delete-line"></span>删除{{ curDocType }}</div>
      </div>
    </div>
  </Teleport>

  <el-tooltip
    :visible="renameTooltipVisible"
    content='名称中不允许包含 <>\/:*?"|.'
    placement="top"
    effect="dark"
    trigger="click"
    virtual-triggering
    :virtual-ref="renameTooltipRef" />
</template>

<script setup lang="ts">
import { ref, provide, onBeforeUnmount, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@renderer/stores/user'
import { useConfigStore } from '@renderer/stores/config'
import { useDocLibStore } from '@renderer/stores/docLib'
// element plus
import { ElMessageBox, TreeNode } from 'element-plus'
import type { DragEvents } from 'element-plus/es/components/tree/src/model/useDragNode'
import type { NodeDropType } from 'element-plus/es/components/tree/src/tree.type'
import Node from 'element-plus/es/components/tree/src/model/node'
import { ArrowRightBold, Rank, Close } from '@element-plus/icons-vue'
// ts
import {
  folderUpdNameApi,
  deleteFileApi,
  articleUpdNameApi,
  docTreeApi,
  moveFileApi,
  createFolderApi,
  createMarkdownApi
} from '@renderer/api/blossom'
import { grammar } from './scripts/markedjs'
import { DefaultDocTree, provideKeyDocTree } from '@renderer/views/doc/doc'
import { getChildFileCountColor } from '@renderer/views/doc/doc-tree'
import { tagLins, isShowSvg } from '@renderer/views/doc/doc-tree-detail'
import { useLifecycle } from '@renderer/scripts/lifecycle'
import { useDraggable } from '@renderer/scripts/draggable'
// util
import { isEmpty } from 'lodash'
import { pathJoin, platformText, inValidateFileName, getParentDirPath } from '@renderer/assets/utils/util'
import { isNotNull, isNotBlank, isBlank, isNull } from '@renderer/assets/utils/obj'
import { writeText, openNewArticleWindow } from '@renderer/assets/utils/electron'
// components
import ArticleTreeWorkbench from './ArticleTreeWorkbench.vue'
import { openFileLocation } from '@renderer/api/docLib'

const route = useRoute()
const docLibStore = useDocLibStore()
const configStore = useConfigStore()
const { viewStyle } = useConfigStore()

useLifecycle(
  () => getDocTree(getRouteQueryParams),
  () => getDocTree(getRouteQueryParams)
)
onBeforeUnmount(() => {
  document.body.removeEventListener('click', closeTreeDocsMenuShow)
  document.body.removeEventListener('contextmenu', closeTreeDocsMenuShow)
})
watch(
  () => docLibStore.cur?.path,
  (_newVal, _oldVal) => {
    if (isNotBlank(_newVal)) {
      getDocTree()
    }
  }
)

//#region ----------------------------------------< 树状列表 >--------------------------------------
let editorLoadingTimeout: NodeJS.Timeout
const DocTreeRef = ref()
const docTreeLoading = ref(true) // 文档菜单的加载动画
const docTreeData = ref<DocTree[]>([]) // 文档菜单
provide(provideKeyDocTree, docTreeData) // 提供菜单列表依赖注入, 主要用于在详情中选择上级文件夹, 避免二次查询

/** 获取路由参数 */
const getRouteQueryParams = () => {
  let routeArticleId = route.query.articleId
  if (isNotNull(routeArticleId)) {
    const articleId = routeArticleId as string
    const docTree: DocTree = new DefaultDocTree()
    emits('clickDoc', docTree)
    nextTick(() => {
      docTreeCurrentChoiseId.value = articleId
      const parentNode = DocTreeRef.value.getNode(articleId).parent
      setDocTreeCurrentKey({ id: articleId, parentId: parentNode.data.id, type: 'ARTICLE' })
      const ele = document.getElementById('article-doc-wrapper-' + articleId)
      if (ele) {
        ;(DocTreeContainer.value as Element).scrollTop = ele.offsetTop
      }
    })
  }
}

/**
 * 定位到当前打开的文章
 */
const collimationCurrentArticle = () => {
  if (!isEmpty(docTreeData.value) && isNotBlank(articleCurrnetChoiseId.value)) {
    DocTreeRef.value.setCurrentKey(articleCurrnetChoiseId.value)
    nextTick(() => {
      const ele = document.getElementById('article-doc-wrapper-' + articleCurrnetChoiseId.value)
      if (ele) {
        ;(DocTreeContainer.value as Element).scrollTop = ele.offsetTop
      }
    })
  }
}

/**
 * 刷新文档, 并在渲染结束后选中最后一次选中项
 */
const refreshDocTree = () => {
  getDocTree(() => {
    nextTick(() => {
      if (!isEmpty(docTreeData.value)) {
        if (isNotBlank(articleCurrnetChoiseId.value)) {
          DocTreeRef.value.setCurrentKey(articleCurrnetChoiseId.value)
        } else if (isNotBlank(docTreeCurrentChoiseId.value)) {
          DocTreeRef.value.setCurrentKey(docTreeCurrentChoiseId.value)
        }
      }
    })
  })
}

/**
 * 获取文档树状列表
 *
 * @param callback 查询后的回调方法
 */
const getDocTree = (callback?: () => void) => {
  startLoading()
  docTreeApi({ type: 'ARTICLE' })
    .then((resp) => {
      docTreeData.value = resp.data!
      if (callback) callback()
    })
    .finally(() => endLoading())
}

/**
 * 点击菜单
 *
 * @param tree 点击的菜单节点数据
 * @param node 树状菜单 node
 * @param treeNode TreeNode
 * @param event 点击事件
 */
const clickCurDoc = (tree: DocTree, node: Node, treeNode: TreeNode, event: MouseEvent) => {
  if (tree.id === notAllowDragId) {
    return
  }
  closeTreeDocsMenuShow(event)
  setDocTreeCurrentKey(
    {
      id: tree.id,
      parentId: node.parent.data.id,
      type: tree.type
    },
    node,
    treeNode,
    event
  )
  emits('clickDoc', tree)
}

/**
 * 暴露给其他组件
 */
const getDocTreeData = (): DocTree[] => {
  return docTreeData.value
}

/** 开始加载动画 */
const startLoading = () => {
  if (!editorLoadingTimeout) {
    editorLoadingTimeout = setTimeout(() => (docTreeLoading.value = true), 100)
  }
}

/** 结束加载动画 */
const endLoading = () => {
  if (editorLoadingTimeout) {
    clearTimeout(editorLoadingTimeout)
  }
  docTreeLoading.value = false
}

//#endregion

//#region ----------------------------------------< 树状列表管理 >--------------------------------------
// 当前选中的文章
const articleCurrnetChoiseId = ref('')
// 当前选中的文档, 包含文章和文件夹
const docTreeCurrentChoiseId = ref('')
// 所有展开的节点
const docTreeCurrentExpandIdSet = ref<Set<string>>(new Set())
// 搜索内容
const treeFilterText = ref('')
const isShowTreeFilter = ref(false)
// 搜索框
const DocTreeContainer = ref()
const DocTreeSearch = ref()
const DocTreeSearchMove = ref()
const DocTreeSearchInput = ref()
// 禁止拖拽的节点, 正在重命名的节点不允许进行拖拽
let notAllowDragId: string = ''

useDraggable(DocTreeSearch, DocTreeSearchMove, DocTreeContainer)

watch(treeFilterText, (val) => {
  DocTreeRef.value!.filter(val)
})

/**
 * 设置选中项, 并展开所有上级
 * 通过 key 设置某个节点的当前选中状态，使用此方法必须设置 node-key  属性
 */
const setDocTreeCurrentKey = (tree: { id: string; parentId: string; type: DocType }, node?: Node, _treeNode?: any, _event?: MouseEvent) => {
  if (tree.type === 'FOLDER') {
    docTreeCurrentChoiseId.value = tree.id
    if (node && node.expanded) {
      docTreeCurrentExpandIdSet.value.add(tree.id)
    }
    DocTreeRef.value.setCurrentKey(tree.id)
  } else if (tree.type === 'ARTICLE') {
    articleCurrnetChoiseId.value = tree.id
    docTreeCurrentChoiseId.value = tree.parentId
    docTreeCurrentExpandIdSet.value.add(tree.parentId)
    DocTreeRef.value.setCurrentKey(tree.id)
  }
}

/**
 * 显示过滤框
 */
const showTreeFilter = () => {
  isShowTreeFilter.value = !isShowTreeFilter.value
  if (isShowTreeFilter.value) {
    DocTreeSearchInput.value.focus()
  }
}

/**
 * 过滤节点名称和标签
 *
 * @param value 搜索内容
 * @param data 列表
 * @return 返回节点是否保留
 */
const filterNode = (value: string, data: DocTree) => {
  if (!value) return true
  return data.name.includes(value)
}

/**
 * 判断是否允许被拖拽
 * 正在重命名的节点不允许被拖拽
 *
 * @param node 拖动的节点
 * @return boolean 节点是否允许被拖动
 */
const handleAllowDrag = (node: Node) => {
  return notAllowDragId !== node.data.id
}

/**
 * 判断是否允许被节点放置
 *
 * @param _draggingNode 拖动的节点
 * @param dropNode 被防止的节点
 * @param type 放置的类型
 * @return boolean 是否允许被放置
 */
const handleAllowDrop = (_draggingNode: Node, dropNode: Node, _type: NodeDropType) => {
  return !(dropNode.data.type === 'ARTICLE')
}

/**
 * 折叠全部, 清空当前选中状态, 并刷新列表
 */
const collapseAll = () => {
  docTreeCurrentExpandIdSet.value.clear()
  DocTreeRef.value.setCurrentKey('')
  getDocTree()
}

/**
 * 折叠所有无子菜单的文件夹
 */
const collapseNoChild = () => {
  nextTick(() => {
    for (let i = 0; i < docTreeData.value.length; i++) {
      const doc = docTreeData.value[i]
      collapseChild(doc)
    }
  })
}

/**
 * 递归折叠所有子文件夹
 *
 * @param doc
 */
const collapseChild = (doc: DocTree) => {
  if (doc.type === 'FOLDER' || doc.type === 'ARTICLE') {
    if (isEmpty(doc.children)) {
      docTreeCurrentExpandIdSet.value.delete(doc.id)
    } else {
      for (let i = 0; i < doc.children!.length; i++) {
        const cdoc = doc.children![i]
        collapseChild(cdoc)
      }
    }
  }
}

/**
 * 处理节点展开
 */
const handleNodeExpand = (tree: DocTree, _node: Node) => {
  docTreeCurrentExpandIdSet.value.add(tree.id)
}

/**
 * 处理节点折叠, 同时清除所有子节点的展开状态
 */
const handleNodeCollapse = async (tree: DocTree, node: Node) => {
  docTreeCurrentExpandIdSet.value.delete(tree.id)
  collapseChilds(node)
}

/**
 * 递归缩起所有子节点
 */
const collapseChilds = async (node: Node) => {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    if (child.isLeaf) {
    } else {
      child.expanded = false
      docTreeCurrentExpandIdSet.value.delete(child.data.id)
      collapseChilds(child)
    }
  }
}

/**
 * 如果父节点没有子节点时, 关闭父节点的展开状态
 * @param pid 父ID
 */
const closeParentIfNoChild = (pid: string) => {}

/**
 * 拖拽后处理各个节点排序
 */
const handleDrop = (drag: Node, enter: Node, dropType: NodeDropType, _event: DragEvents) => {
  const req: MoveFileReq = {
    id: drag.data.id,
    targetId: enter.data.id,
    dropType: dropType
  }
  if (dropType === 'none') {
    getDocTree()
    return
  }
  moveFileApi(req!)
    .then((resp) => {
      docTreeData.value = resp.data!
    })
    .catch(() => {
      getDocTree()
    })
}

const handleShowChildFileCount = () => {
  viewStyle.isShowFolderFileCount = !viewStyle.isShowFolderFileCount
  configStore.setViewStyle(viewStyle)
}
//#endregion

//#region ----------------------------------------< 右键菜单 >--------------------------------------
const curDoc = ref<DocTree>(new DefaultDocTree())
const rMenu = ref<RightMenu>({ show: false, clientX: 0, clientY: 0 })
const rMenuLevel2 = ref<RightMenuLevel2>({ top: '0px' })
const ArticleDocTreeRightMenuRef = ref()
const curDocType = computed(() => {
  if (curDoc.value.type === 'FOLDER') {
    return '文件夹'
  } else {
    return '文章'
  }
})

/**
 * 显示右键菜单
 * @param event 事件
 * @param doc 右键点击的文档
 */
const handleClickRightMenu = (event: MouseEvent, doc: DocTree) => {
  event.preventDefault()
  if (!doc) return

  curDoc.value = doc
  rMenu.value.show = false
  rMenu.value.show = true
  nextTick(() => {
    let domHeight = ArticleDocTreeRightMenuRef.value.offsetHeight
    let y = event.clientY
    if (document.body.clientHeight - event.clientY < domHeight) {
      y = event.clientY - domHeight
    }
    rMenu.value = { show: true, clientX: event.clientX, clientY: y }
    setTimeout(() => {
      document.body.addEventListener('click', closeTreeDocsMenuShow)
    }, 100)
  })
}

/**
 * 关闭右键菜单, 有子菜单时, 点击菜单不会关闭
 */
const closeTreeDocsMenuShow = (event?: MouseEvent) => {
  if (event && event?.target) {
    let isPrevent = (event.target as HTMLElement).getAttribute('data-bl-prevet')
    if (isPrevent === 'true') {
      event.preventDefault()
      return
    }
  }

  document.body.removeEventListener('click', closeTreeDocsMenuShow)
  rMenu.value.show = false
}

/**
 * 显示右键二级菜单
 * @param event
 * @param childMenuCount 二级菜单的个数, 用于处理二级菜单显示位置
 */
const handleHoverRightMenuLevel2 = (event: MouseEvent, childMenuCount: number = 1) => {
  const domHeight = 30 * childMenuCount + 10
  if (document.body.clientHeight - event.clientY <= domHeight) {
    rMenuLevel2.value.top = domHeight * -1 + 30 + 'px'
  } else {
    rMenuLevel2.value.top = '0px'
  }
}

// ======================== 文章重命名 ==============================
const renameTooltipVisible = ref(false)
const renameTooltipRef = ref({ getBoundingClientRect: () => position.value })
const position = ref({ top: 0, left: 0, bottom: 0, right: 0 } as DOMRect)

/**
 * 重命名文章
 */
const rename = () => {
  curDoc.value.updn = true
  notAllowDragId = curDoc.value.id
  nextTick(() => {
    let ele = document.getElementById('article-doc-name-' + curDoc.value.id)
    if (ele) ele.focus()
  })
}

/**
 * 检查文件夹名是否合法
 */
const changeArticleNameInput = (data: DocTree): boolean => {
  if (inValidateFileName(data.formatName)) {
    renameTooltipVisible.value = true
    let ele = document.getElementById('article-doc-name-' + curDoc.value.id) as HTMLInputElement
    position.value = DOMRect.fromRect({
      x: ele.getBoundingClientRect().x + ele.getBoundingClientRect().width / 2,
      y: ele.getBoundingClientRect().y
    })
    renameTooltipVisible.value = true
    return false
  } else {
    renameTooltipVisible.value = false
    return true
  }
}

/**
 * 重命名文章失去焦点
 */
const blurArticleNameInput = (doc: DocTree) => {
  const req: RenameFileReq = { id: doc.id, newName: '' }

  // 文件名不合法时, 刷新列表汇
  if (!changeArticleNameInput(doc)) {
    getDocTree()
    notAllowDragId = ''
    renameTooltipVisible.value = false
    return
  }

  function resetUpdateState() {
    doc.updn = false
    notAllowDragId = ''
  }

  req.newName = doc.formatName + (doc.type === 'ARTICLE' ? '.md' : '')

  // 新旧文件名称相同
  if (req.newName === doc.name) {
    resetUpdateState()
    return
  }

  articleUpdNameApi(req)
    .then((resp) => {
      resetUpdateState()
      docTreeData.value = resp.data!
    })
    .catch(() => {
      resetUpdateState()
      getDocTree()
    })
}

/**
 * 复制双链引用
 * @param path : 文章的路径
 */
const createUrlLink = () => {
  let url = `[${curDoc.value.name}](${curDoc.value.path.replace(docLibStore.cur!.path, '')} )`
  writeText(url)
}

/**
 * 在根目录添加文件夹
 */
const addFolderToRoot = () => addFile(docLibStore.cur!.path, docTreeData.value, 'FOLDER')

/**
 * 在文件夹下新增文件夹
 */
const addFolderToDoc = () => addFile(curDoc.value.path, curDoc.value.children, 'FOLDER', curDoc.value.id)

/**
 * 在根目录添加文章
 */
const addArticleToRoot = () => addFile(docLibStore.cur!.path, docTreeData.value, 'ARTICLE')

/**
 * 在文件夹下新增文章
 */
const addArticleToDoc = () => addFile(curDoc.value.path, curDoc.value.children, 'ARTICLE', curDoc.value.id)

/**
 * 在指定父目录下新增文件
 *
 * @param parentPath 父目录
 */
const addFile = (parentPath: string, docTree: DocTree[] | undefined, type: DocType, parentId?: string) => {
  let newPath = pathJoin(parentPath, type === 'ARTICLE' ? '新建文章' : '新建文件夹')
  let folderSuffix: number = 1

  if (docTree && docTree.length > 0) {
    for (let i = 0; i < docTree.length; i++) {
      const doc = docTree[i]
      let checkName = newPath + '' + folderSuffix
      if (type === 'ARTICLE') {
        checkName = newPath + '' + folderSuffix + '.md'
      }
      if (doc.path === checkName) {
        folderSuffix++
        i = -1
      }
    }
  }

  if (type === 'ARTICLE') {
    newPath = newPath + '' + folderSuffix + '.md'
    createMarkdownApi({ path: newPath }).then((resp) => {
      if (resp.ok) {
        docTreeData.value = resp.data!.docTree!
        renameNewFile(resp.data!.newFileId, parentId)
      }
    })
  } else {
    newPath = newPath + '' + folderSuffix
    createFolderApi({ path: newPath }).then((resp) => {
      if (resp.ok) {
        docTreeData.value = resp.data!.docTree!
        renameNewFile(resp.data!.newFileId, parentId)
      }
    })
  }
}

/**
 * 将文档添加至末尾并重命名
 */
const renameNewFile = (id: string, parentId?: string) => {
  if (parentId) {
    // 新增文件的父节点展开
    docTreeCurrentExpandIdSet.value.add(parentId)
  }
  nextTick(() => {
    let ele = document.getElementById('article-doc-name-' + id) as HTMLInputElement
    setTimeout(() => {
      if (ele) ele.select()
    }, 100)
  })
}

/**
 * 删除文档, 删除后将文档从树状节点中删除
 */
const deleteDoc = () => {
  let type = curDoc.value.type === 'ARTICLE' ? '文章' : '文件夹'
  ElMessageBox.confirm(
    `<strong>注意：</strong><br/>
    删除的文件可在系统回收站中找回, 包括文件夹下的所有文件.<br/>
    是否继续删除${type}: <span style="color:#C02B2B;text-decoration: underline;">${curDoc.value.formatName}</span>？`,
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '我再想想',
      type: 'info',
      draggable: true,
      dangerouslyUseHTMLString: true
    }
  ).then(() => {
    deleteFileApi({ id: curDoc.value.id }).then((resp) => {
      docTreeCurrentExpandIdSet.value.delete(curDoc.value.id)
      let node: Node = DocTreeRef.value.getNode(curDoc.value.id)
      if (node.parent) {
        const parent = node.parent
        if (isEmpty(parent.childNodes)) {
          docTreeCurrentExpandIdSet.value.delete(parent.data.id)
        }
      }
      if (resp.data) {
        docTreeData.value = resp.data
      }

      emits('clearCurDoc', curDoc.value)
    })
  })
}

/**
 * 打开新页面, 文件夹(curDoc.value.ty == 1)无法使用新页面打开
 */
const openArticleWindow = () => {
  if (curDoc.value.type === 'FOLDER') return
  openNewArticleWindow(curDoc.value.name, curDoc.value.id)
}

/**
 * 收藏/取消收藏
 */
// const star = (starStatus: 0 | 1) => {
//   if (curDoc.value.ty === 3) {
//     articleStarApi({ id: curDoc.value.i, starStatus: starStatus }).then(() => {
//       curDoc.value.star = starStatus
//       Notify.success(starStatus === 0 ? '取消 Star 成功' : 'Star 成功')
//     })
//   } else if (curDoc.value.ty === 1) {
//     folderStarApi({ id: curDoc.value.i, starStatus: starStatus }).then(() => {
//       curDoc.value.star = starStatus
//       Notify.success(starStatus === 0 ? '取消文件夹 Star 成功' : '文件夹 Star 成功')
//     })
//   }
// }

//#endregion

const emits = defineEmits(['clickDoc', 'clearCurDoc'])
defineExpose({ getDocTreeData })
</script>

<style scoped lang="scss">
@import '../doc/doc-tree.scss';
@import '../doc/doc-tree-detail.scss';

.el-popper.is-customized {
  /* Set padding to ensure the height is 32px */
  padding: 6px 12px;
  background: red;
}

.el-popper.is-customized .el-popper__arrow::before {
  background: red;
  right: 0;
}
</style>
