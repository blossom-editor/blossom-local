<template>
  <!--
    Markdown 源码分屏（只读）

    与 milkdown 官方 playground 的左右分栏类似：左边所见即所得，右边随时查看
    当前文档对应的 markdown 源码。这里保持只读，避免「两处同时编辑」带来的
    内容覆盖问题；需要修改请直接在左侧编辑。
  -->
  <div class="editor-source-pane">
    <div class="source-header">
      <span class="title">
        Markdown 源码
        <span class="sub">只读</span>
      </span>
      <div class="actions">
        <el-tooltip content="复制全部内容" effect="light" placement="bottom" :hide-after="0">
          <span class="iconbl bl-copy-line" @click="copyAll"></span>
        </el-tooltip>
        <el-tooltip content="刷新" effect="light" placement="bottom" :hide-after="0">
          <span class="iconbl bl-refresh-line" @click="emits('refresh')"></span>
        </el-tooltip>
        <el-tooltip content="关闭源码分屏" effect="light" placement="bottom" :hide-after="0">
          <span class="iconbl bl-a-closeline-line" @click="emits('close')"></span>
        </el-tooltip>
      </div>
    </div>
    <pre class="source-content">{{ markdown }}</pre>
  </div>
</template>

<script setup lang="ts">
import { writeText } from '@renderer/assets/utils/electron'

const props = defineProps({
  /** 当前 markdown 源码 */
  markdown: { type: String, default: '' }
})

const emits = defineEmits(['refresh', 'close'])

const copyAll = () => writeText(props.markdown)
</script>

<style scoped lang="scss">
.editor-source-pane {
  @include box(38%, 100%);
  min-width: 280px;
  @include flex(column, flex-start, stretch);
  border-left: 1px solid var(--el-border-color);
  background-color: var(--bl-editor-bg-color);
  overflow: hidden;

  .source-header {
    @include flex(row, space-between, center);
    height: 30px;
    min-height: 30px;
    padding: 0 8px;
    border-bottom: 1px solid var(--el-border-color);
    background-color: var(--bl-editor-gutters-bg-color);
    font-size: 12px;
    color: var(--bl-text-color);
    user-select: none;

    .title {
      font-weight: 600;
    }

    .sub {
      margin-left: 6px;
      font-size: 11px;
      font-weight: 400;
      color: var(--bl-text-color-light);
    }

    .actions {
      @include flex(row, flex-end, center);
      gap: 8px;

      .iconbl {
        font-size: 13px;
        color: var(--bl-text-color-light);
        cursor: pointer;

        &:hover {
          color: var(--el-color-primary);
        }
      }
    }
  }

  .source-content {
    flex: 1;
    min-height: 0;
    font-size: 12px;
    line-height: 1.4;
    margin: 0;
    padding: 12px 20px;
    color: var(--bl-editor-color);
    white-space: pre-wrap;
    word-break: break-all;
    tab-size: 2;
    overflow: auto;
    user-select: text;

    &::-webkit-scrollbar {
      width: 8px;
    }
  }
}
</style>
