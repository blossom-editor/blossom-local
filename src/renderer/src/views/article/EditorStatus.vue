<template>
  <div class="editor-status-root">
    <bl-row width="calc(100% - 260px)" height="100%" class="status-item-container-left">
      <div v-show="curArticle">{{ curArticle?.name }}</div>
      <div v-show="curArticle" class="updTime">最近修改:{{ curArticle?.updTime }}</div>
      <el-tooltip :content="curArticle?.path" effect="light" placement="top" :hide-after="0" :show-after="500">
        <div v-show="curArticle" class="path" @click="openFileLocation(curArticle!.path)">路径:{{ curArticle?.path }}</div>
      </el-tooltip>
      <el-tooltip :content="curArticle?.id" effect="light" placement="top" :hide-after="0" :show-after="500">
        <div v-show="curArticle" class="id">ID:{{ curArticle?.id }}</div>
      </el-tooltip>
    </bl-row>
    <bl-row just="flex-end" width="260px" height="100%" class="status-item-container-right">
      <div v-show="curArticle" class="button" @click="openArticleReferenceWindow"><span class="iconbl bl-correlation-line"></span>引用</div>
      <div v-show="curArticle" just="center">字数:{{ formartNumber(curArticle?.words) }}</div>
      <div v-show="curArticle" just="center">渲染:{{ props.renderInterval }}ms</div>

      <el-tooltip :content="'上次保存: ' + (!lastSaveTime ? '未保存' : lastSaveTime)" trigger="click" effect="light" placement="top" :hide-after="0">
        <div v-show="curArticle">保存状态: <span :class="[saveStatus ? 'save-yes' : 'save-no']">●</span></div>
      </el-tooltip>
    </bl-row>
  </div>
</template>

<script setup lang="ts">
import { inject, toRaw, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { provideKeyCurArticleInfo } from '@renderer/views/doc/doc'
import { openNewArticleReferenceWindow } from '@renderer/assets/utils/electron'
import { formartNumber, getDateTimeFormat } from '@renderer/assets/utils/util'
import { openFileLocation } from '@renderer/api/docLib'

const props = defineProps({
  renderInterval: { type: Number, default: 0 }
})

const curArticle = inject<Ref<DocInfo | undefined>>(provideKeyCurArticleInfo)
const lastSaveTime = ref<string | undefined>()
const saveStatus = ref(true)

watch(
  () => curArticle?.value?.id,
  (newVal: string | undefined) => {
    if (newVal) {
      lastSaveTime.value = undefined
    }
  }
)

const openArticleReferenceWindow = () => {
  if (curArticle && curArticle.value) {
    openNewArticleReferenceWindow(toRaw(curArticle.value))
  }
}

const noSave = () => {
  saveStatus.value = false
}

const isSave = () => {
  saveStatus.value = true
  lastSaveTime.value = getDateTimeFormat()
}

defineExpose({ noSave, isSave })
</script>

<style scoped lang="scss">
.editor-status-root {
  @include flex(row, space-between, center);
  @include box(100%, 100%);
  @include font(10px, 500);
  color: var(--bl-editor-color);
  background-color: var(--bl-editor-gutters-bg-color);

  .status-item-container-left,
  .status-item-container-right {
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
    .save-yes {
      color: var(--el-color-success);
    }
    .save-no {
      color: var(--el-color-danger);
    }
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
