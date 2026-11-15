<!--
  正文查找框（Ctrl + F）

  只负责输入与按钮，真正的查找逻辑在编辑器里（plugins/search.ts 的装饰高亮）。
  父组件（ArticleIndex.vue）把命中数 / 当前下标传进来，组件本身不持有结果状态。
-->
<template>
  <div v-show="visible" class="editor-search">
    <span class="iconbl bl-search-line"></span>
    <input
      ref="inputRef"
      v-model="keyword"
      class="search-input"
      type="text"
      placeholder="查找正文"
      spellcheck="false"
      @input="emits('search', keyword)"
      @keydown="onKeydown" />
    <span class="search-count">{{ countText }}</span>
    <span class="search-nav" title="上一个 (Shift+Enter)" @click="emits('prev')">↑</span>
    <span class="search-nav" title="下一个 (Enter)" @click="emits('next')">↓</span>
    <span class="iconbl bl-a-closeline-line search-close" title="关闭 (Esc)" @click="emits('close')"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps({
  /** 是否显示 */
  visible: { type: Boolean, default: false },
  /** 命中总数 */
  total: { type: Number, default: 0 },
  /** 当前命中下标（从 0 开始，-1 表示无命中） */
  current: { type: Number, default: -1 }
})

const emits = defineEmits(['search', 'next', 'prev', 'close'])

const inputRef = ref<HTMLInputElement>()
const keyword = ref('')

/** 命中计数：无关键字时不显示，有关键字但无命中时显示「无结果」 */
const countText = computed(() => {
  if (!keyword.value) return ''
  if (props.total === 0) return '无结果'
  return `${props.current + 1}/${props.total}`
})

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    // Shift + Enter 向上查找
    emits(event.shiftKey ? 'prev' : 'next')
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    emits('close')
  }
}

/** 输入关键字的入口（Ctrl+F 打开时自动聚焦并选中已有内容） */
const focus = () => {
  inputRef.value?.focus()
  inputRef.value?.select()
}

/** 清空关键字（关闭查找时调用） */
const reset = () => (keyword.value = '')

defineExpose({ focus, reset })
</script>

<style scoped lang="scss">
.editor-search {
  position: absolute;
  top: 10px;
  right: 18px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
  background-color: var(--bl-html-color);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  font-size: 12px;
  color: var(--bl-text-color-light);

  .iconbl {
    font-size: 13px;
    color: var(--bl-text-color-light);
  }

  .search-input {
    width: 150px;
    height: 22px;
    border: none;
    outline: none;
    background-color: transparent;
    color: var(--bl-text-color);
    font-size: 12px;
    font-family: inherit;

    &::placeholder {
      color: var(--bl-text-color-light);
    }
  }

  .search-count {
    min-width: 44px;
    text-align: right;
    white-space: nowrap;
    user-select: none;
  }

  .search-nav {
    width: 18px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    border-radius: 3px;
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: var(--el-fill-color-light);
      color: var(--el-color-primary);
    }
  }

  .search-close {
    cursor: pointer;

    &:hover {
      color: var(--el-color-danger);
    }
  }
}
</style>
