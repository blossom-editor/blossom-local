<template>
  <div class="doclib-root">
    <div class="doclib-container">
      <div v-for="docLib in sortDocLib(docLibStore.items)" :key="docLib.path" class="doclib-item" @click="toEditor(docLib)">
        <img :class="['pin', docLib.isTop ? '' : 'pin-hidden']" src="@renderer/assets/imgs/note/pin.png" />
        <div class="avatar-wrapper">
          <img v-if="docLib.icon != ''" class="avatar" :src="docLib.icon" />
          <img v-else class="avatar" src="@renderer/assets/imgs/default_user_avatar.jpg" style="scale: 110%" />
        </div>
        <el-tooltip :content="docLib.name" transition="none" effect="light" placement="top" :show-after="300" :hide-after="0">
          <div class="name">{{ docLib.name }}</div>
        </el-tooltip>

        <el-tooltip :content="docLib.path" transition="none" effect="light" placement="top" :show-after="300" :hide-after="0">
          <div class="path">{{ docLib.path }}</div>
        </el-tooltip>

        <div class="operation" @click="stopPropagation">
          <div class="cretime">{{ docLib.creTime }}</div>
          <el-dropdown placement="top">
            <div class="iconbl bl-a-morevertical-line"></div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="selectIcon(docLib)">
                  <span class="iconbl bl-pen" style="margin-right: 10px"></span>设置图标
                </el-dropdown-item>
                <el-dropdown-item @click="toTop(docLib)">
                  <span class="iconbl bl-star-fill" style="margin-right: 10px"></span>{{ docLib.isTop ? '取消置顶' : '置顶' }}
                </el-dropdown-item>
                <el-dropdown-item @click="openFileLocation(docLib.path)">
                  <span class="iconbl bl-computer-line" style="margin-right: 10px"></span>查看原文件
                </el-dropdown-item>
                <el-dropdown-item divided @click="delDocLibItem($event, docLib)">
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
        <!-- <div class="item" @click="createDocLib"><span class="iconbl bl-fileadd-line"></span>新建文档库</div> -->
        <div class="item" @click="openDocLib"><span class="iconbl bl-read-line"></span>打开文档库</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import router from '@renderer/router'
import { useDocLibStore } from '@renderer/stores/docLib'
import { selectDocLibFolderDialog, selectFileAndMoveDialog } from '@renderer/api/blossom'
import { isNotBlank, isNotNull, isNull } from '@renderer/assets/utils/obj'
import { openFileLocation } from '@renderer/api/docLib'
import { ElMessageBox } from 'element-plus'

const docLibStore = useDocLibStore()

const sortDocLib = (list: DocLibItem[]) => {
  return list.sort((a, b) => {
    if (a.isTop && !b.isTop) {
      return -1
    }
    if (!a.isTop && b.isTop) {
      return 1
    }
    return 0
  })
}

const openDocLib = () => {
  selectDocLibFolderDialog().then((resp) => {
    if (isNotNull(resp.data) || isNotBlank(resp.data!.name)) {
      docLibStore.addDocItem(resp.data!)
    }
  })
}

const selectIcon = (docLib: DocLibItem) => {
  const params: SelectFileAndMoveReq = {
    targetFilePath: '.blossom',
    docLibPath: docLib.path,
    cover: true,
    newFileName: 'doclib-icon'
  }
  selectFileAndMoveDialog(params).then((resp) => {
    if (isNull(resp.data)) {
      return
    }
    docLib.icon = 'blossom:\\' + resp.data?.filePath + '?t=' + new Date().getTime()
    docLibStore.updItem(docLib)
  })
}

const delDocLibItem = (event: MouseEvent, docLib: DocLibItem) => {
  ElMessageBox.confirm(
    `<strong>删除文档库不会删除源文件</strong><br/>
    是否继续删除《${docLib.name}》？<br/>
    <div style="
    width: 350px;
    border-radius: 5px;
    border:1px solid var(--el-border-color);
    background-color: var(--bl-bg-color);
    margin-top: 10px;
    padding: 10px;
    color: var(--el-color-primary);
    text-decoration: underline;">${docLib.path}</div>`,
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '我再想想',
      type: 'warning',
      draggable: true,
      dangerouslyUseHTMLString: true
    }
  ).then(() => {
    docLibStore.delItem(docLib)
    stopPropagation(event)
  })
}

const toTop = (docLib: DocLibItem) => {
  docLibStore.toTop(docLib)
}

const toEditor = (docLib: DocLibItem) => {
  console.log('toEditor', docLib)
  docLibStore.setCurDoc(docLib)
  router.push('/articleIndex')
}

const stopPropagation = (event: MouseEvent) => {
  event.stopPropagation()
}
</script>

<style scoped lang="scss">
@import './styles/setting-doclib.scss';
</style>
