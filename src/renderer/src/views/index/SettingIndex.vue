<template>
  <div class="setting-index-root">
    <el-tabs tab-position="left" class="setting-tabs" v-model="activeTab">
      <el-tab-pane label="文档库" name="login">
        <div class="setting-container">
          <SettingLogin></SettingLogin>
        </div>
      </el-tab-pane>
      <el-tab-pane label="设置" name="setting">
        <SettingConfig></SettingConfig>
      </el-tab-pane>
      <el-tab-pane label="关于" name="about">
        <SettingAboutVue></SettingAboutVue>
      </el-tab-pane>
    </el-tabs>
  </div>
  <div class="version">
    <span>{{ CONFIG.SYS.NAME + ' | ' + CONFIG.SYS.VERSION }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SettingLogin from './SettingLogin.vue'
import SettingConfig from './SettingConfig.vue'
import SettingAboutVue from './SettingAbout.vue'
import CONFIG from '@renderer/assets/constants/system'

onMounted(() => {
  document.title = 'Blossom 设置'
  activeTab.value = 'login'
})

const activeTab = ref('login')
</script>

<style scoped lang="scss">
.setting-index-root {
  @include box(100%, 100%);
  background-image: linear-gradient(160deg, transparent 0%, transparent 75%, var(--el-color-primary-light-5));
  padding: 50px 0 0 50px;
  z-index: 2;

  .setting-tabs {
    width: 100%;
    height: 100%;

    :deep(.el-tabs__nav-wrap::after) {
      background-color: transparent;
    }

    :deep(el-tabs__nav-scroll::after) {
      background-color: transparent;
    }

    :deep(.el-tabs__content) {
      height: 100%;

      .el-tab-pane {
        height: 100%;
      }
    }
  }

  .setting-container {
    @include box(100%, 100%);
    @include flex(row, center, flex-start);
  }
}

.version {
  @include themeColor(#474747, #c0c0c0);
  @include font(12px, 300);
  @include absolute('', 10px, 7px, '');
  z-index: 2;
}

.footer {
  position: absolute;
  bottom: 0;
  z-index: 1;
  height: 80px;
}
</style>
