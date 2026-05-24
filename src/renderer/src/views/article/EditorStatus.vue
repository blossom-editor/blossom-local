<template>
  <div class="editor-status-root">
    {{ curDoc }}
    <bl-row width="calc(100% - 260px)" height="100%" class="status-item-container">
      <div>{{ curDoc?.name }}</div>
      <div>ID:{{ curDoc?.id }}</div>
      <div>路径:{{ curDoc?.path }}</div>
      <div>最近修改:{{ curDoc?.updTime }}</div>
    </bl-row>
    <bl-row just="flex-end" width="260px" height="100%" class="status-item-container">
      <div @click="openArticleReferenceWindow"><span class="iconbl bl-correlation-line"></span>引用</div>
      <bl-col width="80px" just="center"> 字数:{{ curDoc?.words }} </bl-col>
      <bl-col width="70px" just="center"> 渲染:{{ props.renderInterval }}ms </bl-col>
      <div>保存状态: ●</div>
    </bl-row>
  </div>
</template>

<script setup lang="ts">
import { inject, toRaw } from 'vue'
import type { Ref } from 'vue'
import { provideKeyCurArticleInfo } from '@renderer/views/doc/doc'
import { openNewArticleReferenceWindow } from '@renderer/assets/utils/electron'

const props = defineProps({
  renderInterval: {
    type: Number,
    default: 0
  }
})

const curDoc = inject<Ref<DocInfo | undefined>>(provideKeyCurArticleInfo)

const openArticleReferenceWindow = () => {
  if (curDoc && curDoc.value) {
    openNewArticleReferenceWindow(toRaw(curDoc.value))
  }
}
</script>

<style scoped lang="scss">
.editor-status-root {
  @include flex(row, space-between, center);
  @include box(100%, 100%);
  @include font(10px, 500);
  color: var(--bl-editor-color);
  background-color: var(--bl-editor-gutters-bg-color);

  .status-item-container {
    overflow-x: hidden;
    white-space: nowrap;

    & > div {
      height: 100%;
      padding: 0 5px;
      cursor: pointer;

      .iconbl {
        padding-right: 4px;
      }

      &:hover {
        background-color: var(--bl-editor-bg-color);
      }
    }
  }

  .tag-root {
    cursor: pointer;
  }

  div {
    @include flex(row, flex-start, center);
  }
}
</style>
