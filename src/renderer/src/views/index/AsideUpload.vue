<template>
  <div class="aside-upload-root">
    <el-tooltip effect="light" placement="right" :show-after="1000" :hide-after="0">
      <template #content>
        从这里上传, 会上传至
        <div v-if="docLibStore.isLogin" style="color: var(--el-color-primary); text-decoration: underline">
          {{ docLibStore.cur!.path }}
        </div>
        <span v-else>文档库根目录</span>
      </template>
      <el-upload
        name="file"
        :http-request="upload"
        :data="(f: UploadRawFile) => buildDate(f)"
        :show-file-list="false"
        :before-upload="beforeUpload"
        :on-success="onUploadSeccess"
        :on-error="onError"
        :disabled="!docLibStore.isLogin"
        drag
        multiple>
        <upload-filled />
      </el-upload>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
/**
 * 该模块不使用, 暂留
 * @description: AsideUpload
 */
import type { UploadProps, UploadRawFile, UploadRequestOptions } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useDocLibStore } from '@renderer/stores/docLib'
import Notify from '@renderer/scripts/notify'

const docLibStore = useDocLibStore()

/**
 * 上传方法
 * @param options
 */
const upload = (_options: UploadRequestOptions) => {}

/**
 *
 * upload 组件的 data 数据获取
 * @param rawFile
 * @param pid
 * @returns
 */
const buildDate = (rawFile: UploadRawFile) => {
  return { originFilePath: rawFile.path, targetDocLibRoot: true }
}

/**
 * 上传校验
 */
const beforeUpload: UploadProps['beforeUpload'] = (_rawFile) => {
  return true
}

/**
 * 上传成功
 * @param resp
 * @param _file
 */
const onUploadSeccess: UploadProps['onSuccess'] = (_resp, _file?) => {
  return true
  // if (resp.code === '20000') {
  //   Notify.success('上传成功')
  //   return true
  // } else {
  //   Notify.error(resp.msg, '上传失败')
  //   return false
  // }
}

/**
 * 上传失败
 * @param error
 * @param _file
 * @param _files
 */
const onError: UploadProps['onError'] = (error, _file, _files) => {
  if (error.message != undefined) {
    if (error.message.indexOf('fail to post') > -1 && error.message.indexOf('/picture/file/upload 0') > -1) {
      Notify.error('可能是由于您上传的文件过大, 请检查服务端上传大小限制。', '上传失败')
    } else {
      try {
        let resp = JSON.parse(error.message)
        if (resp != undefined) {
          Notify.error(resp.msg, '上传失败')
        }
      } catch (e) {
        Notify.error(error.message, '上传失败')
      }
    }
  }
}
</script>

<style scoped lang="scss">
.aside-upload-root {
  @include box(100%, 100px);
  color: var(--el-color-primary);
  padding: 5px;

  :deep(.el-upload) {
    @include box(100%, 100%);
    --el-upload-dragger-padding-horizontal: 20px;
    --el-upload-dragger-padding-vertical: 3px;
    --el-fill-color-blank: var(--el-color-primary-light-9);
    --el-border-color: var(--el-color-primary-light-3);
    color: var(--el-color-primary-light-5);

    :deep(svg) {
      transition: 0.3s;
    }

    :hover {
      color: var(--el-color-primary);
    }
  }
}
</style>
