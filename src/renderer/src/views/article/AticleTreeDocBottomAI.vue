<template>
  <!-- 底部栏入口: 展示当前选中的模型及其余额 -->
  <el-popover
    v-model:visible="popoverVisible"
    placement="top-start"
    trigger="click"
    :show-arrow="false"
    :hide-after="0"
    popper-class="ai-model-popover"
    @show="refreshBalances()">
    <template #reference>
      <div class="ai-container">
        <div class="icon">
          <svg
            t="1794767080722"
            class="icon"
            viewBox="0 0 1391 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            p-id="3178"
            width="256"
            height="256">
            <path
              d="M1290.48631826 134.26404549c-12.13759084-6.07017626-17.37788176 5.499889-24.46849939 11.37950922-2.41647143 1.89727529-4.47944763 4.363457-6.54242381 6.63908268-17.73551954 19.34557993-38.45641692 32.05483886-65.55679893 30.53729479-39.59422976-2.27562567-73.40411731 10.43225242-103.27860851 41.34927845-6.35324862-38.12501514-27.45525808-60.8854144-59.58051983-75.49056778-16.83383047-7.58633948-33.80988755-15.17405981-45.59398314-31.67648848-8.20219449-11.75924044-10.43225242-24.84684976-14.55682396-37.74390306-2.60840831-7.77689552-5.21681664-15.74296623-13.98791754-17.07133511-9.55541849-1.51754407-13.27816535 6.63908267-17.02438651 13.46734055-14.93655518 27.8819379-20.74575252 58.60978874-20.15337181 89.71598996 1.28142029 69.99067879 30.25422243 125.75455459 87.77314691 165.39711379 6.54380466 4.55125134 8.22704962 9.10388355 6.16407344 15.74158537-3.91192206 13.65651573-8.60678085 26.93468109-12.70787809 40.59119684-2.60978915 8.72553316-6.52033037 10.62142761-15.69601764 6.82825787-31.55773616-13.46734055-58.82381906-33.38320773-82.93606151-57.47059505-40.8977435-40.40202164-77.88494578-84.97556341-123.99950592-119.87493438a545.31613447 545.31613447 0 0 0-32.8847242-22.95095532c-47.06319777-46.65999226 6.16407344-84.97418257 18.49360113-89.52681476 12.87357899-4.74180739 4.48082847-21.05368003-37.17637745-20.86450484s-79.75874677 14.41597819-128.31601433 33.38320774c-7.11133024 2.84453209-14.58167909 4.93098258-22.21496716 6.63908268-44.09991337-8.53635796-89.85821657-10.43225242-137.68087677-4.93236342-90.02391745 10.24307723-161.93534583 53.67880615-214.80636013 127.84100508-63.49382273 89.14708354-78.45523305 190.43451958-60.1273328 296.08265094 19.20473417 111.33995725 74.89680624 203.52212891 160.44127608 275.59787737 88.72040372 74.73110533 190.88467371 111.33995725 307.44006671 104.32252418 70.79570899-4.1742818 149.60581813-13.84707177 238.51539705-90.66600845 22.42899749 11.38089007 45.97233351 15.93352226 84.9990377 19.34696077 30.08714069 2.84453209 59.03646854-1.51754407 81.44199176-6.25935143 35.11340129-7.58633948 32.67069387-40.78037202 19.98629006-46.84916745-102.92235159-48.93699877-80.32765321-29.02113157-100.85937539-45.14244819 52.30210785-63.16242093 131.11221699-128.79102356 161.93534585-341.41565519 2.44132657-16.88077906 0.37835039-27.50220667 0-41.15872241-0.19055603-8.34580193 1.65838982-11.5714461 11.02463314-12.5187029 25.77201312-3.03508812 50.80941892-10.24307723 73.78384852-23.14013051 66.66975662-37.17637748 93.57958258-98.25234793 99.93421204-171.46729004 0.94863764-11.19033403-0.18917518-22.76039929-11.78409557-28.64001951M709.3939789 793.19438204c-99.72156256-80.0432-148.11312921-106.40759381-168.09941928-105.26978098-18.68277634 1.13781284-15.31628641 22.95095533-11.21518917 37.17637747 4.29165328 14.03624697 9.91029458 23.70903694 17.75761301 36.03856465 5.40737266 8.15662674 9.15359382 20.29559842-5.42808529 29.39948196-32.12664259 20.29559842-87.96232211-6.82825787-90.56934959-8.15524591-65.01136678-39.07365277-119.37783167-90.66600844-157.66854771-161.22421282-36.98582145-67.90422832-58.442707-140.73943922-61.99975296-218.50563266-0.94863764-18.77805435 4.48082847-25.41713702 22.76178014-28.8319564a220.49680515 220.49680515 0 0 1 73.0478604-1.89589444c101.80939388 15.17544065 188.49029571 61.64487685 261.13495055 135.23955021 41.46803076 41.91680402 72.8352109 91.99161563 105.17450296 140.9286144 34.35531967 51.96932523 71.34252197 101.4752304 118.40571975 142.06504638 16.61980014 14.22542217 29.87311037 25.03740581 42.58098844 33.00347652-38.29071602 4.363457-102.18636342 5.3107138-145.88307125-29.96838838m47.82127938-313.91206766c0-8.34580193 6.5451855-14.98488462 14.77085427-14.98488462q2.79758351 0.04832942 5.02626061 0.94863765a14.8661323 14.8661323 0 0 1 9.53194421 14.03624697 14.79432858 14.79432858 0 0 1-14.74737999 14.98488461 14.62862768 14.62862768 0 0 1-14.5816791-14.98488461m148.49286043 77.76619346c-9.50846991 3.98372577-19.03903327 7.39854512-28.21472053 7.77689552-14.17847357 0.75946245-29.68393518-5.12015777-38.07668571-12.32814687-13.08760932-11.19171487-22.43037833-17.45106631-26.34230037-36.98720228-1.68324496-8.34580193-0.75946245-21.24285522 0.73598816-28.64001951 3.36648992-15.93352226-0.37973123-26.17521863-11.38089007-35.46965822-8.96165695-7.58772033-20.36740213-9.67417081-32.8847242-9.67417081-4.6713845 0-8.96165695-2.08506965-12.13897168-3.79316974a12.44689918 12.44689918 0 0 1-5.40599181-17.44968548c1.30351374-2.65535691 7.6581432-9.10526439 9.15221296-10.24307722 16.99815054-9.86334601 36.60609022-6.63770183 54.71996013 0.75946245 16.81035618 7.01743307 29.49475998 19.91586719 47.82266024 38.12501511 18.68277634 22.00231767 22.04926625 28.07249393 32.67069386 44.57354179 8.41760565 12.8970533 16.07574886 26.17521863 21.29256549 41.34789759 3.19940818 9.48499561-0.92516335 17.26051028-11.94979647 22.00231767"
              fill="#4D6BFE"
              p-id="3179"></path>
          </svg>
        </div>
        <div>{{ activeLabel }}</div>
        <div class="balance">{{ activeBalance }}</div>
      </div>
    </template>
    <template #default>
      <!-- 显示全部已配置的模型 -->
      <div class="tree-doc-bottom-model-title">
        监控列表
        <div class="operator">
          <el-tooltip content="刷新余额" placement="top" :show-after="600" :hide-after="0">
            <span class="iconbl bl-refresh-smile" @click="refreshBalances(true)"></span>
          </el-tooltip>
          <el-button type="primary" text size="small" @click="openSetting">设置</el-button>
        </div>
      </div>

      <div v-if="configuredModels.length === 0" class="ai-model-empty">
        <span>尚未配置 AI 模型的 Key</span>
        <el-button type="primary" text size="small" @click="openSetting">去配置</el-button>
      </div>
      <div v-else class="ai-model-list">
        <div
          v-for="model in configuredModels"
          :key="model.name"
          :class="['ai-model-item', model.name === activeProvider?.name ? 'active' : '']"
          @click="selectModel(model)">
          <span class="ai-model-dot" :style="{ backgroundColor: model.color }"></span>
          <span class="ai-model-label">{{ model.label }}</span>
          <el-tooltip placement="left" effect="light" :show-after="400" :disabled="isBlank(model.error)">
            <template #content>
              <span>{{ model.error }}</span>
            </template>
            <span :class="['ai-model-value', isBlank(model.error) ? '' : 'error']">{{ model.text }}</span>
          </el-tooltip>
        </div>
      </div>
    </template>
  </el-popover>

  <!-- AI 模型监控设置 -->
  <el-dialog
    v-model="settingVisible"
    class="dialog-ai-model-setting"
    title="AI 模型监控设置"
    width="520px"
    append-to-body
    :close-on-click-modal="false">
    <el-tabs v-model="activeTab">
      <el-tab-pane v-for="provider in AI_PROVIDERS" :key="provider.name" :label="provider.label" :name="provider.name">
        <div class="ai-setting-form">
          <div class="ai-setting-row">
            <div class="ai-setting-label">API Key</div>
            <el-input v-model="form[provider.name]" type="password" show-password clearable placeholder="请输入 API Key" />
          </div>
          <div class="ai-setting-tip">
            <span>Key 仅保存在本地 localStorage 中, 不会上传到任何服务</span>
            <el-link type="primary" :underline="false" @click="toView(provider.consoleUrl)">获取 Key</el-link>
          </div>
          <div v-if="!isBlank(aiConfig[provider.name])" class="ai-setting-saved">当前已保存: {{ maskKey(aiConfig[provider.name]) }}</div>
          <div class="ai-setting-status">
            <span class="status-label">余额状态:</span>
            <span v-if="balanceMap[provider.name].loading" class="status-value">查询中...</span>
            <span v-else-if="!isBlank(balanceMap[provider.name].error)" class="status-value error">查询失败</span>
            <span v-else-if="isBlank(balanceMap[provider.name].total)" class="status-value">未查询</span>
            <span v-else class="status-value">
              {{ currencySymbol(balanceMap[provider.name].currency) }}{{ balanceMap[provider.name].total }}
              <span class="status-time">{{ balanceMap[provider.name].updateTime }}</span>
            </span>
            <el-button text type="primary" size="small" :loading="balanceMap[provider.name].loading" @click="testBalance(provider)">
              查询余额
            </el-button>
          </div>
          <div v-if="!isBlank(balanceMap[provider.name].error)" class="ai-setting-error">
            {{ balanceMap[provider.name].error }}
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <div style="padding: 12px 24px">
        <el-button @click="settingVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveSetting">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Request } from '@renderer/assets/utils/http'
import { Local } from '@renderer/assets/utils/storage'
import { isBlank } from '@renderer/assets/utils/obj'
import { getTime, toView } from '@renderer/assets/utils/util'
import Notify from '@renderer/scripts/notify'

/**
 * AI 模型余额监控组件
 *
 * 对外接口:
 * - props: activeName —— 底部栏展示哪个已配置模型, 为空时取第一个
 * - emits: update:activeName —— 在弹层中切换了要展示的模型
 * - expose: models / activeModel / openSetting / refresh —— 供外部读取状态或触发动作
 */

const props = defineProps({
  /** 底部栏展示的模型 name, 为空时展示第一个已配置的模型 */
  activeName: { type: String, default: '' }
})

const emits = defineEmits(['update:activeName'])

// ==================== 常量 ====================

/** localStorage: 各类 AI 模型的 Key, 结构为 { [provider.name]: key } */
const AI_CONFIG_KEY = 'aiModelConfig'
/** localStorage: 上次查询到的余额, 用于首屏直接展示, 不必等接口返回 */
const AI_BALANCE_CACHE_KEY = 'aiModelBalanceCache'
/** 两次查询之间的最小间隔, 避免频繁请求三方接口 */
const QUERY_INTERVAL = 1000 * 30

/** 一个 AI 模型的接入信息, 新增模型时在 AI_PROVIDERS 中追加一项即可 */
interface AiProvider {
  /** 唯一标识, 同时作为 localStorage 中的字段名 */
  name: string
  /** 展示名称 */
  label: string
  /** 品牌色, 用于列表前的小圆点 */
  color: string
  /** 余额查询接口 */
  balanceApi: string
  /** Key 的申请地址 */
  consoleUrl: string
}

const AI_PROVIDERS: AiProvider[] = [
  {
    name: 'deepseek',
    label: 'DeepSeek',
    color: '#4D6BFE',
    balanceApi: 'https://api.deepseek.com/user/balance',
    consoleUrl: 'https://platform.deepseek.com/api_keys'
  }
]

/** DeepSeek 余额接口返回的单条余额信息 */
interface DeepSeekBalanceInfo {
  currency: string
  total_balance: string
  granted_balance: string
  topped_up_balance: string
}

/** 单个模型的余额状态 */
interface AiBalance {
  /** 是否正在查询 */
  loading: boolean
  /** 查询失败的原因, 为空表示正常 */
  error: string
  currency: string
  /** 总余额 */
  total: string
  /** 赠送余额 */
  granted: string
  /** 充值余额 */
  toppedUp: string
  /** 余额是否足够调用接口 */
  available: boolean
  /** 上次查询成功的时间 */
  updateTime: string
}

/** 列表展示用的模型信息 */
interface AiModelView extends AiProvider {
  balance: AiBalance
  /** 格式化后的余额文案 */
  text: string
  error: string
}

const createBalance = (): AiBalance => {
  return { loading: false, error: '', currency: 'CNY', total: '', granted: '', toppedUp: '', available: true, updateTime: '' }
}

// ==================== 响应式数据 ====================

/** 查询余额用的请求实例, 三方接口超时时间比默认值短一些 */
const request = new Request({ timeout: 15000 })

/** 已保存的 key 配置 */
const aiConfig = ref<Record<string, string>>({})
/** 各模型的余额状态, 键为 provider.name */
const balanceMap = reactive<Record<string, AiBalance>>({})
AI_PROVIDERS.forEach((provider) => (balanceMap[provider.name] = createBalance()))

/** 弹窗中的输入内容, 与已保存的配置分离, 取消时不生效 */
const form = reactive<Record<string, string>>({})
AI_PROVIDERS.forEach((provider) => (form[provider.name] = ''))

const popoverVisible = ref<boolean>(false)
const settingVisible = ref<boolean>(false)
const activeTab = ref<string>(AI_PROVIDERS[0].name)
const saving = ref<boolean>(false)

/** 上次发起查询的时间戳 */
let lastQueryAt = 0

// ==================== 计算属性 ====================

/** 已填写 Key 的模型 */
const configuredProviders = computed<AiProvider[]>(() => AI_PROVIDERS.filter((provider) => !isBlank(aiConfig.value[provider.name])))

/** 底部栏展示的模型: 优先用父级指定的, 否则取第一个已配置的 */
const activeProvider = computed<AiProvider | undefined>(() => {
  const providers = configuredProviders.value
  if (providers.length === 0) return undefined
  return providers.find((provider) => provider.name === props.activeName) ?? providers[0]
})

/** 弹层与对外暴露用的模型列表 */
const configuredModels = computed<AiModelView[]>(() =>
  configuredProviders.value.map((provider) => {
    const balance = balanceMap[provider.name]
    return { ...provider, balance, text: balanceTextOf(provider.name), error: balance.error }
  })
)

const activeLabel = computed<string>(() => (activeProvider.value ? `${activeProvider.value.label}：` : 'AI 余额：'))

const activeBalance = computed<string>(() => (activeProvider.value ? balanceTextOf(activeProvider.value.name) : '未配置'))

// ==================== 方法 ====================

/**
 * 货币符号
 */
const currencySymbol = (currency: string): string => {
  if (currency === 'CNY') return '¥'
  if (currency === 'USD') return '$'
  return ''
}

/**
 * 规范化用户填写的 key
 * 复制粘贴时经常带上引号、换行、空白, 或者连 `Bearer ` 前缀一起复制进来
 */
const normalizeKey = (raw: string): string => {
  let key = (raw ?? '').trim()
  // 去掉包裹的引号
  key = key.replace(/^['"`]+|['"`]+$/g, '')
  // 去掉可能被一起复制的 Bearer / Authorization 前缀
  key = key.replace(/^authorization\s*[:=]?\s*/i, '')
  key = key.replace(/^bearer\s+/i, '')
  // 去掉零宽字符等不可见字符, 它们不会被 \s 匹配
  key = key.replace(/[\u200B-\u200D\uFEFF]/g, '')
  // 去掉所有空白字符(含换行)
  return key.replace(/\s+/g, '')
}

/**
 * 校验 key 的格式, 返回错误提示, 返回空串表示通过
 */
const keyFormatError = (key: string): string => {
  if (!key.startsWith('sk-')) return 'Key 格式不正确, 应以 sk- 开头'
  if (!/^[A-Za-z0-9\-_]+$/.test(key)) return 'Key 中含非法字符, 请检查是否复制完整'
  if (key.length < 20) return 'Key 长度不对, 请检查是否复制完整'
  return ''
}

/**
 * 隐藏 key 的中间部分, 便于确认当前用的是哪一把 key
 */
const maskKey = (key: string): string => {
  if (isBlank(key)) return ''
  if (key.length <= 8) return '****'
  return `${key.slice(0, 3)}****${key.slice(-4)}`
}

/**
 * 格式化指定模型的余额文本
 */
const balanceTextOf = (name: string): string => {
  const balance = balanceMap[name]
  if (balance === undefined) return '--'
  if (!isBlank(balance.error)) return balance.loading ? '查询中' : '查询失败'
  if (isBlank(balance.total)) return balance.loading ? '查询中' : '--'
  return `${currencySymbol(balance.currency)}${balance.total}`
}

/**
 * 将接口异常转换成展示文案
 * 三方接口的错误响应里带有具体原因(如 "Authentication Fails, Your api key: ****0000 is invalid"), 优先展示它
 */
const errorText = (err: unknown): string => {
  const error = err as {
    response?: { status?: number; data?: { error?: { message?: string } } }
    code?: string
    message?: string
  }
  const status = error?.response?.status
  const serverMsg = error?.response?.data?.error?.message
  if (typeof serverMsg === 'string' && serverMsg.trim() !== '') {
    return status === 401 ? `Key 被服务端拒绝, 请确认 Key 来自 platform.deepseek.com 且未被删除。${serverMsg}` : serverMsg
  }
  if (status === 401) return 'Key 无效'
  if (status === 402) return '余额不足'
  if (status === 403) return 'Key 无权限'
  if (status === 429) return '请求过于频繁'
  if (status !== undefined) return `请求失败(${status})`
  if (error?.code === 'ECONNABORTED') return '请求超时'
  return error?.message ? String(error.message) : '查询失败'
}

/**
 * 读取本地保存的 key
 */
const loadConfig = (): void => {
  const config = Local.get(AI_CONFIG_KEY)
  aiConfig.value = config && typeof config === 'object' ? config : {}
  AI_PROVIDERS.forEach((provider) => (form[provider.name] = aiConfig.value[provider.name] ?? ''))
}

/**
 * 用上次的查询结果填充状态, 首屏可以直接看到余额
 */
const applyCache = (): void => {
  const cache = Local.get(AI_BALANCE_CACHE_KEY)
  if (!cache || typeof cache !== 'object') return
  AI_PROVIDERS.forEach((provider) => {
    const item = cache[provider.name]
    if (!item) return
    Object.assign(balanceMap[provider.name], item, { loading: false, error: '' })
  })
}

/**
 * 缓存本次查询结果
 */
const saveCache = (): void => {
  const cache: Record<string, AiBalance> = {}
  AI_PROVIDERS.forEach((provider) => {
    const balance = balanceMap[provider.name]
    cache[provider.name] = {
      loading: false,
      error: '',
      currency: balance.currency,
      total: balance.total,
      granted: balance.granted,
      toppedUp: balance.toppedUp,
      available: balance.available,
      updateTime: balance.updateTime
    }
  })
  Local.set(AI_BALANCE_CACHE_KEY, cache)
}

/**
 * 查询单个模型(DeepSeek)的余额
 * @param provider 模型接入信息
 * @param key 指定 key, 不传时使用已保存的配置(弹窗中测试用)
 */
const queryBalance = async (provider: AiProvider, key?: string): Promise<void> => {
  const apiKey = normalizeKey(key ?? aiConfig.value[provider.name] ?? '')
  const balance = balanceMap[provider.name]
  balance.error = ''

  if (isBlank(apiKey)) {
    Object.assign(balance, createBalance())
    return
  }

  // 格式明显不对时直接提示, 不必让服务端回 401
  const formatError = keyFormatError(apiKey)
  if (!isBlank(formatError)) {
    balance.error = formatError
    return
  }

  balance.loading = true
  try {
    const resp = await request.get(provider.balanceApi, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
    })
    const infos: DeepSeekBalanceInfo[] = resp.data?.balance_infos ?? []
    // 优先展示人民币余额, 没有时取第一条
    const info = infos.find((item) => item.currency === 'CNY') ?? infos[0]
    if (info === undefined) {
      balance.error = '未获取到余额信息'
      return
    }
    balance.currency = info.currency
    balance.total = info.total_balance
    balance.granted = info.granted_balance
    balance.toppedUp = info.topped_up_balance
    balance.available = resp.data?.is_available === true
    balance.updateTime = getTime()
  } catch (err: unknown) {
    // 打印隐藏后的 key, 便于确认使用的是哪一把
    console.error(`查询 ${provider.label} 余额失败, key: ${maskKey(apiKey)}`, err)
    balance.error = errorText(err)
  } finally {
    balance.loading = false
  }
}

/**
 * 刷新所有模型的余额
 * @param force 为 true 时忽略最小查询间隔
 */
const refreshBalances = async (force: boolean = false): Promise<void> => {
  if (configuredProviders.value.length === 0) {
    AI_PROVIDERS.forEach((provider) => Object.assign(balanceMap[provider.name], createBalance()))
    return
  }
  const now = Date.now()
  if (!force && now - lastQueryAt < QUERY_INTERVAL) return
  lastQueryAt = now

  await Promise.all(
    AI_PROVIDERS.map((provider) => {
      if (isBlank(aiConfig.value[provider.name])) {
        Object.assign(balanceMap[provider.name], createBalance())
        return Promise.resolve()
      }
      return queryBalance(provider)
    })
  )
  saveCache()
}

/**
 * 弹窗中测试当前输入的 key
 */
const testBalance = async (provider: AiProvider): Promise<void> => {
  await queryBalance(provider, form[provider.name])
}

/**
 * 切换底部栏展示的模型
 */
const selectModel = (model: AiProvider): void => {
  emits('update:activeName', model.name)
}

/**
 * 打开设置弹窗, 同时关闭 popover 避免遮挡
 */
const openSetting = (): void => {
  AI_PROVIDERS.forEach((provider) => (form[provider.name] = aiConfig.value[provider.name] ?? ''))
  activeTab.value = AI_PROVIDERS[0].name
  popoverVisible.value = false
  settingVisible.value = true
}

/**
 * 保存 key 到 localStorage, 并立即查询余额
 */
const saveSetting = async (): Promise<void> => {
  saving.value = true
  const config: Record<string, string> = {}
  AI_PROVIDERS.forEach((provider) => (config[provider.name] = normalizeKey(form[provider.name] ?? '')))

  aiConfig.value = config
  Local.set(AI_CONFIG_KEY, config)
  AI_PROVIDERS.forEach((provider) => (form[provider.name] = config[provider.name]))

  // 格式异常时仍然保存, 但给出提示, 避免用户以为已经配置成功
  const invalid = AI_PROVIDERS.find((provider) => !isBlank(config[provider.name]) && !isBlank(keyFormatError(config[provider.name])))

  settingVisible.value = false
  saving.value = false

  if (invalid !== undefined) {
    Notify.warning(keyFormatError(config[invalid.name]), `${invalid.label} Key 格式可能有误`)
  } else if (AI_PROVIDERS.some((provider) => !isBlank(config[provider.name]))) {
    Notify.success('', 'AI Key 已保存')
  }

  // 新增模型后同步切换底部栏展示的模型
  const first = configuredProviders.value[0]
  if (first !== undefined && isBlank(props.activeName)) {
    emits('update:activeName', first.name)
  }

  await refreshBalances(true)
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadConfig()
  applyCache()
  if (configuredProviders.value.length > 0 && isBlank(props.activeName)) {
    emits('update:activeName', configuredProviders.value[0].name)
  }
  refreshBalances(true)
})

// ==================== 对外暴露 ====================

defineExpose({
  /** 已配置的模型列表(含余额状态) */
  models: configuredModels,
  /** 底部栏当前展示的模型, 未配置时为 undefined */
  activeModel: activeProvider,
  /** 立即刷新余额 */
  refresh: () => refreshBalances(true),
  /** 打开设置弹窗 */
  openSetting
})
</script>

<style scoped lang="scss">
.ai-container {
  @include flex(row, flex-start, center);
  @include box(calc(100% - 28px), 28px);
  font-size: 13px;
  padding-left: 10px;
  transition: color 1s;
  cursor: pointer;

  .icon {
    height: 100%;
    font-size: 20px;
    margin-right: 5px;
  }

  .balance {
    font-variant-numeric: tabular-nums;
  }

  &:hover {
    color: var(--el-color-primary);
  }
}
</style>

<style lang="scss">
// popover 与 dialog 的内容会被挂载到 body 上, 无法使用 scoped, 因此统一写在这里
.ai-model-popover {
  width: 230px !important;

  .tree-doc-bottom-model-title {
    @include flex(row, space-between, center);
    padding-bottom: 6px;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color-lighter);

    .operator {
      @include flex(row, flex-end, center);

      .bl-refresh-smile {
        font-size: 14px;
        cursor: pointer;
        color: var(--el-text-color-secondary);
        transition: color 0.3s;

        &:hover {
          color: var(--el-color-primary);
        }
      }

      .el-button {
        margin-left: 4px;
      }
    }
  }

  .ai-model-empty {
    @include flex(row, space-between, center);
    min-width: 200px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .ai-model-list {
    @include flex(column, flex-start, stretch);
    min-width: 200px;
    font-size: 13px;

    .ai-model-item {
      @include flex(row, flex-start, center);
      padding: 5px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--el-fill-color-light);
      }

      &.active {
        background-color: var(--el-color-primary-light-9);

        .ai-model-label {
          color: var(--el-color-primary);
        }
      }

      .ai-model-dot {
        width: 7px;
        height: 7px;
        flex-shrink: 0;
        margin-right: 8px;
        border-radius: 50%;
      }

      .ai-model-label {
        color: var(--el-text-color-regular);
      }

      .ai-model-value {
        margin-left: auto;
        font-variant-numeric: tabular-nums;
        color: var(--el-text-color-primary);
        cursor: default;

        &.error {
          color: var(--el-color-danger);
        }
      }
    }
  }
}

.dialog-ai-model-setting {
  .el-dialog__header {
    padding: 15px;
    margin: 0;
    border-bottom: 1px solid var(--el-border-color);
  }

  .el-dialog__body {
    padding: 10px 15px 0 15px;
  }

  .ai-setting-form {
    @include flex(column, flex-start, stretch);

    .ai-setting-label {
      margin-bottom: 6px;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }

    .ai-setting-tip {
      @include flex(row, space-between, center);
      margin-top: 8px;
      font-size: 12px;
      line-height: 16px;
      color: var(--el-text-color-secondary);

      .el-link {
        font-size: 12px;
      }
    }

    .ai-setting-saved {
      margin-top: 4px;
      font-size: 12px;
      line-height: 16px;
      color: var(--el-text-color-secondary);
      font-variant-numeric: tabular-nums;
    }

    .ai-setting-error {
      margin-top: 8px;
      padding: 6px 8px;
      font-size: 12px;
      line-height: 17px;
      word-break: break-all;
      border-radius: 4px;
      color: var(--el-color-danger);
      background-color: var(--el-color-danger-light-9);
    }

    .ai-setting-status {
      @include flex(row, flex-start, center);
      margin-top: 15px;
      padding-top: 10px;
      font-size: 13px;
      border-top: 1px solid var(--el-border-color-lighter);

      .status-label {
        margin-right: 6px;
        color: var(--el-text-color-secondary);
      }

      .status-value {
        font-weight: 500;

        &.error {
          color: var(--el-color-danger);
        }

        .status-time {
          margin-left: 6px;
          font-size: 11px;
          font-weight: 400;
          color: var(--el-text-color-secondary);
        }
      }

      .el-button {
        margin-left: auto;
      }
    }
  }
}
</style>
