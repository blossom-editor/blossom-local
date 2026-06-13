<template>
  <div :class="['index-setting-root', viewStyle.isShowAsideSimple ? 'simple' : '']">
    <el-switch
      inline-prompt
      v-model="isDark"
      :class="['setting-switch', viewStyle.isShowAsideSimple ? 'simple' : '']"
      :size="viewStyle.isShowAsideSimple ? 'default' : 'large'"
      :active-icon="Moon"
      :inactive-icon="Sunny"
      @change="changeTheme" />
    <div v-if="viewStyle.isShowAsideSimple" class="button-group-simple">
      <el-button type="primary" text @click="invokePrintScreen()">
        <el-icon :size="18"><Crop /></el-icon>
      </el-button>
      <el-button type="primary" text @click="toLogin()" style="margin: 0; margin-top: 3px">
        <el-icon :size="18"><Setting /></el-icon>
      </el-button>
    </div>
    <el-button-group v-else>
      <el-button class="setting-button" type="primary" :icon="Setting" @click="toLogin()" />
      <el-button class="setting-button" type="primary" :icon="Crop" @click="invokePrintScreen()" />
    </el-button-group>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useConfigStore } from '@renderer/stores/config'
import { toLogin } from '@renderer/router'
import { Sunny, Moon, Setting, Crop } from '@element-plus/icons-vue'
import { printScreen } from '@renderer/assets/utils/electron'
import { isMacOS, isElectron } from '@renderer/assets/utils/util'
import { isDark, changeTheme } from '@renderer/scripts/global-theme'
import Notify from '@renderer/scripts/notify'

const { viewStyle } = useConfigStore()

onMounted(() => {
  printscreenAfter()
})

/**
 * 调用截图
 */
const invokePrintScreen = () => {
  if (isMacOS() || !isElectron()) {
    Notify.warning('您所在的平台暂不支持截图功能', '抱歉')
    return
  }
  printScreen()
}

/**
 * 截图后处理
 */
const printscreenAfter = () => {
  if (isElectron()) {
    //@ts-ignore
    window.electronAPI.printScreenAfter((_event: any, psCode: any): void => {
      if (psCode == 1) {
        Notify.success('', '图片已保存到接剪切板')
      }
    })
  }
}
</script>

<style scoped lang="scss">
.index-setting-root {
  @include flex(column, space-between, center);
  @include box(100%, 65px);
  padding: 5px;

  .setting-switch {
    margin-bottom: 5px;
    --el-switch-off-color: var(--el-color-primary-light-9);

    :deep(.el-switch__core) {
      border-radius: 4px;
    }

    :deep(.el-switch__action) {
      border-radius: 4px;
    }
  }

  .setting-button {
    padding: 5px;
    font-size: 14px;

    :deep(.el-button--small) {
      margin: 0;
    }
  }
}

.index-setting-root.simple {
  @include flex(column, flex-end, center);
  @include box(100%, 145px);

  .setting-switch.simple {
    transform: rotate(90deg);
    margin-bottom: 16px;
  }

  .button-group-simple {
    @include flex(column, flex-end, center);
    padding: 0;
    margin-bottom: 5px;

    .el-button--small {
      padding: 15px 5px;
    }
  }
}
</style>

<style lang="scss">
.dialog-system-setting {
  .el-dialog__header {
    border-bottom: 1px solid var(--el-border-color);
    padding: 15px;
    margin: 0;
  }

  .el-dialog__body {
    padding: 10px 0 0 0;
  }
}

.dialog-ps-upload {
  position: absolute !important;
  left: 80px;
  bottom: 80px;
  margin: 0 !important;
  padding: 0;

  .el-dialog__header {
    border-bottom: 1px solid var(--el-border-color);
    padding: 10px 10px;
    margin: 0;

    .el-dialog__headerbtn {
      font-size: 20px;
      height: 25px;
      width: 30px;
      top: 10px;
    }
  }

  .el-dialog__body {
    padding: 0;

    .ps-upload-root {
      @include box(100%, 100%);
      @include flex(column, flex-start, flex-start);
      @include font(12px);

      .el-image {
        @include box(100%, 150px);
        border: 10px solid var(--el-color-primary-light-5);

        .img-placeholder {
          @include box(100%, 100%);
          @include flex(column, center, center);
          color: var(--bl-text-color-light);

          div {
            margin-top: 5px;
          }
        }
      }

      .copy-type-desc {
        color: var(--el-color-primary);
        font-style: italic;
        text-decoration: underline;
      }

      .bl-row-root {
        margin-top: 5px;
        padding: 5px;
      }
    }
  }
}
</style>
