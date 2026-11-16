<template>
  <div class="tree-doc-bottom">
    <!-- AI 模型余额: 入口展示、弹层列表、设置弹窗与查询逻辑都在组件内部 -->
    <AticleTreeDocBottomAI v-model:active-name="activeAiModel"></AticleTreeDocBottomAI>
    <div></div>
    <!-- 网页收藏: 图标分组、大小切换、JSON 设置都在组件内部 -->
    <AticleTreeDocBottomWebCollect v-model:icon-size="webIconSize"></AticleTreeDocBottomWebCollect>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import AticleTreeDocBottomAI from './AticleTreeDocBottomAI.vue'
import AticleTreeDocBottomWebCollect from './AticleTreeDocBottomWebCollect.vue'

/**
 * 底部栏布局组件
 *
 * 这里只负责排布底部的各个功能入口, 不关心各自的数据与交互:
 * - 每个功能封装为独立组件, 通过 props / emits 暴露对外接口
 * - AI 模型余额: 通过 activeName 决定底部栏展示哪个已配置模型
 * - 网页收藏: 通过 iconSize 决定图标大小(大图标每行 5 个, 小图标每行 8 个)
 */

/** 底部栏当前展示的 AI 模型 name, 由 AI 组件通过 update:activeName 回写 */
const activeAiModel = ref<string>('')

/** 网页收藏的图标大小, 由网页收藏组件通过 update:iconSize 回写 */
const webIconSize = ref<string>('')
</script>
<style scoped lang="scss">
.tree-doc-bottom {
  @include flex(row, space-between, center);
  @include box(100%, 28px);
  color: var(--bl-editor-color);
  background-color: var(--bl-editor-gutters-bg-color);
  border-top: 1px solid var(--el-border-color);
}
</style>
