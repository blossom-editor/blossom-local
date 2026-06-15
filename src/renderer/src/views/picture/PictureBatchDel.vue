<template>
  <div class="picture-batch-del-root">
    <div class="info-title">
      <div class="iconbl bl-delete-line"></div>
      批量删除文件
    </div>
    <div class="content" :style="{ height: delResult.done ? '187px' : '145px' }">
      <bl-row just="center" class="desc">
        已选择 <span class="file-count">{{ props.ids.size }}</span> 个文件。
      </bl-row>
      <div class="desc" style="margin-top: 5px">提示：只会删除未被文章引用的图片。</div>
      <Transition>
        <div v-show="delResult.done" class="result">{{ delResult.msg }}</div>
      </Transition>
      <el-button class="del-btn" size="large" type="primary" :loading="isLoading" @click="del">
        {{ isLoading ? '正在删除' : '开始删除' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { pictureDeleteBatchApi } from '@renderer/api/picture'
import { ref } from 'vue'

const props = defineProps({
  ids: { type: Set<string>, required: true }
})

const isLoading = ref(false)
const delResult = ref({ done: false, msg: '' })

const del = () => {
  if (props.ids.size <= 0) {
    return
  }
  isLoading.value = true
  pictureDeleteBatchApi({ ids: Array.from(props.ids) }).then((resp: R<PictureDeleteBatchRes>) => {
    delResult.value.msg = `${resp.data?.success} 个文件成功删除。 \n${resp.data?.inuse} 文件正在使用中。 \n${resp.data?.fault} 个文件删除失败。`
    setTimeout(() => {
      isLoading.value = false
      delResult.value.done = true
      emits('deleted', resp.data!.successIds)
    }, 1000)
  })
}

const emits = defineEmits(['deleted'])
</script>

<style scoped lang="scss">
@import '@renderer/assets/styles/bl-dialog-info';

.picture-batch-del-root {
  @include box(100%, 100%);
  border-radius: 10px;

  .content {
    padding: 10px;
    font-weight: 300;
    transition: height 0.4s;
    position: relative;

    .desc {
      text-align: center;
      line-height: 30px;
    }

    .file-count {
      @include font(30px, 700);
      padding: 0 10px;
    }

    .del-btn {
      margin: 15px 0 3px 0;
      font-size: 17px;
      font-weight: 300;
      transition: all 0.3s;
      position: absolute;
      bottom: 15px;
      right: 15px;
    }

    .result {
      @include themeBg(#e1e1e1, #1b1b1b);
      line-height: 30px;
      padding: 0 10px;
      border: 1px solid var(--el-border-color);
      margin-top: 10px;
      border-radius: 8px;
      white-space: pre;
    }
  }

  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.5s ease;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
}
</style>
