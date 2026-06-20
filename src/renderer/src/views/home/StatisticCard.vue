<template>
  <div>
    <div class="statistic-article-root">
      <div class="statistic">
        <div class="main-stat"><span style="font-size: 20px">A</span>{{ stats.articleTotal }}</div>
        <div class="sub-stat"><span class="iconbl bl-pen-line"></span> {{ formartNumber(stats.articleTotalWords) }}</div>
      </div>
      <div class="iconbl bl-a-texteditorhighlightcolor-line icon"></div>
      <div class="iconbl bl-a-texteditorhighlightcolor-line icon-shadow"></div>
    </div>

    <div class="statistic-picture-root">
      <div class="statistic">
        <div class="main-stat"><span style="font-size: 20px">P</span>{{ stats.pictureTotal }}</div>
        <div class="sub-stat"><span class="iconbl bl-a-cloudstorage-line"></span> Size {{ formatFileSize(stats.pictureTotalSize) }}</div>
      </div>
      <div class="iconbl bl-image--line icon"></div>
      <div class="iconbl bl-image--line icon-shadow"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formatFileSize, formartNumber } from '@renderer/assets/utils/util'
import { useLifecycle } from '@renderer/scripts/lifecycle'
import { doclibStatsApi } from '@renderer/api/docLib'

useLifecycle(
  () => getDocLibStats(),
  () => getDocLibStats()
)

let stats = ref({ articleTotal: 0, articleTotalWords: 0, pictureTotal: 0, pictureTotalSize: 0 })

const getDocLibStats = () => {
  doclibStatsApi().then((resp) => {
    stats.value = resp.data
  })
}
</script>

<style scoped lang="scss">
.statistic-article-root,
.statistic-picture-root {
  @include box(200px, 95px);
  @include flex(row, flex-start, center);
  @include themeColor(#727272, #929292);
  text-shadow: var(--bl-text-shadow);
  border: 3px solid var(--el-color-primary-light-7);
  padding: 10px 0;
  margin-top: 20px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  transition: box-shadow 0.3s;

  &:hover {
    @include themeShadow(2px 3px 7px 0 rgba(58, 47, 47, 0.5), 3px 3px 10px 0 rgba(0, 0, 0, 1));

    .icon-shadow {
      transform: translateX(-20px) translateY(10px) scale(150%);
    }
  }

  &::before {
    content: '';
    width: 100%;
    height: 100%;
    position: absolute;
  }

  .statistic {
    @include box(calc(100% - 70px), 100%);
    text-align: right;
    z-index: 2;

    .main-stat {
      @include box(100%, 53px);
      @include font(42px, 700);
    }

    .sub-stat {
      @include box(100%, 20px);
      @include font(12px, 700);

      .iconbl {
        font-size: 13px;
      }
    }
  }

  .icon {
    font-size: 80px;
    font-weight: 500;
    z-index: 2;
  }

  .icon-shadow {
    @include font(100px, 500);
    color: var(--el-color-primary-light-5);
    position: absolute;
    right: -30px;
    bottom: 0px;
    z-index: 1;
    transition: transform 0.3s;
    filter: blur(3px);
  }
}
</style>
