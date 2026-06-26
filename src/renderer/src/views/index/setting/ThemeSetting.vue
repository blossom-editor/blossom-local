<template>
  <div class="theme-setting-root" ref="ThemeSettingRef">
    <div class="title" ref="ThemeSettingTitleRef">
      <div>
        🎨 Blossom 设置
        <el-switch
          class="setting-switch"
          size="default"
          v-model="isDark"
          :active-icon="Moon"
          :inactive-icon="Sunny"
          inline-prompt
          @change="changeTheme" />
      </div>
      <div class="iconbl bl-a-closeline-line" @click="themeStore.close()"></div>
    </div>

    <div class="content" align="flex-start">
      <el-tabs class="tabs" tab-position="right" v-model="activeTab">
        <!--

        外观

        -->
        <el-tab-pane name="theme" label="外观">
          <bl-row class="prop-name">日间</bl-row>
          <bl-row class="colors" align="flex-start">
            <el-color-picker
              popper-class="theme-color-picker"
              v-model="customLight"
              color-format="rgb"
              @change="changePrimaryColor(customLight, false)" />
            <div
              class="color-item"
              v-for="preset in presetsLight"
              :key="preset.color"
              :style="{ backgroundColor: preset.color }"
              @click="changePrimaryColor(preset.color, false)">
              <div class="name">{{ preset.name }}</div>
            </div>
          </bl-row>

          <!--  -->
          <bl-row class="prop-name">夜间</bl-row>
          <bl-row class="colors" align="flex-start">
            <el-color-picker
              popper-class="theme-color-picker"
              v-model="customDark"
              color-format="rgb"
              @change="changePrimaryColor(customDark, true)" />
            <div
              class="color-item"
              v-for="preset in presetsDark"
              :key="preset.color"
              :style="{ backgroundColor: preset.color }"
              @click="changePrimaryColor(preset.color, true)">
              <div class="name">{{ preset.name }}</div>
            </div>
          </bl-row>

          <bl-row class="prop-row" just="space-between">
            <div class="prop">
              <div class="prop-name">页面立体效果</div>
            </div>
            <el-switch v-model="configViewStyleForm.isGlobalShadow" size="default" @change="changeGlobalShadow" />
          </bl-row>

          <bl-row class="prop-row" just="space-between">
            <div class="prop">
              <div class="prop-name">显示左上角 LOGO</div>
            </div>
            <el-switch v-model="configViewStyleForm.isShowAsideLogo" size="default" @change="changeViewStyle" />
          </bl-row>

          <bl-row class="prop-row" just="space-between">
            <div class="prop">
              <div class="prop-name">简约的左侧菜单</div>
            </div>
            <el-switch v-model="configViewStyleForm.isShowAsideSimple" size="default" @change="changeViewStyle" />
          </bl-row>

          <bl-row class="prop-row" just="space-between">
            <div class="prop">
              <div class="prop-name">显示文件夹图标</div>
            </div>
            <el-switch v-model="configViewStyleForm.isShowFolderOnDocTree" size="default" @change="changeViewStyle" />
          </bl-row>

          <bl-row class="prop-row" just="space-between">
            <div class="prop">
              <div class="prop-name">文件夹图标样式</div>
            </div>
            <div class="folder-type-list">
              <div class="item" @click="changeFolderType('wl-folder')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder0')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder0"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder1')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder1"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder2')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder2"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder3')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder3"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder4')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder4"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder5')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder5"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder6')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder6"></use></svg>
              </div>
              <div class="item" @click="changeFolderType('wl-folder7')">
                <svg class="icon menu-icon" aria-hidden="true"><use xlink:href="#wl-folder7"></use></svg>
              </div>
            </div>
          </bl-row>

          <bl-row v-if="isElectron()" class="prop-row" just="space-between">
            <div class="prop">
              <div class="prop-name">窗口缩放</div>
            </div>
            <el-button-group>
              <el-button @click="zoomOut">缩小</el-button>
              <el-button @click="zoomIn">放大</el-button>
              <el-button @click="zoomReset">还原</el-button>
            </el-button-group>
          </bl-row>

          <div class="tab-tip" style="">修改主题后, 再次切换日间/夜间模式可查看完整效果。</div>
        </el-tab-pane>
        <!--

        编辑器

        -->
        <el-tab-pane name="article" label="编辑器">
          <div class="tab-pane-content">
            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop"><div class="prop-name">编辑器字体</div></div>
              <el-input v-model="configEditorStyleForm.fontFamily" size="default" @input="changeEditorStyle"></el-input>
            </bl-row>
            <div class="conf-tip">文章的字体样式。中英文等宽字体在表格中会有更好的样式表现</div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop"><div class="prop-name">编辑器字体大小</div></div>
              <el-input v-model="configEditorStyleForm.fontSize" size="default" @input="changeEditorStyle">
                <template #append>单位 px</template>
              </el-input>
            </bl-row>
            <div class="conf-tip">文章的字体大小。</div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">文档列表字体大小</div>
              </div>
              <el-input v-model="configViewStyleForm.treeDocsFontSize" size="default" @input="changeViewStyle">
                <template #append>单位 px</template>
              </el-input>
            </bl-row>
            <div class="conf-tip">左侧树状列表的字体大小。</div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">代码块默认语言</div>
              </div>
              <el-input v-model="configEditorStyleForm.defaultPreLanguage" size="default" @input="changeEditorStyle"> </el-input>
            </bl-row>
            <div class="conf-tip">通过快捷键和工具栏按钮生成多行代码块<code>```</code>时的默认语言。</div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">最大渲染字数</div>
              </div>
              <el-input-number
                v-model="configEditorStyleForm.maxWordsCount"
                :min="0"
                :max="200000"
                :step="5000"
                size="default"
                style="width: 40%"
                @change="changeEditorStyle">
                <template #suffix>
                  <span>字数</span>
                </template>
              </el-input-number>
            </bl-row>
            <div class="conf-tip">为防止渲染时卡顿, 文章超过该字数后将禁止渲染, 最大20万字</div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">显示代码块行数</div>
              </div>
              <el-switch v-model="configEditorStyleForm.isShowPreLineNumber" size="default" style="margin-right: 10px" @change="changeEditorStyle" />
            </bl-row>
            <div class="conf-tip"></div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">显示文件数量</div>
              </div>
              <el-switch v-model="configViewStyleForm.isShowFolderFileCount" size="default" style="margin-right: 10px" @change="changeViewStyle" />
            </bl-row>
            <div class="conf-tip">开启后，文件列表会显示文件夹下的文章或图片数量。</div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">显示编辑器左侧边栏</div>
              </div>
              <el-switch v-model="isShowCmGutters" size="default" style="margin-right: 10px" @change="changeCmGuttersDisplay" />
            </bl-row>
            <div class="conf-tip">关闭后, 编辑器做侧边栏会隐藏, 建议隐藏后适当调整编辑器左右边距。</div>
          </div>

          <bl-row class="prop-row" just="space-between" align="flex-start">
            <div class="prop">
              <div class="prop-name">编辑器左右边距</div>
            </div>
            <el-input-number v-model="cmContentPadding" :min="0" :step="5" size="default" style="width: 40%" @change="changeCmContentPadding">
            </el-input-number>
          </bl-row>
          <div class="conf-tip">编辑器左右边距</div>
        </el-tab-pane>

        <!--

        图片管理

        -->
        <el-tab-pane name="picture" label="图片">
          <div class="tab-pane-content">
            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">图片上传后重命名</div>
              </div>
              <el-switch v-model="configPicStyleForm.isAddSuffix" size="default" style="margin-right: 10px" @change="changePicStyle" disabled />
            </bl-row>
            <div class="conf-tip">开启后，若在文档库中重名图片, 会自动为上传的图片增加后缀，如:<code>image_20230101_123015_000.png.</code></div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">图片链接格式</div>
              </div>
              <el-radio-group v-model="configPicStyleForm.picLinkStyle" size="small" @change="changePicStyle">
                <el-radio-button label="文件名" value="NAME" />
                <el-radio-button label="绝对路径" value="ABSOLUTE_PATH" disabled />
                <el-radio-button label="相对路径" value="ABSOLUTE_PATH" disabled />
              </el-radio-group>
            </bl-row>
            <div class="conf-tip">
              <div v-if="configPicStyleForm.picLinkStyle === 'NAME'">
                <span class="blod">推荐方式</span>, 图片链接只包含文件名, 由 Blossom 自动寻找图片.
              </div>
              <div v-else-if="configPicStyleForm.picLinkStyle === 'ABSOLUTE_PATH'">文件的绝对路径, 文件移动后可能导致图片读取错误.</div>
            </div>

            <div class="tab-tip">
              提示: 在整个文档库范围内, Blossom 都不允许图片名称出现重复, 尽管可以在操作系统中添加重复图片, 但在文章中只会显示其中一个.
            </div>
          </div>
        </el-tab-pane>

        <!--

        天气

        -->
        <el-tab-pane name="weather" label="天气">
          <div class="tab-pane-content">
            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">是否开启天气</div>
              </div>
              <el-switch
                v-model="weatherConfigForm.enabled"
                size="default"
                style="margin-right: 10px"
                @change="changeWeather"
                inline-prompt
                active-text="开启"
                inactive-text="关闭" />
            </bl-row>
            <div class="conf-tip">当前只支持<a target="_blank" href="https://id.qweather.com/#/login">和风天气</a></div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop"><div class="prop-name">所在位置代码</div></div>
              <el-input v-model="weatherConfigForm.location" size="default" @input="changeWeather"></el-input>
            </bl-row>
            <div class="conf-tip">
              您所在的城市代码, 可以在<a target="_blank" href="https://github.com/qwd/LocationList/blob/master/China-City-List-latest.csv"
                >中国城市代码</a
              >中查看
            </div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop"><div class="prop-name">API Host</div></div>
              <el-input v-model="weatherConfigForm.host" size="default" @input="changeWeather"></el-input>
            </bl-row>
            <div class="conf-tip">
              和风天气的 API Host, 在<a target="_blank" href="https://console.qweather.com/setting?lang=zh">个人控制台的设置</a>中查看
            </div>

            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop"><div class="prop-name">Key</div></div>
              <el-input v-model="weatherConfigForm.key" size="default" @input="changeWeather"></el-input>
            </bl-row>
            <div class="conf-tip">
              和风天气的 Key, 在<a target="_blank" href="https://console.qweather.com/project?lang=zh">个人控制台的项目管理</a>中查看
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="other" label="其他">
          <div class="tab-pane-content">
            <bl-row class="prop-row" just="space-between" align="flex-start">
              <div class="prop">
                <div class="prop-name">开发者工具</div>
              </div>
              <el-button @click="openDevTools" style="margin-right: 10px"><span class="iconbl bl-bug-line" @click="openDevTools"></span></el-button>
            </bl-row>
          </div>
        </el-tab-pane>
      </el-tabs>
      <!--  -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useConfigStore } from '@renderer/stores/config'
import { Sunny, Moon } from '@element-plus/icons-vue'
import { useDraggable } from '@renderer/scripts/draggable'
import { useThemeStore } from '@renderer/stores/theme'
import type { EditorStyle, ViewStyle, PicStyle, WeatherConfig } from '@renderer/stores/config'
import { isDark, changeTheme, setPrimaryColor, setStyleItemObj, resetStyleItems, getTheme } from '@renderer/scripts/global-theme'
import { setZoomLevel, resetZoomLevel, openDevTools } from '@renderer/assets/utils/electron'
import { isElectron } from '@renderer/assets/utils/util'

const configStore = useConfigStore()

const configEditorStyleForm = ref<EditorStyle>(configStore.editorStyle)
const configViewStyleForm = ref<ViewStyle>(configStore.viewStyle)
const configPicStyleForm = ref<PicStyle>(configStore.picStyle)
const weatherConfigForm = ref<WeatherConfig>(configStore.weatherConfig)

onMounted(() => {
  if (getTheme(true)['--bl-cm-gutters-display'] === 'none') {
    isShowCmGutters.value = false
  } else {
    isShowCmGutters.value = true
  }
  // cm-content-padding
  const paddingText = getTheme(true)['--bl-cm-content-padding']
  const padding = paddingText.replaceAll('px', '').split(' ')
  if (padding.length !== 2) {
    cmContentPadding.value = 0
  } else {
    cmContentPadding.value = Number(padding[1])
  }
})

//#region 修改全局的 blossom-theme-css

const themeStore = useThemeStore()
const ThemeSettingRef = ref()
const ThemeSettingTitleRef = ref()
useDraggable(ThemeSettingRef, ThemeSettingTitleRef)
const activeTab = ref('theme')

const presetsLight = [
  { color: 'rgb(186, 91, 73)', name: '赤缇' },
  { color: 'rgb(136, 118, 87)', name: '茶色' },
  { color: 'rgb(119, 150, 73)', name: '碧山' },
  { color: 'rgb(128, 164, 146)', name: '缈碧' },
  { color: 'rgb(110, 155, 197)', name: '挼蓝' },
  { color: 'rgb(97, 94, 168)', name: '优昙瑞' },
  { color: 'rgb(178, 182, 182)', name: '月魄' },
  { color: 'rgb(199, 198, 183)', name: '霜地' },
  { color: 'rgb(104, 104, 104)', name: '深灰' }
]
const presetsDark = [
  { color: 'rgb(178, 119, 119)', name: '绛纱' },
  { color: 'rgb(173, 146, 49)', name: '立秋' },
  { color: 'rgb(137, 153, 17)', name: '水龙吟' },
  { color: 'rgb(93, 131, 81)', name: '漆姑' },
  { color: 'rgb(84, 118, 137)', name: '太师青' },
  { color: 'rgb(107, 121, 142)', name: '菘蓝' },
  { color: 'rgb(179, 173, 160)', name: '利休白茶' },
  { color: 'rgb(122, 123, 120)', name: '雷雨垂' },
  { color: 'rgb(82, 84, 84)', name: '深灰' }
]

const customLight = ref('')
const customDark = ref('')

const changePrimaryColor = (color: string, themeDark: boolean) => {
  setPrimaryColor(color, themeDark)
}

/**
 * 设置全局阴影
 * @param open
 */
const changeGlobalShadow = (open: boolean) => {
  if (open) {
    resetStyleItems(['--bl-text-shadow', '--bl-text-shadow-light', '--bl-box-shadow-subject', '--bl-drop-shadow-star'], true)
    resetStyleItems(['--bl-text-shadow', '--bl-text-shadow-light', '--bl-box-shadow-subject', '--bl-drop-shadow-star'], false)
  } else {
    let style = {
      '--bl-text-shadow': 'none',
      '--bl-text-shadow-light': 'none',
      '--bl-box-shadow-subject': 'none',
      '--bl-drop-shadow-star': 'none'
    }
    setStyleItemObj(style, true)
    setStyleItemObj(style, false)
  }
  configStore.setViewStyle(configViewStyleForm.value)
}

const isShowCmGutters = ref(true) // 是否显示编辑器侧边栏
const changeCmGuttersDisplay = (open: boolean) => {
  if (open) {
    let style = {
      '--bl-cm-gutters-display': 'flex'
    }
    setStyleItemObj(style, true)
    setStyleItemObj(style, false)
  } else {
    let style = {
      '--bl-cm-gutters-display': 'none'
    }
    setStyleItemObj(style, true)
    setStyleItemObj(style, false)
  }
}

const cmContentPadding = ref(0)
const changeCmContentPadding = (padding: boolean) => {
  let style = {
    '--bl-cm-content-padding': `0px ${padding}px`
  }
  setStyleItemObj(style, true)
  setStyleItemObj(style, false)
}

//#endregion

//#region 修改配置 configStore

const changeEditorStyle = () => {
  configStore.setEditorStyle(configEditorStyleForm.value)
}

const changeViewStyle = () => {
  configStore.setViewStyle(configViewStyleForm.value)
}

const changePicStyle = () => {
  configStore.setPicStyle(configPicStyleForm.value)
}

const changeWeather = () => {
  configStore.setWeather(weatherConfigForm.value)
}

/**
 * 设置文件夹的图标
 * @param folderIcon 图标名称
 */
const changeFolderType = (folderIcon: string) => {
  configViewStyleForm.value.folderIconOnDocTree = folderIcon
  configStore.setViewStyle(configViewStyleForm.value)
}
//#endregion

//#region
let zoomLevel = 0
const zoomIn = () => {
  zoomLevel = zoomLevel + 0.2
  setZoomLevel(0.2)
}
const zoomOut = () => {
  zoomLevel = zoomLevel - 0.2
  setZoomLevel(-0.2)
}

const zoomReset = () => {
  resetZoomLevel()
}
//#endregion

//#region 文档设置

// const themeLight = ref(getTheme(false))
// const themeDark = ref(getTheme(true))

// const setStyle = (name: string, value: string, themeDark: boolean) => {
//   setStyleItem(name, value, themeDark)
// }

//#endregion
</script>

<style lang="scss">
.theme-setting-root {
  @include box(460px, auto);
  background-color: var(--bl-dialog-bg-color);
  box-shadow: var(--bl-dialog-box-shadow);
  border-radius: 8px;
  position: absolute;
  right: 100px;
  top: 100px;
  z-index: 3000;
  overflow: hidden;

  .title {
    @include flex(row, space-between, center);
    height: 52px;
    padding: 10px 10px;
    border-bottom: 1px solid var(--el-border-color);
    color: var(--bl-text-title-color);
    cursor: move;

    .bl-a-closeline-line {
      cursor: pointer;
      &:hover {
        color: var(--el-primary0);
      }
    }
  }

  .content {
    padding: 10px 0 10px 10px;
    height: calc(100% - 52px);
    max-height: 70vh;

    .tabs {
      height: 100%;
      width: 100%;
      max-height: calc(70vh - 20px);

      .el-tabs__content {
        max-height: 100%;
        .el-tab-pane {
          max-height: 100%;
          padding-right: 10px;
          overflow-y: auto;
        }
      }

      .el-tabs__item {
        padding: 0 10px;
      }

      .el-tabs__header-vertical {
        margin-left: 4px;
      }
    }

    .config-module-titile {
      @include flex(row, center, center);
      font-size: 20px;
      text-align: center;
      padding-bottom: 5px;
      margin-top: 40px;
      margin-bottom: 10px;
      color: var(--bl-text-color);
      .iconbl {
        font-size: 25px;
        margin-right: 10px;
      }
    }

    .prop-name {
      @include font(14px, 300);
      color: var(--bl-text-color);
    }
    .colors {
      padding: 10px 0 20px 10px;
      align-content: flex-start;
      flex-wrap: wrap;

      .el-color-picker--small {
        margin: 0 10px 10px 0;
      }

      .color-item {
        @include box(24px, 24px);
        margin: 0 10px 10px 0;
        border-radius: 4px;
        position: relative;
        transition: transform 0.3s;
        cursor: pointer;
        text-align: center;

        .name {
          @include font(13px, 300);
          @include themeColor(#323232, #fff);
          word-break: keep-all;
          bottom: -20px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, 20px);
          transition: opacity 0.4s;
          opacity: 0;
          pointer-events: none;
        }

        &:hover {
          .name {
            opacity: 1;
          }
        }
      }
    }
  }

  .prop-row {
    align-items: flex-start;
    margin-bottom: 4px;

    .prop {
      @include flex(column, flex-start, flex-start);
      width: 130px;
      min-width: 130px;
      margin-top: 5px;
    }

    .el-input {
      width: 100%;
      .el-input-group__append {
        padding: 0 5px;
      }
    }
    .el-switch {
      height: 24px;
    }
  }

  .conf-tip,
  .tab-tip {
    @include font(12px, 500);
    min-height: 26px;
    color: var(--bl-text-color-light);
    border-bottom: 1px solid var(--el-border-color);
    padding-bottom: 10px;
    margin-bottom: 15px;
    word-break: break-all;

    .blod {
      font-weight: 700;
      color: var(--el-color-primary);
      font-style: italic;
    }

    code {
      @include themeColor(#909399, #909399);
      background-color: var(--bl-preview-code-bg-color);
      border-radius: var(--bl-preview-border-radius);
      padding: 0px 4px;
      border-radius: 3px;
      margin: 0 5px;
      user-select: text;
    }

    a {
      color: var(--el-color-primary);
    }
  }

  .tab-tip {
    font-size: 13px;
    font-style: italic;
    border: none;
    margin: 30px 0 0 0;
    padding: 10px;
    color: var(--bl-text-color);
    border: 2px dashed var(--el-border-color);
    border-radius: 4px;
    background-color: var(--bl-bg-color);
  }
}

.theme-color-picker {
  z-index: 3001 !important;
  margin: 0 10px 10px 0;
}

.folder-type-list {
  @include flex(row, flex-start, center);
  .item {
    margin-right: 3px;
    padding: 2px 5px;
    &:hover {
      border-radius: 3px;
      background-color: var(--el-color-primary-light-6);
      cursor: pointer;
    }
  }
}

.el-divider__text {
  background: var(--bl-dialog-bg-color);
  @include flex(row, center, center);
  .iconbl {
    font-size: 20px;
    margin-right: 5px;
  }
}
</style>
