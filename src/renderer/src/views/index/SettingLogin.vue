<template>
  <div class="doclib-root">
    <div class="doclib-container">
      <div v-for="docLib in sortDocLib(items)" :key="docLib.path" class="doclib-item" @click="toEditor(docLib)">
        <img :class="['pin', docLib.isTop ? '' : 'pin-hidden']" src="@renderer/assets/imgs/note/pin.png" />
        <div class="avatar-wrapper">
          <img v-if="docLib.icon != ''" class="avatar" :src="docLib.icon + '&blossom_pic_ignore=true'" @error="onErrorImg" />
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
      </div>
      <div class="doclib-item-empty">
        <!-- <div class="item" @click="createDocLib"><span class="iconbl bl-fileadd-line"></span>新建文档库</div> -->
        <div class="item" @click="openDocLib"><span class="iconbl bl-read-line"></span>打开文档库</div>
      </div>
    </div>
  </div>

  <el-dialog
    v-model="isShowDocLibLoading"
    class="bl-dialog-hidden-header-fixed-body"
    width="500"
    align-center
    :modal="false"
    :destroy-on-close="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false">
    <div class="doclib-loading-root">
      <div class="info">正在检查文档库配置, 请稍后....</div>
      <el-progress :percentage="30" :stroke-width="15" :show-text="false" striped striped-flow />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import router from '@renderer/router'
import { storeToRefs } from 'pinia'
import { useDocLibStore } from '@renderer/stores/docLib'
import { isNotBlank, isNotNull, isNull } from '@renderer/assets/utils/obj'
import { checkDocLibConfigApi, openFileLocation, selectDocLibFolderDialogApi, selectDocLibIconDialogApi } from '@renderer/api/docLib'
import { ElMessageBox } from 'element-plus'
import { picCacheRefresh, picCacheWrapper, protocolWrapper } from '../picture/scripts/picture'
import Notify from '@renderer/scripts/notify'
import errorImg from '@renderer/assets/imgs/img_error.png'
import { ref } from 'vue'

const docLibStore = useDocLibStore()
const { items } = storeToRefs(docLibStore)

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
  selectDocLibFolderDialogApi().then((resp) => {
    if (isNotNull(resp.data) || isNotBlank(resp.data!.name)) {
      docLibStore.addDocItem(resp.data!)
    }
  })
}

const selectIcon = (docLib: DocLibItem) => {
  const params: SelectDocLibIconReq = { docLibPath: docLib.path }
  selectDocLibIconDialogApi(params).then((resp) => {
    if (isNull(resp.data)) {
      return
    }
    picCacheRefresh()
    docLib.icon = protocolWrapper(picCacheWrapper(resp.data?.filePath as string))
    docLibStore.updItem(docLib)
  })
}

const delDocLibItem = (event: MouseEvent, docLib: DocLibItem) => {
  ElMessageBox.confirm(
    `<strong>删除文档库不会删除源文件</strong><br/>
    是否删除文档库《${docLib.name}》？<br/>
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
  isLoaded.value = false
  setTimeout(() => {
    if (isLoaded.value === false) {
      isShowDocLibLoading.value = true
    }
  }, 1000)
  // 主进程切换文档库成功后, 渲染进程切换文档库
  checkDocLibConfigApi({ docLibPath: docLib.path })
    .then((resp) => {
      if (resp.ok) {
        docLibStore.setCurDoc(docLib)
        router.push('/articleIndex')
      } else {
        Notify.error(resp.msg, '打开文档库失败')
      }
    })
    .finally(() => {
      isLoaded.value = true
      isShowDocLibLoading.value = false
    })
}

const stopPropagation = (event: MouseEvent) => {
  event.stopPropagation()
}

const onErrorImg = (a: Event) => {
  let imgEle = a.target as HTMLImageElement
  if (imgEle) {
    imgEle.src = errorImg
    imgEle.classList.add('img-error')
    imgEle.style.width = '62px'
    imgEle.style.height = 'auto'
    if (imgEle.parentNode) {
      let imgWrapper: HTMLElement = imgEle.parentNode as HTMLElement
      imgWrapper.style.backgroundColor = 'var(--bl-bg-color)'
    }
  }
}

//#region 进入文档库弹框提示
const isShowDocLibLoading = ref(false)
const isLoaded = ref(false)
//#endregion
</script>

<style scoped lang="scss">
@import './styles/setting-doclib.scss';

.doclib-loading-root {
  padding: 10px 20px 20px;
  .info {
    margin-bottom: 10px;
  }
}
</style>
