<template>
  <!-- 文件夹操作 -->
  <div class="doc-workbench">
    <Workbench></Workbench>
  </div>
  <div class="doc-tree-operator">
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="显示重复文件">
      <div class="iconbl bl-tier-line" @click="handleShowPictureRepeat"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="显示子文件数量">
      <div class="iconbl bl-a-leftdirection-line" @click="handleShowChildFileCount"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="搜索">
      <div class="iconbl bl-search-item" @click="showTreeFilter()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="刷新">
      <div class="iconbl bl-refresh-line" @click="refreshDocTree()"></div>
    </el-tooltip>
    <el-tooltip effect="light" popper-class="is-small" placement="top" :hide-after="0" content="折叠所有文件夹">
      <div class="iconbl bl-collapse" @click="collapseAll"></div>
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
        <div class="menu-item-wrapper" @click.right="handleClickRightMenu($event, data)">
          <div class="doc-title">
            <div class="doc-name">
              <svg v-if="isShowSvg(data, viewStyle)" class="icon menu-icon" aria-hidden="true">
                <use :xlink:href="'#' + data.icon"></use>
              </svg>
              <img class="menu-icon-img" v-else-if="isShowImg(data, viewStyle)" :src="data.icon" />
              <el-input
                v-if="data?.updn"
                v-model="data.name"
                :id="'article-doc-name-' + data.id"
                @input="changeArticleNameInput(data)"
                @blur="blurArticleNameInput(data)"
                @keyup.enter="blurArticleNameInput(data)"
                style="width: 95%"></el-input>
              <div v-else class="name-wrapper" :style="{ maxWidth: isNotBlank(data.icon) ? 'calc(100% - 25px)' : '100%' }">
                {{ data.name }}
              </div>
              <bl-tag v-if="data.status === 'PICTURE_REPEAT'" style="margin-top: 4px" icon="bl-tier-line">重复</bl-tag>
            </div>
          </div>
        </div>
      </template>
    </el-tree>
  </div>

  <!-- 右键菜单, 添加到 body 下 -->
  <Teleport to="body">
    <div v-if="rMenu.show" class="tree-menu" :style="{ left: rMenu.clientX + 'px', top: rMenu.clientY + 'px' }">
      <div class="doc-name">{{ curDoc.name }}</div>
      <div class="menu-content">
        <div v-if="curDoc.type === 'PICTURE'" :class="['menu-item', Number(curDoc.id) <= 0 ? 'disabled' : '']" @click="rename">
          <span class="iconbl bl-pen"></span>重命名
        </div>
        <div @click="openFileLocation(curDoc.path)">
          <span class="iconbl bl-computer-line"></span>{{ platformText('在资源管理器中查看', '在访达中查看') }}
        </div>
        <div v-if="curDoc.type === 'PICTURE'" @click="delPicture()"><span class="iconbl bl-delete-line"></span>删除图片</div>
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
import { ref, provide, nextTick, watch } from 'vue'
import { useConfigStore } from '@renderer/stores/config'
import { useDocLibStore } from '@renderer/stores/docLib'
// element plus
import { ElMessageBox, TreeNode } from 'element-plus'
import { NodeDropType } from 'element-plus/es/components/tree/src/tree.type'
import { DragEvents } from 'element-plus/es/components/tree/src/model/useDragNode'
import { ArrowRightBold, Rank, Close } from '@element-plus/icons-vue'
import Node from 'element-plus/es/components/tree/src/model/node'
// ts
import { docTreeApi } from '@renderer/api/blossom'
import { DefaultDocTree, provideKeyDocTree } from '@renderer/views/doc/doc'
import { isShowImg, isShowSvg } from '@renderer/views/doc/doc-tree-detail'
import { DOC_LIB_ROOT_FOLDER_ID, getChildFileCountColor } from '@renderer/views/doc/doc-tree'
import { useDraggable } from '@renderer/scripts/draggable'
import { useLifecycle } from '@renderer/scripts/lifecycle'
// util
import { isEmpty } from 'lodash'
import { isBlank, isNotBlank } from '@renderer/assets/utils/obj'
// components
import Notify from '@renderer/scripts/notify'
import Workbench from './PictureTreeWorkbench.vue'
import { getFilePrefix, inValidateFileName, joinPath, platformText } from '@renderer/assets/utils/util.js'
import { openFileLocation } from '@renderer/api/docLib'
import { pictureDeleteBatchApi, pictureInfoApi, pictureMoveBatchApi, pictureRenameApi } from '@renderer/api/picture'

const docLibStore = useDocLibStore()
const configStore = useConfigStore()
const { viewStyle } = useConfigStore()

useLifecycle(
  () => getDocTree(),
  () => getDocTree()
)
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

provide(provideKeyDocTree, docTreeData)

/**
 * 刷新文档, 并在渲染结束后选中最后一次选中项
 */
const refreshDocTree = () => {
  getDocTree(() => {
    nextTick(() => {
      isShowPictureRepeat.value = false
      if (!isEmpty(docTreeData.value) && isNotBlank(docTreeCurrentChoiseId.value)) {
        DocTreeRef.value.setCurrentKey(docTreeCurrentChoiseId.value)
      }
    })
  })
}

/**
 * 获取文档树状列表
 * @param callback 获取文档后的自定义回调
 */
const getDocTree = (callback?: () => void) => {
  startLoading()
  docTreeApi({ type: 'PICTURE' })
    .then((resp) => {
      docTreeData.value = resp.data!
      if (callback) callback()
    })
    .finally(() => {
      endLoading()
      emits('refreshStats')
    })
}

/**
 * 点击菜单
 * @param tree 点击的菜单节点数据
 * @param node 树状菜单 node
 * @param treeNode TreeNode
 * @param event 点击事件
 */
const clickCurDoc = (tree: DocTree, node: Node, treeNode: TreeNode, event: MouseEvent) => {
  // 关闭右键菜单
  closeTreeDocsMenuShow(event)
  // 设置当前文档
  setDocTreeCurrentKey({ id: tree.id, parentId: node.parent.data.id, type: tree.type }, node, treeNode, event)
  // 正在重命名的图片不能点击
  if (tree.id === notAllowDragId) return
  emits('clickDoc', tree)
}

/**
 * 是否显示排序
 */
const handleShowChildFileCount = () => {
  viewStyle.isShowFolderFileCount = !viewStyle.isShowFolderFileCount
  configStore.setViewStyle(viewStyle)
}

/** 开始加载 */
const startLoading = () => {
  if (!editorLoadingTimeout) {
    editorLoadingTimeout = setTimeout(() => (docTreeLoading.value = true), 100)
  }
}

/** 结束加载 */
const endLoading = () => {
  if (editorLoadingTimeout) {
    clearTimeout(editorLoadingTimeout)
  }
  docTreeLoading.value = false
}

//#endregion

//#region ----------------------------------------< 树状列表管理 >--------------------------------------

// 文档的最后选中项, 用于外部跳转后选中菜单
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
const isShowPictureRepeat = ref(false)
// 禁止拖拽的节点, 正在重命名的节点不允许进行拖拽
let notAllowDragId: string = ''

useDraggable(DocTreeSearch, DocTreeSearchMove, DocTreeContainer)

watch(treeFilterText, (val) => DocTreeRef.value!.filter(val))
watch(isShowPictureRepeat, (val) => DocTreeRef.value!.filter(val))

const handleShowPictureRepeat = () => {
  isShowPictureRepeat.value = !isShowPictureRepeat.value
}

/**
 * 设置选中项, 并展开所有上级
 *
 * @param tree 当前选中的文档
 */
const setDocTreeCurrentKey = (tree: { id: string; parentId: string; type: DocType }, node?: Node, _treeNode?: any, _event?: MouseEvent) => {
  if (tree.type === 'FOLDER') {
    docTreeCurrentChoiseId.value = tree.id
    if (node && node.expanded) {
      docTreeCurrentExpandIdSet.value.add(tree.id)
    }
  } else if (tree.type === 'PICTURE') {
    docTreeCurrentChoiseId.value = tree.id
    docTreeCurrentExpandIdSet.value.add(tree.parentId)
  }
  DocTreeRef.value.setCurrentKey(tree.id)
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
 * @param value 搜索内容
 * @param data 列表
 * @return 返回节点是否保留
 */
const filterNode = (value: string | boolean, data: DocTree): boolean => {
  if (typeof value === 'boolean') {
    if (!value) return true
    return data.status === 'PICTURE_REPEAT'
  } else if (typeof value === 'string') {
    if (!value) return true
    return data.name.includes(value)
  }
  return true
}

/**
 * 判断是否允许被拖拽
 * 1. 文件夹不允许拖拽
 * 2. 正在重命名的节点不允许被拖拽
 *
 * @param node 拖动的节点
 * @return boolean 节点是否允许被拖动
 */
const handleAllowDrag = (node: Node): boolean => {
  return node.data.type === 'PICTURE' && notAllowDragId !== node.data.id
}

/**
 * 判断是否允许被节点放置
 *
 * @param _draggingNode 拖动的节点
 * @param dropNode 被防止的节点
 * @param type 放置的类型
 * @return boolean 是否允许被放置
 */
const handleAllowDrop = (_draggingNode: Node, dropNode: Node, _type: NodeDropType): boolean => {
  if (dropNode.data.type !== 'FOLDER') {
    return false
  }
  return true
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
  if (doc.type === 'FOLDER' || doc.type === 'PICTURE') {
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
 * 处理节点缩起, 同时清除所有子节点的展开状态
 */
const handleNodeCollapse = (tree: DocTree, node: Node) => {
  docTreeCurrentExpandIdSet.value.delete(tree.id)
  collapseChilds(node)
}

/**
 * 递归缩起所有子节点
 */
const collapseChilds = (node: Node) => {
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
 * @param id ID
 */
const closeParentIfNoChild = (id: string) => {
  let node: Node = DocTreeRef.value.getNode(id).parent
  if (node && isEmpty(node.childNodes)) {
    docTreeCurrentExpandIdSet.value.delete(id)
  }
}

/**
 * 拖拽后处理各个节点排序
 */
const handleDrop = (drag: Node, enter: Node, dropType: NodeDropType, _event: DragEvents) => {
  const req: PictureMoveBatchReq = { ids: [drag.data.id], targetDocId: '', targetDocLibRoot: false }

  if (dropType === 'inner') {
    req.targetDocId = enter.data.id
  }

  if (dropType === 'before' || dropType === 'after') {
    if (enter.parent && enter.parent.level !== 0) {
      req.targetDocId = enter.parent.data.id
    } else {
      req.targetDocLibRoot = true
    }
  }

  pictureMoveBatchApi(req)
    .then((resp) => {
      docTreeData.value = resp.data!
    })
    .catch(() => getDocTree())
}

//#endregion

//#region ----------------------------------------< 右键菜单 >--------------------------------------
const curDoc = ref<DocTree>(new DefaultDocTree())
const rMenu = ref<RightMenu>({ show: false, clientX: 0, clientY: 0 })
const rMenuHeight = 151 // 固定的菜单高度, 每次增加右键菜单项时需要修改该值

/**
 * 显示右键菜单
 * 文章文件夹不显示右键菜单, 文章文件夹的管理一律在文章编辑功能中
 *
 * @param doc 文档
 * @param event 事件
 */
const handleClickRightMenu = (event: MouseEvent, doc: DocTree) => {
  event.preventDefault()
  if (!doc) return

  if (doc.id === DOC_LIB_ROOT_FOLDER_ID) {
    return
  }

  curDoc.value = doc
  rMenu.value = { show: false, clientX: 0, clientY: 0 }
  let y = event.clientY
  if (document.body.clientHeight - event.clientY < rMenuHeight) {
    y = event.clientY - rMenuHeight
  }
  rMenu.value = { show: true, clientX: event.clientX, clientY: y }
  setTimeout(() => {
    document.body.addEventListener('click', closeTreeDocsMenuShow)
  }, 100)
}

/**
 * 关闭右键菜单, 有子菜单时, 点击菜单不会关闭
 *
 * @param event 点击事件
 */
const closeTreeDocsMenuShow = (event?: MouseEvent) => {
  if (event && event?.target) {
    let isPrevent = (event.target as HTMLElement).getAttribute('data-bl-prevet')
    if (isPrevent === 'true') {
      event.preventDefault()
      return
    }
  }
  rMenu.value.show = false
  document.body.removeEventListener('click', closeTreeDocsMenuShow)
}

/**
 * 删除文档, 删除后将文档从树状节点中删除
 */
const delPicture = () => {
  pictureInfoApi({ id: curDoc.value.id }).then((resp) => {
    if (resp.data!.articleLinks.length > 0) {
      Notify.warning(`尚有[${resp.data!.articleLinks.length}]篇文章使用该图片, 无法删除`, '无法删除')
    } else {
      ElMessageBox.confirm(`文件将被移入回收站, 是否确定: <span style="color:#C02B2B;text-decoration: underline;">${curDoc.value.name}</span>？`, {
        confirmButtonText: '确定删除',
        cancelButtonText: '我再想想',
        type: 'info',
        draggable: true,
        dangerouslyUseHTMLString: true
      }).then(() => {
        pictureDeleteBatchApi({ ids: [curDoc.value.id] }).then((resp) => {
          Notify.success(`删除成功`)
          closeParentIfNoChild(curDoc.value.id)
          docTreeData.value = resp.data!.docTree
          emits('refreshStats')
        })
      })
    }
  })
}

// ======================== 文章重命名 ==============================
const renameTooltipVisible = ref(false)
const renameTooltipRef = ref({ getBoundingClientRect: () => position.value })
const position = ref({ top: 0, left: 0, bottom: 0, right: 0 } as DOMRect)

/**
 * 重命名文章, 重命名时该节点无法拖拽
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
 * 重命名文章失去焦点
 */
const blurArticleNameInput = (doc: DocTree) => {
  const req = { oldPath: doc.path, newPath: '' }
  if (!changeArticleNameInput(doc)) {
    getDocTree()
    notAllowDragId = ''
    renameTooltipVisible.value = false
    return
  }

  const newName = doc.name
  const parentPath = doc.folderPath

  function resetUpdateState() {
    doc.updn = false
    notAllowDragId = ''
  }

  req.newPath = joinPath(parentPath, newName)
  // 路径相同, 则未重命名
  if (req.oldPath === req.newPath) {
    resetUpdateState()
    return
  }
  pictureRenameApi(req).then((resp) => {
    resetUpdateState()
    docTreeData.value = resp.data!
  })
}

/**
 * 检查文件夹名是否合法
 */
const changeArticleNameInput = (data: DocTree): boolean => {
  if (inValidateFileName(getFilePrefix(data.name))) {
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

//#endregion

defineExpose({ getDocTree })
const emits = defineEmits(['clickDoc', 'refreshStats'])
</script>

<style scoped lang="scss">
@import '../doc/doc-tree.scss';
@import '../doc/doc-tree-detail.scss';
@import '../doc/doc-tree-right-menu.scss';
</style>
