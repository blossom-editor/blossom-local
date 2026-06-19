<template>
  <div class="index-picture-root">
    <!-- folder menu -->
    <div class="doc-container" ref="DocsRef">
      <div class="doc-tree-menu-container">
        <PictureTreeDocs @click-doc="clickCurDoc" @refresh-stats="refreshStats" ref="PictureTreeDocsRef"></PictureTreeDocs>
      </div>
      <div class="doc-tree-bottom">
        <div class="picture-status-item">总数: {{ picStat.global.pictureTotal }}</div>
        <div class="picture-status-item">大小: {{ picStat.global.pictureTotalSize }}</div>
      </div>
    </div>
    <div class="resize-divider-vertical" ref="ResizeDividerRef"></div>
    <div class="picture-container" ref="PictureContainerRef">
      <div class="picutre-workbench" :style="workbencStyle.workbench1">
        <div class="workbenchs">
          <div class="workbench-level1">
            <!-- 显式收藏 -->

            <div class="btn-wrapper radio">
              <div class="btn-wrapper-desc">卡片大小</div>
              <el-radio-group v-model="cardSize">
                <el-radio-button value="mini">小</el-radio-button>
                <el-radio-button value="large">大</el-radio-button>
              </el-radio-group>
            </div>

            <el-button plain @click="lastPage()">上一页</el-button>
            <el-button plain @click="nextPage()">下一页</el-button>
            <el-button plain @click="refreshPage()">刷新</el-button>

            <el-button @click="picCacheRefresh()">
              清空图片缓存
              <el-tooltip effect="light" placement="top" popper-class="is-small" :hide-after="0">
                <template #content> 如果替换了图片，可刷新缓存查看 </template>
                <div><span class="iconbl bl-admonish-line"></span></div>
              </el-tooltip>
            </el-button>

            <el-button type="primary" plain @click="handleBenchworkStyle()">
              批量管理
              <el-tooltip effect="light" placement="top" popper-class="is-small" :hide-after="0">
                <template #content> 批量删除，或转移至其他文件夹 </template>
                <div><span class="iconbl bl-admonish-line"></span></div>
              </el-tooltip>
            </el-button>
          </div>
          <div class="workbench-level2" :style="workbencStyle.workbench2 as StyleValue">
            <el-checkbox v-model="checkedAll" @change="handlCheckedAll">全选</el-checkbox>
            <el-button type="primary" text bg @click="transfer" style="margin-left: 11px">移动</el-button>
            <el-button type="primary" text bg @click="delBatch">删除</el-button>
            <div class="desc"><span class="iconbl bl-admonish-line"></span>右键点击文件可快捷选中</div>
          </div>
        </div>

        <div class="statistic">
          <bl-col just="center" :style="{ ...workbencStyle.workbench2, ...{ height: '100%' } }">
            <div style="font-size: 40px; font-weight: 300; font-style: italic; padding: 0 10px">{{ picChecks.size }}</div>
          </bl-col>
        </div>
      </div>

      <div class="picture-card-container" :style="workbencStyle.cards">
        <div :class="['picture-card', cardClass]" v-for="(pic, _index) in picPages" :key="pic.id" @click.right="picCheckRightClick(pic, $event)">
          <el-checkbox
            v-show="isExpandWorkbench"
            class="picture-card-check"
            size="large"
            v-model="pic.checked"
            @change="(check: boolean) => picCheckChange(check, pic.id)">
          </el-checkbox>
          <div v-if="pic.delType !== 'NORMAL'" class="img-deleted">
            {{ pic.delType == 'DELETED' ? '已删除' : pic.delType == 'DELETING' ? '删除中' : '无法查看' }}
          </div>
          <div v-else-if="!isImage(pic.name)" class="other-file">
            <div class="other-filename">{{ getFilePrefix(pic.name) }}</div>
            <div class="other-suffix">{{ getFileSuffix(pic.name) }}</div>
          </div>
          <div v-else class="img-wrapper" @click="showPicInfo(pic)">
            <img :src="picCacheWrapper(pic.localProtocolPath)" @error="onErrorImg" />
            <div v-if="pic.articleLinks.length > 0" class="img-articlelinks">{{ pic.articleLinks.length }}</div>
          </div>

          <div class="picuter-card-workbench">
            <el-tooltip placement="bottom" trigger="click" :hide-after="0">
              <template #content>
                <div class="picture-info-tooltip" style="max-width: 300px; white-space: break-spaces; word-wrap: break-word; word-break: break-all">
                  <bl-row>图片名称: {{ pic.name }}</bl-row>
                  <bl-row>图片大小: {{ formatFileSize(pic.size) }}</bl-row>
                  <bl-row>上传时间: {{ pic.creTime }}</bl-row>
                  <bl-row>图片路径: {{ pic.path }}</bl-row>
                  <bl-col v-if="!isEmpty(pic.articleLinks)" align="flex-start">
                    <span style="color: var(--el-color-warning)">引用文章:</span>
                    <div v-for="article in pic!.articleLinks" style="margin-left: 13px">《{{ article.name }}》</div>
                  </bl-col>
                </div>
              </template>
              <div class="item iconbl bl-problem-line"></div>
            </el-tooltip>

            <el-tooltip content="左键复制 MD 格式, 右键复制文件路径" placement="bottom" :show-after="500">
              <div class="item iconbl bl-copy-line" @click="copyMarkdownUrl(pic.name)" @click.right="copyUrl(pic.path)"></div>
            </el-tooltip>
            <div class="item iconbl bl-computer-line" @click="openFileLocation(pic.path)"></div>
            <div class="item iconbl bl-delete-line" @click="deletePicture(pic)"></div>
          </div>
        </div>
      </div>
      <div class="picture-status">
        <div v-show="curFolder" class="picture-status-item">{{ curFolder?.name }}</div>
        <div v-show="curFolder" class="picture-status-item count">总数: {{ picStat.cur.pictureTotal }}</div>
        <div v-show="curFolder" class="picture-status-item size">大小: {{ picStat.cur.pictureTotalSize }}</div>
        <div v-show="curFolder" class="picture-status-item path">
          <span>{{ curFolder?.path }}</span>
        </div>
      </div>
    </div>

    <PictureViewerInfo ref="PictureViewerInfoRef"></PictureViewerInfo>
  </div>

  <el-dialog
    v-model="isShowTransferDialog"
    width="400px"
    style="height: fit-content"
    :align-center="true"
    :append-to-body="true"
    :destroy-on-close="true"
    :close-on-click-modal="false"
    draggable>
    <PictureTransfer :ids="picChecks" :cur-folder-id="curFolder?.id" @transferred="transferred"></PictureTransfer>
  </el-dialog>

  <el-dialog
    v-model="isShowBatchDelDialog"
    width="500px"
    style="height: fit-content"
    :align-center="true"
    :append-to-body="true"
    :destroy-on-close="true"
    :close-on-click-modal="false"
    draggable>
    <PictureBatchDel :ids="picChecks" @deleted="deleted"></PictureBatchDel>
  </el-dialog>
</template>
<script setup lang="ts">
// vue
import { ref, provide, computed, StyleValue, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useDocLibStore } from '@renderer/stores/docLib'
import { treeToInfo, provideKeyDocInfo } from '@renderer/views/doc/doc'
import { doclibStatsApi, openFileLocation } from '@renderer/api/docLib'
import { picCacheWrapper, picCacheRefresh, copyMarkdownUrl, copyUrl, pictureUseNotify } from './scripts/picture'
import { pictureDeleteBatchApi, pictureInfoApi, pictureListApi } from '@renderer/api/picture'
// utils
import Notify from '@renderer/scripts/notify'
import { isEmpty, isNotBlank, isNull } from '@renderer/assets/utils/obj'
import { formatFileSize, getFilePrefix, getFileSuffix, isImage } from '@renderer/assets/utils/util'
import { useResizeVertical } from '@renderer/scripts/resize-devider-vertical'
// component
import errorImg from '@renderer/assets/imgs/img_error.png'
import PictureTreeDocs from './PictureTreeDocs.vue'
import PictureViewerInfo from './PictureViewerInfo.vue'
import PictureBatchDel from './PictureBatchDel.vue'
import PictureTransfer from './PictureTransfer.vue'

const docLibStore = useDocLibStore()

watch(
  () => docLibStore.cur?.path,
  (newPath, _oldPath) => {
    if (isNotBlank(newPath)) {
      curFolder.value = undefined
      picPageParam.value = { pageNum: 1, pageSize: 15, name: '' }
      picPages.value = []
      picChecks.value.clear()
      checkedAll.value = false
    }
  }
)

//#region ----------------------------------------< 文档列表 >----------------------------------------

const PictureTreeDocsRef = ref()
/**
 * 刷新统计
 */
const refreshStats = async () => {
  doclibStatsApi().then((resp) => {
    picStat.value.global = { pictureTotal: resp.data!.pictureTotal, pictureTotalSize: formatFileSize(resp.data!.pictureTotalSize) }
  })
}
//#endregion

//#region ----------------------------------------< 当前文件 >----------------------------------------
type PageParam = { pageNum: number; pageSize: number; name: string } // 分页对象类型
const curFolder = ref<DocInfo>() // 当前选中的文档, 包含文件夹和文章, 如果选中是文件夹, 则不会重置编辑器中的文章
const picPageParam = ref<PageParam>({ pageNum: 1, pageSize: 15, name: '' }) // 列表参数
const picPages = ref<Picture[]>([]) // 图片列表
const picStat = ref<any>({ cur: { pictureTotal: 0, pictureTotalSize: '0MB' }, global: { pictureTotal: 0, pictureTotalSize: '0MB' } })
const readDocLibRoot = ref<boolean>(false)

// 依赖注入
provide(provideKeyDocInfo, curFolder)

const curIsFolder = () => {
  if (isNull(curFolder.value)) {
    return false
  }
  return true
}

/**
 * 点击树状列表名称的回调, 用于选中某个文档
 */
const clickCurDoc = (tree: DocTree, isReadDocLibRoot: boolean = false) => {
  // 点击单个图片时显示图片详情
  if (tree.type === 'PICTURE') {
    pictureInfoApi({ id: tree.id }).then((res) => {
      picPages.value = [res.data!]
      picStat.value.cur = { pictureTotal: 1, pictureTotalSize: formatFileSize(res.data!.size) }
    })
    return
  }

  const clickDoc = treeToInfo(tree)
  if (isNull(clickDoc)) {
    return
  }
  readDocLibRoot.value = isReadDocLibRoot
  curFolder.value = clickDoc
  picChecks.value.clear()
  checkedAll.value = false
  picPageParam.value.pageNum = 1
  picPages.value = [] // 在重新加载前清空，防止因加载慢而残留显示其他文件夹的图片
  pictureListApi({
    id: curFolder.value.id,
    pageNum: picPageParam.value.pageNum,
    pageSize: picPageParam.value.pageSize,
    readDocLibRoot: readDocLibRoot.value
  }).then((resp) => {
    picPages.value = resp.data!.pictures
    picStat.value.cur = { pictureTotal: resp.data!.pictureTotal, pictureTotalSize: formatFileSize(resp.data!.pictureTotalSize) }
  })
}

/**
 * 上一页图片
 */
const lastPage = () => {
  if (!curIsFolder()) return
  if (picPageParam.value.pageNum === 1) return

  picPageParam.value.pageNum = Math.max(1, picPageParam.value.pageNum - 1)
  pictureListApi({
    id: curFolder.value!.id,
    pageNum: picPageParam.value.pageNum,
    pageSize: picPageParam.value.pageSize,
    readDocLibRoot: readDocLibRoot.value
  }).then((resp) => {
    picPages.value = resp.data!.pictures
  })
}

/**
 * 下一页图片
 */
const nextPage = () => {
  if (!curIsFolder()) return
  if (picPageParam.value.pageNum + 1 > Math.ceil(picStat.value.cur.pictureTotal / picPageParam.value.pageSize)) return

  picPageParam.value.pageNum += 1
  pictureListApi({
    id: curFolder.value!.id,
    pageNum: picPageParam.value.pageNum,
    pageSize: picPageParam.value.pageSize,
    readDocLibRoot: readDocLibRoot.value
  }).then((resp) => {
    picPages.value = resp.data!.pictures
  })
}

const refreshPage = () => {
  if (!curIsFolder()) return
  pictureListApi({
    id: curFolder.value!.id,
    pageNum: picPageParam.value.pageNum,
    pageSize: picPageParam.value.pageSize,
    readDocLibRoot: readDocLibRoot.value
  }).then((resp) => {
    picPages.value = resp.data!.pictures
  })
}

//#endregion

//#region ----------------------------------------< 图片卡片操作 >--------------------------------
const PictureViewerInfoRef = ref()
const cardSize = ref('mini')
const cardClass = computed(() => {
  if (cardSize.value == 'large') return 'picutre-card-large'
  return 'picutre-card-mini'
})

const showPicInfo = (pic: Picture) => {
  if (!PictureViewerInfoRef.value || !isImage(pic.path)) return
  PictureViewerInfoRef.value.showPicInfo(pic, pic.id)
}

/**
 * 图片查询失败时的处理
 * @param a
 */
const onErrorImg = (a: Event) => {
  let imgEle = a.target as HTMLImageElement
  if (imgEle) {
    imgEle.src = errorImg
    imgEle.classList.add('img-error')
    imgEle.style.width = '32px'
    imgEle.style.height = 'auto'
    if (imgEle.parentNode) {
      let imgWrapper: HTMLElement = imgEle.parentNode as HTMLElement
      imgWrapper.style.backgroundColor = 'var(--bl-bg-color)'
    }
  }
}

/**
 * 删除单个图片
 * @param pic 当前选中图片
 */
const deletePicture = (pic: Picture) => {
  let articleCount = pic.articleLinks.length
  if (articleCount > 0) {
    pictureUseNotify(articleCount)
    return
  }
  ElMessageBox.confirm(`文件将被移入回收站, 是否确定删除: <span style="color:#C02B2B;text-decoration: underline;">${pic.name}</span>？`, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
    draggable: true,
    dangerouslyUseHTMLString: true
  }).then(() => {
    let path = pic.localProtocolPath
    pic.localProtocolPath = '1'
    pic.delType = 'DELETING'
    pictureDeleteBatchApi({ ids: [pic.id] })
      .then((resp) => {
        if (resp.data!.success === 1) {
          Notify.success(`删除成功`)
          PictureTreeDocsRef.value.getDocTree()
          refreshStats()
          pic.delType = 'DELETED'
        }
        if (resp.data!.inuse > 0) {
          pictureUseNotify(resp.data!.inuse)
          pic.delType = 'NORMAL'
          pic.localProtocolPath = path
          return
        }
      })
      .catch(() => {
        pic.delType = 'NORMAL'
        pic.localProtocolPath = path
      })
  })
}

//#endregion

//#region ----------------------------------------< 二级操作台 >----------------------------------
const workbencStyle = ref({
  workbench1: { height: '50px' },
  workbench2: { height: '0', visibility: 'hidden', opacity: 0 },
  cards: { height: 'calc(100% - 50px - 28px - 15px)' }
})
const isExpandWorkbench = ref(false)

const handleBenchworkStyle = () => {
  isExpandWorkbench.value = !isExpandWorkbench.value
  if (isExpandWorkbench.value) {
    // 展开
    workbencStyle.value = {
      workbench1: { height: '90px' },
      workbench2: { height: '40px', visibility: 'visible', opacity: 1 },
      cards: { height: 'calc(100% - 90px - 28px - 15px)' }
    }
  } else {
    // 收起
    workbencStyle.value = {
      workbench1: { height: '50px' },
      workbench2: { height: '0', visibility: 'hidden', opacity: 0 },
      cards: { height: 'calc(100% - 50px - 28px - 15px)' }
    }
  }
}

// 图片多选
const picChecks = ref<Set<string>>(new Set())
/** 选中全部图片 */
const checkedAll = ref(false)

const handlCheckedAll = (checked: boolean) => {
  if (checked) {
    picPages.value.forEach((ele) => {
      ele.checked = true
      picChecks.value.add(ele.id)
    })
  } else {
    picPages.value.forEach((ele) => {
      ele.checked = false
      picChecks.value.delete(ele.id)
    })
  }
}

/** 图片选中 */
const picCheckChange = (check: boolean, id: string) => {
  if (check) {
    picChecks.value.add(id)
  } else {
    picChecks.value.delete(id)
  }
}

const picCheckRightClick = (doc: Picture, event: MouseEvent) => {
  if (!isExpandWorkbench.value) {
    return
  }
  if (doc.checked) {
    doc.checked = false
    picChecks.value.delete(doc.id)
  } else {
    doc.checked = true
    picChecks.value.add(doc.id)
  }
  event.preventDefault()
}

//#endregion

//#region ----------------------------------------< 批量删除 >----------------------------------
const isShowBatchDelDialog = ref(false)

const delBatch = () => {
  if (picChecks.value.size == 0) {
    Notify.info('请先选中图片', '提示')
    return
  }
  isShowBatchDelDialog.value = true
}

const deleted = (ids: Array<string>) => {
  picChecks.value.clear()
  checkedAll.value = false
  refreshStats()
  PictureTreeDocsRef.value.getDocTree()
  for (let i = 0; i < picPages.value.length; i++) {
    const pic = picPages.value[i]
    if (ids.includes(pic.id)) {
      pic.folderPath = '1'
      pic.delType = 'DELETED'
    }
    pic.checked = false
  }
}

//#endregion

//#region ----------------------------------------< 移动至其他文件夹 >----------------------------------
const isShowTransferDialog = ref(false)

const transfer = () => {
  if (picChecks.value.size == 0) {
    Notify.info('请先选中图片', '提示')
    return
  }
  isShowTransferDialog.value = true
}

const transferred = () => {
  picChecks.value.clear()
  checkedAll.value = false
  picPageParam.value.pageNum = 1
  PictureTreeDocsRef.value.getDocTree()
  isShowTransferDialog.value = false
}

//#endregion

//#region ----------------------------------------< 左右拖拽 >----------------------------------
const DocsRef = ref()
const ResizeDividerRef = ref()
const PictureContainerRef = ref()
useResizeVertical(DocsRef, PictureContainerRef, ResizeDividerRef, undefined, {
  persistent: true,
  keyOne: 'picture_docs_width',
  keyTwo: 'picture_continer_width',
  defaultOne: '250px',
  defaultTwo: 'calc(100% - 252px)',
  maxOne: 700,
  minOne: 250
})
//#endregion
</script>

<style scoped lang="scss">
@import './styles/picture-index.scss';
@import '@renderer/assets/styles/bl-resize-divider.scss';
@import '@renderer/assets/styles/bl-loading-spinner.scss';

.replace-upload-switch {
  --el-switch-off-color: var(--el-color-primary-light-7);
  height: 24px;

  :deep(.el-switch__core) {
    border-radius: 4px;
  }

  :deep(.is-text) {
    color: #a9a9a9;
  }

  :deep(.el-switch__action) {
    @include themeBg(#ffffff, #a9a9a9);
    border-radius: 4px;
  }
}

.is-checked {
  :deep(.is-text) {
    color: #fff;
  }

  :deep(.el-switch__action) {
    background-color: #ffffff !important;
  }
}

.picture-info-tooltip {
  max-height: 300px;
  overflow-y: scroll;
}
</style>
