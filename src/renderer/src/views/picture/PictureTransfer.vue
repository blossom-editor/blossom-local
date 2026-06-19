<template>
  <div class="picture-transfer-root">
    <div class="info-title">
      <div class="iconbl bl-switch-line"></div>
      移动文件
    </div>
    <div class="content">
      <div class="tips" style="margin-bottom: 10px">注意: 名称重复的图片不会被移动</div>
      <el-tree
        class="pic-transfer-tree"
        node-key="i"
        :highlight-current="true"
        :indent="10"
        :data="docTreeData"
        :props="defaultProps"
        @node-click="handleNodeClick">
        <template #default="{ node, data }">
          <div class="tree-content">
            <img
              class="menu-icon-img"
              v-if="isNotBlank(data.icon) && (data.icon.startsWith('http') || data.icon.startsWith('https')) && !data.updn"
              :src="data.icon" />
            <svg v-else-if="isNotBlank(data.icon) && !data.updn" class="icon menu-icon" aria-hidden="true">
              <use :xlink:href="'#' + data.icon"></use>
            </svg>
            <span>{{ node.label }}</span>
          </div>
        </template>
      </el-tree>
    </div>
    <div class="info-footer">
      <bl-row class="target" just="space-between">
        <bl-row width="fit-content">
          <span class="file-count">{{ props.ids.size }}</span>
          <span class="folder">个文件移动至：{{ targetDoc?.name }}</span>
        </bl-row>
        <el-button class="transfer-btn" size="default" type="primary" :loading="isLoading" @click="transfer"> 确认 </el-button>
      </bl-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { isNotBlank, isNull } from '@renderer/assets/utils/obj'
import { useDocLibStore } from '@renderer/stores/docLib'
import { buildDocLibRootFolder } from '../doc/doc-tree'
import { pictureMoveBatchApi } from '@renderer/api/picture'
import Notify from '@renderer/scripts/notify'
import { docTreeApi } from '@renderer/api/docLib'

const defaultProps = { children: 'children', label: 'formatName' }
const docLibStore = useDocLibStore()

onMounted(() => {
  docTreeApi({ type: 'FOLDER' }).then((resp) => {
    if (resp.data) {
      docTreeData.value = [buildDocLibRootFolder(docLibStore.cur!.path)].concat(resp.data)
    }
  })
})

const props = defineProps({
  ids: { type: Set<string>, required: true },
  curFolderId: { type: String, required: false }
})

const docTreeData = ref<DocTree[]>([])
const isLoading = ref(false)
const targetDoc = ref<DocTree>()

/**
 * 移动文件
 */
const transfer = () => {
  if (props.ids.size <= 0) {
    return
  }
  if (isNull(targetDoc.value)) {
    return
  }
  if (targetDoc.value!.id === props.curFolderId) {
    Notify.error('不能移动到原目录', '移动失败')
    return
  }

  isLoading.value = true

  const req: PictureMoveBatchReq = { ids: Array.from(props.ids), targetDocId: targetDoc.value!.id, targetDocLibRoot: false }
  if (targetDoc.value!.id === '-1') {
    req.targetDocLibRoot = true
  }

  pictureMoveBatchApi(req)
    .then((_resp) => {
      emits('transferred')
    })
    .finally(() => {
      isLoading.value = false
    })
}

const handleNodeClick = (data: DocTree) => {
  targetDoc.value = data
}

const emits = defineEmits(['transferred'])
</script>

<style scoped lang="scss">
@import '@renderer/assets/styles/bl-dialog-info';
$icon-size: 17px;

.picture-transfer-root {
  border-radius: 10px;
  @include box(100%, 100%);

  .content {
    padding: 10px;
    font-weight: 300;
    transition: height 0.4s;
    position: relative;

    .pic-transfer-tree {
      background-color: var(--bl-dialog-bg-color);
      max-height: 60vh;
      overflow: scroll;
    }

    .tree-content {
      @include flex(row, flex-start, center);
      height: 25px;
      overflow: hidden;

      .menu-icon,
      .menu-icon-img {
        @include box($icon-size, $icon-size, $icon-size, $icon-size, $icon-size, $icon-size);
        border-radius: 3px;
        margin-right: 8px;
      }
    }

    .transfer-btn {
      font-size: 17px;
      font-weight: 300;
      transition: all 0.3s;
    }
  }

  .target {
    @include font(13px, 300);
    .file-count {
      @include font(25px, 700);
      padding-right: 5px;
    }
    .folder {
      max-width: 300px;
      @include ellipsis();
    }
  }
}
</style>
