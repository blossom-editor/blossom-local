<template>
  <div class="doclib-root">
    <div class="doclib-container">
      <div v-for="doc in docLibStore.items" :key="doc.path" class="doclib-item" @click="toEditor(doc)">
        <div class="avatar-wrapper">
          <img v-if="doc.icon != ''" class="avatar" :src="doc.icon" />
          <img v-else class="avatar" src="@renderer/assets/imgs/default_user_avatar.jpg" />
        </div>
        <el-tooltip :content="doc.name" transition="none" effect="light" placement="top" :show-after="1000" :hide-after="0">
          <div class="name">{{ doc.name }}</div>
        </el-tooltip>

        <el-tooltip :content="doc.path" transition="none" effect="light" placement="top" :show-after="1000" :hide-after="0">
          <div class="path">{{ doc.path }}</div>
        </el-tooltip>
        <div class="desc">{{ doc.desc }}</div>
        <div class="operation">
          <div class="cretime">{{ doc.creTime }}</div>
          <el-dropdown placement="top">
            <div class="iconbl bl-a-morevertical-line"></div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item><span class="iconbl bl-pen" style="margin-right: 10px"></span>编辑</el-dropdown-item>
                <el-dropdown-item><span class="iconbl bl-star-fill" style="margin-right: 10px"></span>置顶</el-dropdown-item>
                <el-dropdown-item><span class="iconbl bl-computer-line" style="margin-right: 10px"></span>查看原文件</el-dropdown-item>
                <el-dropdown-item divided>
                  <span class="iconbl bl-delete-line" style="margin-right: 10px; color: var(--bl-preview-blockquote-border-red)"></span>
                  <span style="color: var(--bl-preview-blockquote-border-red)">删除</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <!-- <el-button text bg style="margin-left: 5px"">
          <span class="iconbl bl-folder-download-line"></span>
        </el-button> -->
      </div>
      <div class="doclib-item-empty">
        <div class="item" @click="createDocLib"><span class="iconbl bl-fileadd-line"></span>新建文档库</div>
        <div class="item" @click="openDocLib"><span class="iconbl bl-read-line"></span>打开文档库</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import router from '@renderer/router'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useDocLibStore } from '@renderer/stores/docLib'
import { openFileDialog } from '@renderer/api/blossom'
import { isNotBlank, isNotNull } from '@renderer/assets/utils/obj'

const docLibStore = useDocLibStore()

// 打开一个文件夹作为文档库
const openDocLib = () => {
  console.log('打开文档库')
  openFileDialog().then((resp) => {
    if (isNotNull(resp.data) || isNotBlank(resp.data!.name)) {
      docLibStore.addDocItem(resp.data!)
    }
  })
}


const createDocLib = () => {
  console.log('新建文档库')
}

const toEditor = (doc: DocLibItem) => {
  docLibStore.setCurDoc(doc)
}
</script>

<style scoped lang="scss">
@import './styles/setting-doclib.scss';
</style>
