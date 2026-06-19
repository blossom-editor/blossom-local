<template>
  <div class="doc-workbench-root">
    <bl-row class="wb-page-container">
      <bl-row class="wb-page-item" just="flex-start" align="flex-end" height="44px">
        <el-tooltip content="文章引用网络" effect="light" popper-class="is-small" placement="top" :offset="-5" :hide-after="0">
          <div class="iconbl bl-correlation-line" @click="openArticleReferenceWindow()"></div>
        </el-tooltip>
      </bl-row>
    </bl-row>
  </div>
</template>

<script setup lang="ts">
import { openNewArticleReferenceWindow } from '@renderer/assets/utils/electron'

const openArticleReferenceWindow = () => {
  openNewArticleReferenceWindow()
}
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
