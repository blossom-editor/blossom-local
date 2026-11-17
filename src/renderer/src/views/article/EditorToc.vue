<template>
  <!--
    右侧目录栏

    - 目录：由 milkdown 渲染后的标题 DOM 解析而来（见 WysiwygEditor.getHeadings），
      点击某一项会让编辑器滚动到对应标题
    - 图片：当前文章引用的图片列表，点击可打开图片信息面板
  -->
  <div :class="['editor-toc-pane', collapsed ? 'is-collapsed' : '']">
    <!-- 目录 -->
    <div class="toc-header" @click="collapsed = !collapsed">
      <span class="title">目录</span>
      <span :class="['iconbl', collapsed ? 'bl-a-leftdirection-line' : 'bl-a-rightsmallline-line']"></span>
    </div>
    <div class="toc-list" v-show="!collapsed">
      <div v-if="headings.length === 0" class="toc-empty">暂无标题</div>
      <div
        v-for="head in headings"
        :key="head.index"
        :class="['toc-item', `toc-${head.level}`]"
        :title="head.text"
        @click="emits('clickHeading', head.index)">
        <!-- 按正文里的着色切段渲染：只有被上色的那几段变色，其余跟随主题 -->
        <span v-for="(run, runIndex) in head.runs" :key="runIndex" :style="run.color ? { color: run.color } : undefined">{{ run.text }}</span>
        <template v-if="head.runs.length === 0">（无标题文字）</template>
      </div>
    </div>

    <!-- 分割 + 图片 -->
    <template v-if="!collapsed">
      <div class="toc-header split">
        <span class="title">图片</span>
        <el-tooltip effect="dark" placement="right" :hide-after="0" content="重新加载图片缓存">
          <span class="iconbl bl-refresh-line" @click.stop="emits('refreshImages')"></span>
        </el-tooltip>
      </div>
      <div class="image-list">
        <div v-if="images.length === 0" class="toc-empty">暂无图片</div>
        <div class="image-wrapper" v-for="image in images" :key="image.targetUrl" @click="emits('clickImage', image.targetUrl)">
          <img :src="image.targetUrl" loading="lazy" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { HeadingItem } from './scripts/milkdown/editor'
import type { ArticleReference } from './scripts/article'

defineProps({
  /** 标题列表 */
  headings: { type: Array as () => HeadingItem[], default: () => [] },
  /** 文章引用的图片 */
  images: { type: Array as () => ArticleReference[], default: () => [] }
})

const emits = defineEmits(['clickHeading', 'refreshImages', 'clickImage'])

/** 是否收起 */
const collapsed = ref(false)
</script>

<style scoped lang="scss">
.editor-toc-pane {
  @include box(210px, 100%);
  min-width: 210px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--el-border-color);
  background-color: var(--bl-editor-gutters-bg-color);
  /* 同 `.editor-body`：clip 只裁剪，不让自己变成可被 scrollIntoView 滚走的容器 */
  overflow: clip;
  transition: min-width 0.2s;

  &.is-collapsed {
    min-width: 34px;
    width: 34px;
  }

  .toc-header {
    @include flex(row, space-between, center);
    height: 30px;
    min-height: 30px;
    padding: 0 8px;
    font-size: 12px;
    color: var(--bl-text-color);
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid var(--el-border-color);

    &.split {
      border-top: 1px solid var(--el-border-color);
      cursor: default;
    }

    .title {
      font-weight: 600;
      white-space: nowrap;
    }

    .iconbl {
      font-size: 11px;
      color: var(--bl-text-color-light);
      padding: 2px;

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  .toc-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 6px 0;

    &::-webkit-scrollbar {
      width: 6px;
    }

    .toc-item {
      padding: 3px 8px;
      font-size: 12px;
      /* 基础色；局部着色由内部 span 的内联 style 覆盖（见 getHeadings 的 runs） */
      color: var(--bl-text-color);
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-left: 2px solid transparent;

      &:hover {
        color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
        border-left-color: var(--el-color-primary-light-5);
      }

      // 按标题级别缩进
      &.toc-1 {
        font-weight: 600;
      }
      &.toc-2 {
        padding-left: 18px;
      }
      &.toc-3 {
        padding-left: 28px;
      }
      &.toc-4 {
        padding-left: 38px;
        color: var(--bl-text-color-light);
      }
      &.toc-5,
      &.toc-6 {
        padding-left: 48px;
        color: var(--bl-text-color-light);
      }
    }
  }

  .image-list {
    @include flex(row, flex-start, flex-start);
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px;
    max-height: 220px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
    }

    .image-wrapper {
      @include box(56px, 56px);
      border: 1px solid var(--el-border-color);
      border-radius: 4px;
      overflow: hidden;
      cursor: pointer;

      img {
        @include box(100%, 100%);
        object-fit: cover;
      }

      &:hover {
        border-color: var(--el-color-primary);
      }
    }
  }

  .toc-empty {
    padding: 8px;
    font-size: 11px;
    color: var(--bl-text-color-light);
    text-align: center;
  }
}
</style>
