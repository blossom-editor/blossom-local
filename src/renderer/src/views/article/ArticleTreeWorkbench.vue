<template>
  <div class="doc-workbench-root">
    <bl-row class="wb-page-container">
      <bl-row class="wb-page-item" just="flex-start" align="flex-end" height="44px">
        <el-tooltip content="文章引用网络" effect="light" popper-class="is-small" placement="top" :offset="-5" :hide-after="0">
          <div class="iconbl bl-correlation-line" @click="openArticleReferenceWindow()"></div>
        </el-tooltip>
        <el-tooltip content="文章回收站" effect="light" popper-class="is-small" placement="top" :offset="8" :hide-after="0">
          <div class="iconbl bl-delete-line" @click="handleShowRecycleDialog"></div>
        </el-tooltip>
      </bl-row>
    </bl-row>
  </div>

  <el-dialog
    class="bl-dialog-fixed-body"
    v-model="isShowRecycleDialog"
    width="80%"
    style="height: 80%"
    :align-center="true"
    :append-to-body="true"
    :destroy-on-close="true"
    :close-on-click-modal="false"
    draggable>
    <ArticleRecycle ref="ArticleRecycleRef"></ArticleRecycle>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { openNewArticleReferenceWindow } from '@renderer/assets/utils/electron'
import ArticleRecycle from './ArticleRecycle.vue'

//#region --------------------------------------------------< 控制台更多选项 >--------------------------------------------------
const moreMenu = ref<RightMenu>({ show: false, clientX: 0, clientY: 0 })

const closeMoreMenu = (event: MouseEvent) => {
  if (event.target) {
    let isPrevent = (event.target as HTMLElement).getAttribute('data-bl-prevet')
    if (isPrevent === 'true') {
      event.preventDefault()
      return
    }
  }

  document.body.removeEventListener('click', closeMoreMenu)
  moreMenu.value.show = false
}

const openArticleReferenceWindow = () => {
  openNewArticleReferenceWindow()
}

//#endregion

//#region --------------------------------------------------< 回收站 >--------------------------------------------------
const isShowRecycleDialog = ref<boolean>(false)

const handleShowRecycleDialog = () => {
  isShowRecycleDialog.value = true
}
//#endregion
</script>

<style scoped lang="scss">
@import '../doc/tree-workbench.scss';

.wb-page-container {
  position: relative;
  height: 44px;

  .wb-page-item {
    flex-direction: row-reverse !important;
    align-content: space-between;
    flex-wrap: wrap;
    overflow: hidden;
    position: absolute;
    left: 0;

    &::-webkit-scrollbar {
      width: 0px;
      height: 0px;
    }

    // 搜索
    .bl-search-line {
      font-size: 23px;
      padding-bottom: 4px;
    }

    // 收藏
    .bl-star-line,
    .bl-star-fill {
      font-size: 23px;
      padding-bottom: 5px;
    }

    .bl-correlation-line {
      font-size: 40px;
      padding-bottom: 0px;
    }
  }
}
</style>
