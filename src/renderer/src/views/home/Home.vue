<template>
  <div class="global-home-root">
    <div class="left"></div>
    <div class="doclib-name">{{ doclibStore.cur!.name }}游戏开发</div>
    <div class="logo">Blossom</div>
    <div class="main">
      <bl-row class="greetings" height="65px"> Good {{ now }}. </bl-row>
      <!--  -->
      <bl-row align="flex-end" height="250px">
        <div class="image-container">
          <div class="now-time">
            <DateLine></DateLine>
          </div>
          <Laptop></Laptop>
        </div>
        <Weather></Weather>
        <UserAvatar style="margin-left: 20px"></UserAvatar>
      </bl-row>
      <!-- 统计 -->
      <div class="chart-container">
        <bl-row class="container-name">字数统计</bl-row>
        <bl-row height="270px">
          <!-- 字数图表 -->
          <bl-col width="670px">
            <bl-row class="container-sub-name">
              The last 36 months
              <span class="iconbl bl-refresh-smile" @click="loadWordLine"></span>
            </bl-row>
            <ChartLineWords ref="ChartLineWordsRef"></ChartLineWords>
          </bl-col>
          <!-- 统计卡片 -->
          <bl-col width="200px">
            <bl-row class="container-sub-name" just="flex-end">文章与图片</bl-row>
            <StatisticCard></StatisticCard>
          </bl-col>
        </bl-row>

        <!-- 热力图 -->
        <bl-row class="container-name">编辑热力图</bl-row>
        <bl-row class="container-sub-name">
          每日编辑文章数
          <span class="iconbl bl-refresh-smile" @click="loadArticleHeapmap"></span>
        </bl-row>
        <bl-row width="870px" height="265px">
          <ChartHeatmap ref="ChartHeatmapRef"></ChartHeatmap>
        </bl-row>
      </div>
    </div>
    <div class="right"></div>

    <!--
      =======================================================
      middle
      =======================================================
     -->
    <!-- <div
      :class="['middle', viewStyle.webCollectExpand ? 'expand' : 'fold']"
      :style="{ width: viewStyle.webCollectExpand ? 'calc(100% - 1px - 0px - 10px - 910px - 420px)' : 'calc(100% - 1px - 0px - 10px - 910px)' }">
      <div v-if="!viewStyle.webCollectExpand" class="web-show iconbl bl-left-line" @click="expand"></div>
      <div style="height: 15px"></div>

      <bl-col width="100%" height="calc(100% - 20px)">
        <ArticleStars></ArticleStars>
      </bl-col>
    </div> -->

    <!--
      =======================================================
      right
      =======================================================
     -->
    <!-- <div
      :class="[
        'web-container',
        viewStyle.webCollectExpand ? 'expand' : 'fold',
        viewStyle.isGlobalShadow ? 'web-container-heavy' : 'web-container-light'
      ]"
      :style="{ width: viewStyle.webCollectExpand ? '420px' : '0px', opacity: viewStyle.webCollectExpand ? 1 : 0 }">
      <div v-if="viewStyle.webCollectExpand" class="web-hide iconbl bl-right-line" @click="fold"></div>
      <WebCollect></WebCollect>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onActivated } from 'vue'
// components
import Laptop from '@renderer/components/Laptop.vue'
import DateLine from '@renderer/components/DateLine.vue'
import UserAvatar from '@renderer/components/UserAvatar.vue'
import Weather from '@renderer/components/Weather.vue'
// charts
import ChartLineWords from './ChartLineWords.vue'
import ChartHeatmap from './ChartHeatmap.vue'
// articles
import StatisticCard from './StatisticCard.vue'

import { nowWhen } from '@renderer/assets/utils/util'
import { useDocLibStore } from '@renderer/stores/docLib.js'

const doclibStore = useDocLibStore()
const ChartLineWordsRef = ref()
const ChartHeatmapRef = ref()

onActivated(() => {
  now.value = nowWhen()
})
const loadWordLine = () => ChartLineWordsRef.value.reload()
const loadArticleHeapmap = () => ChartHeatmapRef.value.reload()

const now = ref(nowWhen())

//#region ----------------------------------------< 网页收藏 >--------------------------------------
// const config = useConfigStore()
// const { viewStyle } = config
// const expand = () => {
//   viewStyle.webCollectExpand = true
//   config.setViewStyle(viewStyle)
// }
// const fold = () => {
//   viewStyle.webCollectExpand = false
//   config.setViewStyle(viewStyle)
// }
//#endregion
</script>

<style scoped lang="scss">
@import './styles/container.scss';
.global-home-root {
  @include box(100%, 100%);
  @include flex(row, space-between, center);
  position: relative;
  $border-middle: 1px;

  $margin-web: 30px 0 50px 0px;
  $margin-middle: 10px;

  $width-main: 910px;
  $width-web: 420px;
  $width-middle: calc(100% - #{$border-middle} - 0px - 10px - #{$width-main} - #{$width-web});

  .left,
  .right {
    height: 100%;
    width: calc((100% - #{$width-main}) / 2 - 100px);
    max-width: 336px;

    background:
      linear-gradient(90deg, #0000 0, #0000 23px, #eaeaea 24px) 0 0 / 24px 24px,
      linear-gradient(#0000 0, #0000 23px, #eaeaea 24px) 0 0 / 24px 24px,
      var(--bl-html-color);

    [class='dark'] & {
      background:
        linear-gradient(90deg, #0000 0, #0000 23px, #303030 24px) 0 0 / 24px 24px,
        linear-gradient(#0000 0, #0000 23px, #303030 24px) 0 0 / 24px 24px,
        var(--bl-html-color);
    }
  }
  .right {
    rotate: 180deg;
  }
  .doclib-name {
    @include font(50px, 700);
    @include themeColor(var(--el-color-primary-light-9), var(--el-color-primary-light-9));
    position: absolute;
    top: 0px;
    word-break: break-all;
    writing-mode: vertical-lr;
    text-orientation: mixed;
  }
  .logo {
    @include font(80px, 700);
    @include themeColor(var(--el-color-primary-light-9), var(--el-color-primary-light-9));
    position: absolute;
    right: -10px;
    bottom: 10px;
    rotate: 180deg;
    z-index: 2;
    writing-mode: vertical-lr;
  }

  .main {
    @include box($width-main, 100%, $width-main, $width-main);
    padding: 0 5px 10px 20px;
    z-index: 2;

    // 笔记本图片等
    .image-container {
      @include box(200px, 100%);
      @include themeBrightness(100%, 80%);
    }

    .greetings {
      @include font(50px, 700);
      @include themeColor(#5c5c5c, var(--el-color-primary));
      @include themeText(2px 3px 4px rgba(107, 104, 104, 0.5), 2px 3px 5px rgb(0, 0, 0));
    }

    .now-time {
      @include themeColor(#5c5c5c, var(--el-color-primary));
      height: 20px;
      text-shadow: var(--bl-text-shadow);
      font-size: 12px;
    }

    .chart-container {
      @include box(100%, calc(100% - 320px));
      overflow-x: hidden;
      overflow-y: scroll;
    }
  }

  .middle {
    height: 100%;
    position: relative;
    display: none;
    z-index: 2;
  }

  .web-container {
    @include flex(column, space-between, center);
    height: calc(100% - 60px);
    margin: $margin-web;
    position: relative;
    border-top-left-radius: 10px;
    border-bottom-left-radius: 10px;
    overflow: hidden;
    z-index: 2;
  }

  .web-container-heavy {
    border: 1px solid #00000000;
    box-shadow: var(--bl-box-shadow);
  }

  .web-container-light {
    @include themeBorder(1px, #e6e6e6, #171717);
  }

  .web-show,
  .web-hide {
    @include themeColor(#ababab, #7e7e7e);
    text-shadow: var(--bl-text-shadow);
    position: absolute;
    font-size: 20px;
    z-index: 2;
    transition: color 0.2s;
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary);
    }
  }

  .web-show {
    right: 0;
    top: 30px;
  }

  .web-hide {
    left: 10px;
    top: 10px;
    z-index: 99;
  }

  /** 小于1440时 */
  @media screen and (max-width: 1140px) {
    .web-container {
      opacity: 0 !important;
    }
    .left,
    .right,
    .logo,
    .doclib-name {
      opacity: 0 !important;
    }
  }

  @media screen and (min-width: 1140px) {
    .middle:not(.expand) {
      @include themeBorder(1px, #e6e6e6, #171717, 'left');
      display: block;
      padding: 0 10px 10px 20px;
    }
  }

  // 大于1600时显示 middle
  @media screen and (min-width: 1600px) {
    .middle:not(.fold) {
      @include themeBorder(1px, #e6e6e6, #171717, 'left');
      display: block;
      padding: 0 10px 10px 20px;
    }
  }
}
</style>
