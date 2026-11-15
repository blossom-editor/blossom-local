<template>
  <div class="key-desc-root">
    <div class="info-title">
      <div class="iconbl bl-jianpan-xianxing"></div>
      文章编辑快捷键
    </div>

    <div class="content">
      <div class="kind">页面快捷键</div>
      <bl-row v-for="key in keymapsView" :key="key.name">
        <div>
          <span :class="['iconbl', key.icon]"></span>
          <span class="label">{{ key.name }}</span>
        </div>
        <div class="keyboard">{{ key.key }}</div>
      </bl-row>

      <div class="kind">工具栏快捷键</div>
      <bl-row v-for="key in keymapsTool" :key="key.name">
        <div>
          <span :class="['iconbl', key.icon]"></span>
          <span class="label">{{ key.name }}</span>
        </div>
        <div class="keyboard">{{ key.key }}</div>
      </bl-row>

      <div class="kind">编辑器快捷键</div>
      <bl-row v-for="key in keymapsEditor" :key="key.name">
        <div>
          <span :class="['iconbl', key.icon]"></span>
          <span class="label">{{ key.name }}</span>
        </div>
        <div class="keyboard">{{ key.key }}</div>
      </bl-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { keymaps } from './scripts/editor-tools'

/** 页面级快捷键 */
const keymapsView = [{ icon: 'bl-a-eyeclose-line', name: '隐藏左侧菜单', key: keymaps.hideDocs }]

/** 工具栏对应的快捷键 */
const keymapsTool = [
  { icon: 'bl-a-texteditorsave-line', name: '保存内容', key: keymaps.save },

  { icon: 'bl-bold', name: '加粗', key: keymaps.blod },
  { icon: 'bl-italic', name: '斜体', key: keymaps.italic },
  { icon: 'bl-strikethrough', name: '删除线', key: keymaps.striket },
  { icon: 'bl-a-texteditorsuperscript-line', name: '上标', key: '工具栏按钮' },
  { icon: 'bl-a-texteditorsubscript-line', name: '下标', key: '工具栏按钮' },
  { icon: 'bl-separator', name: '分割线', key: '工具栏按钮' },

  { icon: 'bl-a-rightsmallline-line', name: '引用', key: keymaps.blockquote },
  { icon: 'bl-single-quotes-r', name: '行内代码', key: keymaps.code },
  { icon: 'bl-double-quotes-r', name: '多行代码', key: keymaps.pre },
  { icon: 'bl-a-underbox-line', name: '单选框', key: '工具栏按钮' },
  { icon: 'bl-list-unordered', name: '无序列表', key: keymaps.unordered },
  { icon: 'bl-list-ordered', name: '有序列表', key: keymaps.ordered },

  { icon: 'bl-table-', name: '插入表格', key: keymaps.table },
  { icon: 'bl-image--line', name: '添加图片，也可拖入或黏贴', key: keymaps.image },
  { icon: 'bl-link-m', name: '添加链接', key: keymaps.link }
]

/** 编辑器内快捷键 */
const keymapsEditor = [
  { icon: 'bl-a-h1', name: '一级标题', key: keymaps.heading1 },
  { icon: 'bl-a-h2', name: '二级标题', key: keymaps.heading2 },
  { icon: 'bl-a-h3', name: '三级标题', key: keymaps.heading3 },
  { icon: 'bl-enter', name: '段内换行', key: keymaps.hardbreak },
  { icon: 'bl-slash', name: '斜杠命令菜单（输入 / 唤起）', key: keymaps.slash },
  { icon: 'bl-search-line', name: '查找正文（高亮命中）', key: keymaps.search },

  { icon: 'bl-a-icon_jiandaojianqie', name: '剪切', key: keymaps.cut },
  { icon: 'bl-a-texteditorforward-line', name: '恢复', key: keymaps.redo },
  { icon: 'bl-a-texteditorback-line', name: '撤销', key: keymaps.undo },
  { icon: 'bl-a-listview-line', name: '全选', key: keymaps.selectAll }
]
</script>

<style scoped lang="scss">
@import '@renderer/assets/styles/bl-dialog-info';

.key-desc-root {
  @include box(100%, 100%);
  border-radius: 10px;

  .content {
    height: calc(100% - 60px);
    padding: 0 10px;
    overflow: scroll;
    font-weight: 300;

    .kind {
      font-size: 16px;
      margin: 10px 0;
      color: var(--el-color-primary);
      text-align: center;
    }

    .bl-row-root {
      justify-content: space-between !important;
      border-radius: 4px;
      padding: 0 10px;

      &:hover {
        @include themeBg(#ececec, #171717);
      }
    }

    .iconbl {
      padding-right: 10px;
    }

    .label {
      width: 270px;
    }

    .keyboard {
      margin-top: 3px;
      font-size: 12px;
    }
  }
}
</style>
