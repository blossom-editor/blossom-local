<template>
  <!-- 底部栏入口 -->
  <el-popover
    v-model:visible="popoverVisible"
    placement="top"
    trigger="click"
    transition="none"
    :width="325"
    :show-arrow="false"
    :hide-after="0"
    :show-after="0"
    popper-class="web-collect-popover"
    @show="loadConfig()">
    <template #reference>
      <div class="web-collect">
        <div class="iconbl bl-adhibition-line"></div>
      </div>
    </template>

    <template #default>
      <div :class="['web-collect-panel', isSmall ? 'size-small' : 'size-large']">
        <!-- 头部: 标题 + 大小切换 + 设置 -->
        <div class="panel-header">
          <span class="panel-title">快捷收藏</span>
          <div class="panel-actions">
            <el-tooltip
              :content="isSmall ? '使用大图标' : '使用小图标'"
              popper-class="is-small"
              effect="light"
              placement="top"
              transition="none"
              :hide-after="0"
              :show-arrow="false"
              :offset="10">
              <span :class="['iconbl', 'panel-action', isSmall ? 'bl-apps-line' : 'bl-a-listview-line']" @click="toggleSize"></span>
            </el-tooltip>
            <el-tooltip
              content="设置"
              placement="top"
              popper-class="is-small"
              effect="light"
              transition="none"
              :hide-after="0"
              :show-arrow="false"
              :offset="10">
              <span class="iconbl panel-action bl-a-folderset-line" @click="openSetting"></span>
            </el-tooltip>
          </div>
        </div>

        <div v-if="loading && groups.length === 0" class="panel-state">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>读取中...</span>
        </div>

        <div v-else-if="panelGroups.length === 0" class="panel-state panel-empty">
          <span class="iconbl bl-adhibition-line empty-icon"></span>
          <span>还没有收藏的网页</span>
          <el-button type="primary" size="small" @click="openSetting">去配置</el-button>
        </div>

        <!-- 分组列表: 顺序与 JSON 保持一致 -->
        <div v-else class="panel-body">
          <div v-for="group in panelGroups" :key="group.key" class="web-group">
            <div class="group-name">
              <span>{{ group.name }}</span>
              <span class="group-count">{{ group.webs.length }}</span>
            </div>
            <div class="group-grid">
              <el-tooltip
                v-for="web in group.webs"
                :key="web.name"
                placement="top"
                effect="light"
                popper-class="web-collect-tip"
                :show-after="400"
                :hide-after="0">
                <template #content>
                  <div class="web-tip">
                    <div class="web-tip-name">
                      {{ web.name }}
                      <span v-if="web.type === 'app'" class="web-tip-tag">应用</span>
                      <span v-else-if="web.type === 'path'" class="web-tip-tag">路径/文件</span>
                    </div>
                    <div class="web-tip-url">{{ web.url }}</div>
                  </div>
                </template>
                <div class="web-item" role="button" tabindex="0" :aria-label="web.name" @click="openItem(web)" @keydown.enter.prevent="openItem(web)">
                  <!-- 图标是 .blossom/web-collect 目录下的图片, 缺失时回退到首字母 -->
                  <img
                    v-if="iconUrl(web.icon)"
                    class="web-icon"
                    :src="iconUrl(web.icon)"
                    :alt="web.name"
                    draggable="false"
                    @error="onIconError(web.icon)" />
                  <span v-else class="web-fallback">{{ web.name.slice(0, 1).toUpperCase() }}</span>
                </div>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </template>
  </el-popover>

  <!-- 网页收藏设置 -->
  <el-dialog v-model="settingVisible" class="dialog-web-collect" title="快捷收藏设置" width="720px" append-to-body :close-on-click-modal="false">
    <div class="setting-toolbar">
      <div class="file-path">
        <el-icon><Document /></el-icon>
        <span class="path-text" :title="filePath">{{ filePath || '配置文件路径读取中...' }}</span>
      </div>
      <div class="toolbar-actions">
        <el-button size="small" text :icon="FolderOpened" @click="openFolder">打开目录</el-button>
        <el-button size="small" text :icon="RefreshLeft" @click="loadConfig()">重新读取</el-button>
        <el-button size="small" text :icon="MagicStick" :disabled="!!editorError" @click="formatJson">格式化</el-button>
      </div>
    </div>

    <el-input
      v-model="jsonText"
      class="json-editor"
      type="textarea"
      :rows="18"
      resize="vertical"
      spellcheck="false"
      placeholder="在此填写网页收藏的 JSON 配置" />

    <div v-if="editorError" class="json-error">
      <el-icon><WarningFilled /></el-icon>
      <span>{{ editorError }}</span>
    </div>
    <div v-else class="json-hint">共 {{ editorGroups.length }} 个分组 / {{ editorCount }} 个网页; icon 填本目录下的图片文件名.</div>
    <div class="json-hint json-hint-sub">type 填 app 时 url 写本地应用路径, 点击图标用系统默认方式打开</div>
    <template #footer>
      <el-button @click="settingVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!!editorError" @click="saveSetting">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { Document, FolderOpened, Loading, MagicStick, RefreshLeft, WarningFilled } from '@element-plus/icons-vue'
import { webCollectOpenAppApi, webCollectOpenFolderApi, webCollectReadApi, webCollectSaveApi } from '@renderer/api/webCollect'
import { Local } from '@renderer/assets/utils/storage'
import { isBlank } from '@renderer/assets/utils/obj'
import { isElectron, toView } from '@renderer/assets/utils/util'
import Notify from '@renderer/scripts/notify'
import { openFileLocation } from '@renderer/api/docLib'

/**
 * 网页收藏
 *
 * 配置保存在 <docLibPath>/.blossom/web-collect/web-collect.json, 由用户直接编辑 JSON,
 * 分组与网页的展示顺序完全遵循 JSON 中的书写顺序;
 * 图标图片也放在同目录下, JSON 的 icon 只填写文件名
 *
 * 对外接口:
 * - props: iconSize —— 'large' | 'small', 为空时使用本地记录的大小
 * - emits: update:iconSize —— 在弹层中切换了图标大小
 * - expose: groups / reload / openSetting
 */

const props = defineProps({
  /** 图标大小: large 每行 5 个, small 每行 8 个 */
  iconSize: { type: String, default: '' }
})

const emits = defineEmits(['update:iconSize'])

// ==================== 常量 ====================

/** localStorage: 图标大小的用户偏好 */
const SIZE_KEY = 'webCollectIconSize'

/** JSON 配置结构: 分组标识 -> 分组信息 */
interface RawWeb {
  url?: unknown
  icon?: unknown
  type?: unknown
}

interface RawGroup {
  groupName?: unknown
  webs?: Record<string, RawWeb>
}

/** 条目类型: web 是网址, app 是本地应用 */
type WebCollectType = 'web' | 'app' | 'path'

/** 渲染用的网页信息 */
interface WebCollectWeb {
  name: string
  /** 网址, 或应用的可执行文件路径 */
  url: string
  /** 图标图片的文件名, 文件位于 .blossom/web-collect 目录下 */
  icon: string
  type: WebCollectType
}

/** 渲染用的分组信息 */
interface WebCollectGroup {
  key: string
  name: string
  webs: WebCollectWeb[]
}

/** 首次配置时填入编辑器的示例内容 */
const DEFAULT_CONFIG = {
  daily: {
    groupName: '日常',
    webs: {
      DeepSeek: { url: 'https://chat.deepseek.com', icon: 'deepseek.svg' },
      GitHub: { url: 'https://github.com', icon: 'github.svg' }
    }
  },
  localApp: {
    groupName: '本地应用',
    webs: {
      Godot: {
        url: 'F:\\Software\\Godot\\Godot.exe',
        icon: 'godot.png',
        type: 'app'
      }
    }
  }
}

// ==================== 响应式数据 ====================

/** 本地记录的图标大小 */
const localSize = ref<'large' | 'small'>(Local.get(SIZE_KEY) === 'small' ? 'small' : 'large')

const groups = ref<WebCollectGroup[]>([])
const loading = ref<boolean>(true)
const popoverVisible = ref<boolean>(false)
const settingVisible = ref<boolean>(false)
const saving = ref<boolean>(false)

/** 配置文件中的原始内容, 用于打开弹窗时回填编辑器 */
const rawContent = ref<string>('')
const filePath = ref<string>('')
/** 配置文件所在目录, 图标图片也放在这里, 用于拼接图片地址 */
const folderPath = ref<string>('')
/** 目录下可用的图标文件名 */
const iconFiles = ref<string[]>([])
/** 加载失败的图标文件名, 避免反复加载残缺文件 */
const brokenIcons = ref<string[]>([])
/** 图标地址的缓存标记, 每次重新读取配置时更新, 避免替换同名图片后仍显示旧图 */
const iconToken = ref<number>(Date.now())

const jsonText = ref<string>('')

// ==================== 计算属性 ====================

/** 当前生效的图标大小, 父级传入优先 */
const size = computed<'large' | 'small'>(() => {
  if (props.iconSize === 'large' || props.iconSize === 'small') return props.iconSize
  return localSize.value
})

const isSmall = computed<boolean>(() => size.value === 'small')

/** 弹层中展示的分组, 空分组不占位置 */
const panelGroups = computed<WebCollectGroup[]>(() => groups.value.filter((group) => group.webs.length > 0))

/** 编辑器中的内容解析结果, 用于实时校验 */
const editorPreview = computed(() => parseConfig(jsonText.value))

const editorError = computed<string>(() => editorPreview.value.error)

const editorGroups = computed<WebCollectGroup[]>(() => editorPreview.value.groups)

const editorCount = computed<number>(() => editorPreview.value.count)

// ==================== 解析 ====================

/**
 * 将 JSON 内容解析为渲染用的分组结构
 * 使用 Object.entries 保证浏览器对字符串键的插入顺序, 因此不额外排序
 */
const parseConfig = (content: string): { groups: WebCollectGroup[]; error: string; count: number } => {
  const text = content.trim()
  if (text === '') return { groups: [], error: '', count: 0 }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (err) {
    return { groups: [], error: `JSON 格式错误: ${(err as Error).message}`, count: 0 }
  }

  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return { groups: [], error: '最外层需要是一个对象, 键为分组的标识', count: 0 }
  }

  const groups: WebCollectGroup[] = []
  let count = 0

  Object.entries(json as Record<string, RawGroup>).forEach(([key, raw]) => {
    if (raw === null || typeof raw !== 'object') return

    const webs: WebCollectWeb[] = []
    const rawWebs = raw.webs
    if (rawWebs !== null && typeof rawWebs === 'object') {
      Object.entries(rawWebs).forEach(([name, web]) => {
        if (web === null || typeof web !== 'object') return
        webs.push({
          name,
          url: typeof web.url === 'string' ? web.url.trim() : '',
          // icon 只是 .blossom/web-collect 目录下的文件名
          icon: typeof web.icon === 'string' ? web.icon.trim() : '',
          // type 为 app 时 url 是本地应用的路径
          type: web.type === 'app' ? 'app' : web.type === 'path' ? 'path' : 'web'
        })
      })
    }

    count += webs.length
    groups.push({
      key,
      name: typeof raw.groupName === 'string' && raw.groupName.trim() !== '' ? raw.groupName.trim() : key,
      webs
    })
  })

  return { groups, error: '', count }
}

/**
 * 拼接图标的本地访问地址
 * 图标文件放在 .blossom/web-collect 目录下, 通过 blossom 自定义协议读取
 * 文件不存在或加载失败时返回空串, 由模板回退到首字母占位
 */
const iconUrl = (name: string): string => {
  if (isBlank(name) || isBlank(folderPath.value)) return ''
  if (!iconFiles.value.includes(name) || brokenIcons.value.includes(name)) return ''
  const separator = folderPath.value.includes('\\') ? '\\' : '/'
  //@ts-ignore: constants 由 preload 注入, 未声明在 ElectronAPI 类型中
  return window.electronAPI.constants.BLOSSOM_PROTOCOL + folderPath.value + separator + name + '?t=' + iconToken.value
}

/**
 * 图标加载失败时记录下来, 下次直接走占位
 */
const onIconError = (name: string): void => {
  if (!brokenIcons.value.includes(name)) brokenIcons.value = [...brokenIcons.value, name]
}

// ==================== 数据 ====================

/**
 * 读取配置文件
 */
const loadConfig = async (): Promise<void> => {
  loading.value = true
  try {
    const r = await webCollectReadApi()
    filePath.value = r.data?.filePath ?? ''
    folderPath.value = r.data?.folderPath ?? ''
    iconFiles.value = r.data?.icons ?? []
    brokenIcons.value = []
    iconToken.value = Date.now()
    rawContent.value = r.data?.content ?? ''
    groups.value = parseConfig(rawContent.value).groups
  } catch (err) {
    console.error('读取网页收藏配置失败', err)
  } finally {
    loading.value = false
  }
}

/**
 * 用默认浏览器打开网址
 */
const openUrl = (url: string): void => {
  if (isBlank(url)) {
    Notify.warning('该网页还没有配置地址', '无法打开')
    return
  }
  const target = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url) ? url : `https://${url}`
  if (isElectron()) {
    //@ts-ignore: openExtenal 由 preload 注入, 未声明在 ElectronAPI 类型中
    window.electronAPI.openExtenal(target)
    return
  }
  toView(target)
}

/**
 * 打开本地应用: 交给系统外壳, 单实例应用会自己跳到前台
 */
const openApp = async (appPath: string): Promise<void> => {
  if (isBlank(appPath)) {
    Notify.warning('该应用还没有配置路径', '无法打开')
    return
  }
  try {
    webCollectOpenAppApi(appPath)
  } catch (err) {
    // 失败提示已由 invoke 拦截器弹出
    console.error('打开本地应用失败', err)
  }
}

/**
 * 打开条目: 按 type 区分网址与应用
 */
const openItem = (web: WebCollectWeb): void => {
  if (web.type === 'app') {
    openApp(web.url)
    return
  } else if (web.type === 'path') {
    openFileLocation(web.url)
  } else {
    openUrl(web.url)
  }
}

/**
 * 切换图标大小
 */
const toggleSize = (): void => {
  const next: 'large' | 'small' = isSmall.value ? 'large' : 'small'
  localSize.value = next
  Local.set(SIZE_KEY, next)
  emits('update:iconSize', next)
}

// ==================== 设置 ====================

/**
 * 打开设置弹窗
 */
const openSetting = (): void => {
  popoverVisible.value = false
  jsonText.value = isBlank(rawContent.value) ? JSON.stringify(DEFAULT_CONFIG, null, 2) : rawContent.value
  settingVisible.value = true
}

/**
 * 格式化编辑器中的 JSON
 */
const formatJson = (): void => {
  if (!isBlank(editorError.value)) return
  if (isBlank(jsonText.value)) return
  jsonText.value = JSON.stringify(JSON.parse(jsonText.value), null, 2)
}

/**
 * 在文件管理器中打开配置目录
 */
const openFolder = async (): Promise<void> => {
  try {
    await webCollectOpenFolderApi()
  } catch (err) {
    console.error('打开配置目录失败', err)
  }
}

/**
 * 保存配置
 */
const saveSetting = async (): Promise<void> => {
  if (!isBlank(editorError.value)) return
  saving.value = true
  try {
    const r = await webCollectSaveApi(jsonText.value)
    rawContent.value = r.data?.content ?? jsonText.value
    filePath.value = r.data?.filePath ?? filePath.value
    folderPath.value = r.data?.folderPath ?? folderPath.value
    iconFiles.value = r.data?.icons ?? iconFiles.value
    brokenIcons.value = []
    iconToken.value = Date.now()
    groups.value = parseConfig(rawContent.value).groups
    settingVisible.value = false
    Notify.success('', '网页收藏已保存')
  } catch (err) {
    console.error('保存网页收藏配置失败', err)
  } finally {
    saving.value = false
  }
}

// ==================== 快捷键 ====================

/**
 * Alt + 2: 打开 / 关闭快捷收藏弹层
 *
 * 和 ArticleIndex 里的 Alt+1 保持一致, 挂在 document 的捕获阶段:
 * 编辑器与代码块都是 contenteditable, 普通监听会被输入框逻辑吞掉。
 * 设置弹窗打开时不响应, 避免和弹窗内的按键冲突。
 */
const onGlobalKeydown = (event: KeyboardEvent): void => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
  if (event.key !== '2' && event.code !== 'Digit2') return
  if (settingVisible.value) return
  event.preventDefault()
  popoverVisible.value = !popoverVisible.value
}

/**
 * 快捷键绑定（幂等）
 *
 * 本页被 keep-alive 缓存, 只靠 onMounted / onBeforeUnmount 会在切到别的页面后
 * 仍然响应 Alt+2 (组件没有卸载), 所以 onActivated 再绑一次、onDeactivated 解绑。
 */
let keysBound = false
const bindKeys = (): void => {
  if (keysBound) return
  document.addEventListener('keydown', onGlobalKeydown, true)
  keysBound = true
}
const unbindKeys = (): void => {
  if (!keysBound) return
  document.removeEventListener('keydown', onGlobalKeydown, true)
  keysBound = false
}

// ==================== 生命周期 ====================

onMounted(() => {
  // 把本地记录的图标大小同步给父级, 便于外部读取
  emits('update:iconSize', size.value)
  loadConfig()
  // onActivated 与 onMounted 的先后顺序不固定, 两边都调, bindKeys 内部保证幂等
  bindKeys()
})

onActivated(bindKeys)

onDeactivated(() => {
  // 页面被切走时收起弹层, 免得回来时还挂着
  popoverVisible.value = false
  unbindKeys()
})

onBeforeUnmount(unbindKeys)

// ==================== 对外暴露 ====================

defineExpose({
  /** 已解析的分组列表 */
  groups,
  /** 重新读取配置文件 */
  reload: loadConfig,
  /** 打开设置弹窗 */
  openSetting
})
</script>

<style scoped lang="scss">
.web-collect {
  @include flex(row, center, center);
  @include box(28px, 28px);
  @include themeColor(#bebebe, #8c8c8c);
  transition: color 1s;
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }

  .iconbl {
    font-size: 21px;
  }
}
</style>

<style lang="scss">
// popover 与 dialog 的内容会被挂载到 body 上, 无法使用 scoped, 因此统一写在这里
.web-collect-popover {
  padding: 12px;
  margin-left: 10px;

  .web-collect-panel {
    width: 300px !important;
  }

  .panel-header {
    @include flex(row, space-between, center);
    padding-bottom: 8px;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .panel-actions {
      @include flex(row, flex-end, center);
      gap: 2px;
    }

    .panel-action {
      @include flex(row, center, center);
      width: 24px;
      height: 24px;
      font-size: 14px;
      border-radius: 6px;
      color: var(--el-text-color-secondary);
      cursor: pointer;
      transition:
        color 0.16s ease,
        background-color 0.16s ease;

      &:hover {
        color: var(--el-color-primary);
        background-color: var(--el-fill-color);
      }
    }
  }

  .panel-state {
    @include flex(column, center, center);
    gap: 8px;
    min-height: 120px;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    .empty-icon {
      font-size: 30px;
      opacity: 0.4;
    }

    .empty-text {
      margin-bottom: 2px;
    }
  }

  .panel-body {
    max-height: 52vh;
    overflow-y: auto;
    padding-right: 2px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background-color: var(--el-border-color);
    }

    &::-webkit-scrollbar-track {
      background-color: transparent;
    }
  }

  .web-group + .web-group {
    margin-top: 14px;
  }

  .group-name {
    @include flex(row, flex-start, center);
    position: sticky;
    top: 0;
    z-index: 1;
    gap: 6px;
    font-size: 14px;
    color: var(--el-text-color-secondary);

    .group-count {
      font-size: 13px;
      font-weight: 100;
    }
  }

  .group-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    padding: 10px;
  }

  .web-item {
    @include flex(row, center, center);
    position: relative;
    aspect-ratio: 1 / 1;
    filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.5));
    cursor: pointer;
    user-select: none;
    transition:
      filter 0.16s ease,
      border-color 0.16s ease,
      background-color 0.16s ease;

    img {
      border-radius: 6px;
    }

    &:hover {
      filter: drop-shadow(0 0 5px var(--el-color-primary));
    }

    &:active {
      transform: translateY(0) scale(0.94);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: 2px;
    }

    .web-icon {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .web-fallback {
      font-size: 15px;
      font-weight: 600;
      color: var(--el-text-color-regular);
    }
  }

  // 小图标模式: 每行 8 个
  .size-small {
    .group-grid {
      gap: 6px;
      grid-template-columns: repeat(8, minmax(0, 1fr));
    }

    .web-item {
      img {
        border-radius: 4px;
      }
      .web-icon {
        width: 100%;
        height: 100%;
      }

      .web-fallback {
        font-size: 12px;
      }
    }
  }
}

// tooltip 同样会被挂载到 body 上, 单独用 popper-class 挂样式
.web-collect-tip {
  .web-tip {
    max-width: 240px;

    .web-tip-name {
      @include flex(row, flex-start, center);
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
    }

    .web-tip-tag {
      padding: 0 4px;
      font-size: 10px;
      font-weight: 400;
      line-height: 15px;
      border-radius: 3px;
      color: var(--el-color-primary);
      background-color: var(--el-color-primary-light-9);
    }

    .web-tip-url {
      margin-top: 2px;
      font-size: 11px;
      word-break: break-all;
      opacity: 0.7;
    }
  }
}

.dialog-web-collect {
  --el-dialog-margin-top: 10vh;
  --header-height: 35px;
  --footer-height: 50px;
  // 内部各部分高度
  --setting-toolbar-height: 25px;
  --json-hint-height: 35px;
  --json-hint-sub-height: 25px;

  height: 80%;

  .el-dialog__header {
    height: var(--header-height);
    padding: 5px 20px;
    margin: 0;
    border-bottom: 1px solid var(--el-border-color);
  }

  .el-dialog__body {
    height: calc(100% - var(--header-height) - var(--footer-height));
    padding: 16px 20px 0 20px;
  }

  .el-dialog__footer {
    height: var(--footer-height);
    padding: 12px 20px 16px 20px;
  }

  .setting-toolbar {
    @include flex(row, space-between, center);
    height: var(--setting-toolbar-height);
    gap: 5px;
    margin-bottom: 10px;
  }

  .file-path {
    @include flex(row, flex-start, center);
    gap: 3px;
    min-width: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    .path-text {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-family: 'JetBrains Mono', 'Consolas', 'Menlo', monospace;
    }
  }

  .toolbar-actions {
    @include flex(row, flex-end, center);
    flex-shrink: 0;
  }

  .json-editor {
    height: calc(100% - var(--json-hint-height) - var(--json-hint-sub-height));
    textarea {
      font-family: 'JetBrains Mono', 'Consolas', 'Menlo', monospace;
      font-size: 12.5px;
      line-height: 1.4;
      tab-size: 2;
      height: 100%;
    }
  }

  .json-error {
    @include flex(row, flex-start, flex-start);
    height: var(--json-hint-height);
    gap: 6px;
    margin-top: 8px;
    font-size: 12px;
    line-height: 17px;
    word-break: break-all;
    color: var(--el-color-danger);
  }

  .json-hint {
    height: var(--json-hint-height);
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .json-hint-sub {
    width: 70%;
    height: var(--json-hint-sub-height);
    margin-top: 0;
    opacity: 0.75;
  }
}
</style>
