<template>
  <div class="index-picture-root">
    <!-- folder menu -->
    <div class="doc-container" ref="DocsRef">
      <PictureTreeDocs @click-doc="clickCurDoc"></PictureTreeDocs>
    </div>

    <div class="resize-divider-vertical" ref="ResizeDividerRef"></div>

    <div class="picture-container" ref="PictureContainerRef">
      <!-- 工作台 -->
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
                <template #content> 批量删除，或转移至其他文件夹<br />右键点击卡片可快捷选中 </template>
                <div><span class="iconbl bl-admonish-line"></span></div>
              </el-tooltip>
            </el-button>
          </div>
          <div class="workbench-level2" :style="workbencStyle.workbench2 as StyleValue">
            <el-checkbox v-model="checkedAll" @change="handlCheckedAll">全选</el-checkbox>
            <el-button type="primary" text bg @click="transfer" style="margin-left: 11px">移动</el-button>
            <el-button type="primary" text bg @click="delBatch">删除</el-button>
          </div>
        </div>

        <div class="statistic">
          <bl-col just="center" :style="{ ...workbencStyle.workbench2, ...{ height: '100%' } }">
            <div style="font-size: 40px; font-weight: 300; font-style: italic; padding: 0 10px">{{ picChecks.size }}</div>
          </bl-col>
        </div>
      </div>

      <div class="picture-card-container" :style="workbencStyle.cards">
        <!-- <div class="picuter-card-next">
          <el-button type="info" plain style="width: 100px" @click="lastPage">上一页</el-button>
          <el-button type="info" plain style="width: 100px" @click="nextPage">下一页</el-button>
        </div> -->

        <div :class="['picture-card', cardClass]" v-for="(pic, _index) in picPages" :key="pic.id" @click.right="picCheckRightClick(pic, $event)">
          <el-checkbox
            v-show="isExpandWorkbench"
            class="picture-card-check"
            size="large"
            v-model="pic.checked"
            @change="(check: boolean) => picCheckChange(check, pic.id)">
          </el-checkbox>

          <div v-if="pic.delTime" class="img-deleted">
            {{ pic.delTime == 2 ? '已删除' : pic.delTime == 1 ? '删除中' : '无法查看' }}
          </div>
          <div v-else-if="!isImage(pic.name)" class="other-file">
            <div class="other-filename">{{ getFilePrefix(pic.name) }}</div>
            <div class="other-suffix">{{ getFileSuffix(pic.name) }}</div>
          </div>
          <div v-else class="img-wrapper" @click="showPicInfo(pic)">
            <img :src="picCacheWrapper(pic.localProtocolPath)" @error="onErrorImg" />
          </div>

          <div class="picuter-card-workbench">
            <el-tooltip placement="bottom" trigger="click" :hide-after="0">
              <template #content>
                <div style="max-width: 300px; white-space: break-spaces; word-wrap: break-word; word-break: break-all">
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
              <div class="item iconbl bl-copy-line" @click="copyMarkdownUrl(pic.path, pic.name, $event)" @click.right="copyUrl(pic.path)"></div>
            </el-tooltip>
            <div class="item iconbl bl-computer-line" @click="openFileLocation(pic.path)"></div>
            <div class="item iconbl bl-delete-line" @click="deletePicture(pic)"></div>
          </div>
        </div>
      </div>
      <div class="picture-status">
        <bl-row width="calc(100% - 240px)" height="100%" class="status-item-container">
          <div>{{ curFolder?.name }}: {{ picStat.cur.totalCount }} P / {{ picStat.cur.totalSize }}</div>
          <div>存储路径: {{ curFolder?.path }}</div>
        </bl-row>
        <div class="status-item-container">
          <div>文件总览: {{ picStat.global.picCount }} P / {{ picStat.global.picSize }}</div>
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
    <PictureTransfer :ids="picChecks" @transferred="transferred"></PictureTransfer>
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
import { ref, provide, computed, StyleValue } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { picturePageApi, pictureDelApi } from '@renderer/api/blossom'
import { treeToInfo, provideKeyDocInfo } from '@renderer/views/doc/doc'
import { isEmpty, isNotNull, isNull } from '@renderer/assets/utils/obj'
import { formatFileSize, getFilePrefix, getFileSuffix, isImage } from '@renderer/assets/utils/util'
import { writeText } from '@renderer/assets/utils/electron'
import { useResizeVertical } from '@renderer/scripts/resize-devider-vertical'
import { pictureInfoApi, pictureListApi } from '@renderer/api/picture'

// component
import { picCacheWrapper, picCacheRefresh } from './scripts/picture'
import PictureTreeDocs from './PictureTreeDocs.vue'
import PictureViewerInfo from './PictureViewerInfo.vue'
import PictureBatchDel from './PictureBatchDel.vue'
import PictureTransfer from './PictureTransfer.vue'
import errorImg from '@renderer/assets/imgs/img_error.png'
import Notify from '@renderer/scripts/notify'
import { openFileLocation } from '@renderer/api/docLib'

// 是否替换上传
const cardSize = ref('mini')

const cardClass = computed(() => {
  if (cardSize.value == 'large') return 'picutre-card-large'
  return 'picutre-card-mini'
})

//#region ----------------------------------------< 当前文件当前文件 >----------------------------
type PageParam = { pageNum: number; pageSize: number; name: string } // 分页对象类型
const curFolder = ref<DocInfo>() // 当前选中的文档, 包含文件夹和文章, 如果选中是文件夹, 则不会重置编辑器中的文章
const picPageParam = ref<PageParam>({ pageNum: 1, pageSize: 15, name: '' }) // 列表参数
const picPages = ref<Picture[]>([]) // 图片列表
const picStat = ref<any>({ cur: { totalCount: 0, totalSize: '0MB' }, global: { picCount: 0, picSize: '0MB' } })
// 依赖注入
provide(provideKeyDocInfo, curFolder)

const curIsFolder = () => {
  if (isNull(curFolder.value)) {
    return false
  }
  return true
}

/**
 * 点击 doc title 的回调, 用于选中某个文档
 */
const clickCurDoc = (tree: DocTree) => {
  // 点击单个图片时显示图片详情
  if (tree.type === 'PICTURE') {
    if (!PictureViewerInfoRef.value || !isImage(tree.path)) {
      return
    }

    pictureInfoApi({ filename: tree.name }).then((res) => {
      const pic: Picture = res.data!
      PictureViewerInfoRef.value.showPicInfo([pic], tree.id)
    })
    return
  }

  const clickDoc = treeToInfo(tree)
  if (isNotNull(curFolder.value) && clickDoc.id === curFolder.value!.id) {
    return
  }
  curFolder.value = clickDoc
  picChecks.value.clear()
  checkedAll.value = false
  picPageParam.value.pageNum = 1
  picPages.value = [] // 在重新加载前清空，防止因加载慢而残留显示其他文件夹的图片
  pictureListApi({
    id: curFolder.value.id,
    pageNum: picPageParam.value.pageNum,
    pageSize: picPageParam.value.pageSize
  }).then((resp) => {
    picPages.value = resp.data!.pictures
    picStat.value.cur.totalCount = resp.data!.totalCount
    picStat.value.cur.totalSize = formatFileSize(resp.data!.totalSize)

    console.log(Math.ceil(picStat.value.cur.totalCount / picPageParam.value.pageSize))
  })
}

/**
 * 上一页图片
 */
const lastPage = () => {
  if (!curIsFolder()) return
  if (picPageParam.value.pageNum - 1 === 0) return

  picPageParam.value.pageNum = Math.max(1, picPageParam.value.pageNum - 1)
  pictureListApi({
    id: curFolder.value!.id,
    pageNum: picPageParam.value.pageNum,
    pageSize: picPageParam.value.pageSize
  }).then((resp) => {
    picPages.value = resp.data!.pictures
  })
}

/**
 * 下一页图片
 */
const nextPage = () => {
  if (!curIsFolder()) return
  if (picPageParam.value.pageNum + 1 > Math.ceil(picStat.value.cur.totalCount / picPageParam.value.pageSize)) return

  picPageParam.value.pageNum += 1
  pictureListApi({
    id: curFolder.value!.id,
    pageNum: picPageParam.value.pageNum,
    pageSize: picPageParam.value.pageSize
  }).then((resp) => {
    picPages.value = resp.data!.pictures
  })
}

//#endregion

//#region ----------------------------------------< 图片卡片操作 >--------------------------------
const PictureViewerInfoRef = ref()

const showPicInfo = (pic: Picture) => {
  if (!PictureViewerInfoRef.value || !isImage(pic.path)) {
    return
  }
  const imageList = picPages.value.filter((item) => isImage(item.path))
  PictureViewerInfoRef.value.showPicInfo(imageList, pic.id)
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
 * 复制文章链接
 * @param path
 */
const copyUrl = (path: string) => {
  writeText(path)
  ElMessage.info({ message: '已复制文件路径', duration: 3000, offset: 10, grouping: true, icon: CopyDocument, customClass: 'bl-message' })
}

/**
 * 复制文章 Markdown 链接
 * @param path 路径
 * @param picName 图片名称
 * @param event event
 */
const copyMarkdownUrl = (path: string, picName: string, event: MouseEvent) => {
  event.preventDefault()
  writeText(`![${picName}](${picName})`)
  ElMessage.info({ message: '已复制 MD 格式链接', duration: 3000, offset: 10, grouping: true, icon: CopyDocument, customClass: 'bl-message' })
}

/**
 * 删除图片
 * @param pic 当前选中图片
 */
const deletePicture = (pic: Picture) => {
  ElMessageBox.confirm('删除图片可能会造成公网访问失效, 是否确定删除?', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    let articleCount = 0
    if (articleCount > 0) {
      ElNotification.error({
        title: '删除失败',
        dangerouslyUseHTMLString: true,
        message: `尚有[${articleCount}]篇文章正在引用该图片, 请先将文章中的图片引用删除后, 再删除图片! <br/>
          <span style="color:red">注意: 引用文章篇数[${articleCount}]为引用了该图片的草稿数, 并不会校验公开文章是否引用.</span>`,
        offset: 30,
        position: 'bottom-right'
      })
      return
    }
    let urlBak = pic.url
    pic.url = '1'
    pic.delTime = 1

    pictureDelApi({ id: pic.id })
      .then((_resp) => {
        pic.delTime = 2
      })
      .catch((_) => {
        pic.delTime = 0
        pic.url = urlBak
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
  for (let i = 0; i < picPages.value.length; i++) {
    const pic = picPages.value[i]
    if (ids.includes(pic.id)) {
      pic.folderPath = '1'
      pic.delTime = 2
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
  picPageParam.value.pid = curFolder.value!.id
  picturePageApi(picPageParam.value).then((resp) => {
    picPages.value = resp.data.datas
  })
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
  defaultTwo: 'calc(100% - 250px)',
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
</style>
