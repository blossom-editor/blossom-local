<template>
  <div class="editor-status-root">
    <bl-row width="calc(100% - 260px)" height="100%" class="status-item-container-left">
      <div v-show="curDoc">{{ curDoc?.name }}</div>
      <div v-show="curDoc" class="updTime">最近修改:{{ curDoc?.updTime }}</div>
      <el-tooltip :content="curDoc?.path" trigger="click" effect="light" placement="top" :hide-after="0">
        <div v-show="curDoc" class="path">路径:{{ curDoc?.path }}</div>
      </el-tooltip>
      <el-tooltip :content="curDoc?.id" trigger="click" effect="light" placement="top" :hide-after="0">
        <div v-show="curDoc" class="id">ID:{{ curDoc?.id }}</div>
      </el-tooltip>
    </bl-row>
    <bl-row just="flex-end" width="260px" height="100%" class="status-item-container-left">
      <div v-show="curDoc" class="button" @click="openArticleReferenceWindow"><span class="iconbl bl-correlation-line"></span>引用</div>
      <div v-show="curDoc" just="center">字数:{{ formartNumber(curDoc?.words) }}</div>
      <div v-show="curDoc" just="center">渲染:{{ props.renderInterval }}ms</div>
      <div v-show="curDoc">保存状态: <span style="color: red">●</span></div>
    </bl-row>
  </div>
</template>

<script setup lang="ts">
import { inject, toRaw } from 'vue'
import type { Ref } from 'vue'
import { provideKeyCurArticleInfo } from '@renderer/views/doc/doc'
import { openNewArticleReferenceWindow } from '@renderer/assets/utils/electron'
import { formartNumber } from '@renderer/assets/utils/util'

const props = defineProps({
  renderInterval: {
    type: Number,
    default: 0
  },
  isSave: {
    type: Boolean,
    default: false
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

  .status-item-container-left {
    overflow-x: hidden;
    white-space: nowrap;

    .id,
    .path {
      max-width: 125px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .button {
      @include flex(row, center, center);
    }

    & > div {
      height: 100%;
      padding: 7px 5px;
      cursor: pointer;

      .iconbl {
        padding-right: 4px;
      }

      &:hover {
        background-color: var(--bl-editor-bg-color);
      }
    }
  }

  .status-item-container-left {
    & > div {
      border-right: 1px solid var(--el-border-color);
    }
    & > div:first-child {
      border-right: none;
    }
  }

  .status-item-container-right {
    & > div {
      border-left: 1px solid var(--el-border-color);
    }
    & > div:last-child {
      border-right: none;
    }
  }

  .tag-root {
    cursor: pointer;
  }
}
</style>
