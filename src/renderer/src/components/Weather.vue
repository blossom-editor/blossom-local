<template>
  <div v-if="!configStore.weatherConfig.enabled" class="weather-root">
    <div class="placeholder">
      <div class="remark">未启用天气</div>
    </div>
  </div>
  <div v-else class="weather-root">
    <bl-row class="location" just="flex-end">
      上次更新 {{ lastRefreshTime }} / {{ weather.location.adm1 }} {{ weather.location.adm2 }}
      <el-tooltip placement="top" effect="light" :show-after="1000" :hide-after="0" :auto-close="3000">
        <span class="iconbl bl-refresh-smile" @click="refresh()"></span>
        <template #content>
          刷新天气信息
          <br />
          注意: 请勿频繁刷新, 避免超出三方免费额度
        </template>
      </el-tooltip>
    </bl-row>

    <!-- 现在 -->
    <div class="now hover-dark">
      <div class="weather-title"></div>
      <div class="weather-body">
        <img :src="getImgUrl(WEATHER_CODE_MAP.get(weather.now.icon)!.icon!)" style="width: 190px; height: 190px" />
        <!-- <img src="@renderer/assets/imgs/weather/qing-moon.png" style="width: 190px;height: 190px;"> -->
        <div class="temp-wrapper">
          <!-- 温度 -->
          <span class="now-temp">
            {{ weather.now.temp }}
          </span>
          <!-- 温度的单位和说明 -->
          <div class="now-temp-extra">
            <span style="font-size: 25px">°C</span>
            <span style="">{{ weather.now.text }}</span>
          </div>
        </div>
      </div>

      <div class="weather-footer">
        <span>未来一小时: {{ weather.hourly.temp }}℃ {{ weather.hourly.text }}</span>
      </div>
    </div>

    <!-- 今天 -->
    <div class="today hover-dark">
      <div class="weather-title">Today</div>
      <div class="weather-body">
        <img :src="getImgUrl(WEATHER_CODE_MAP.get(weather.daily[0].iconDay)!.icon!)" style="width: 40px; height: 40px" />
        <!-- <img src="@renderer/assets/imgs/weather/feng.png" style="width: 40px;height: 40px;"> -->
        <span>{{ weather.daily[0].tempMax }}°C</span>
        ~
        <span>{{ weather.daily[0].tempMin }}°C </span>
      </div>
      <div class="weather-footer">
        <span>{{ weather.daily[0].textDay }}</span>
      </div>
    </div>

    <!-- 明天 -->
    <div class="tomorrow hover-dark">
      <div class="weather-title">Tomorrow</div>
      <div class="weather-body">
        <img :src="getImgUrl(WEATHER_CODE_MAP.get(weather.daily[1].iconDay)!.icon!)" style="width: 40px; height: 40px" />
        <span>{{ weather.daily[1].tempMax }}°C</span>
        ~
        <span>{{ weather.daily[1].tempMin }}°C</span>
      </div>
      <div class="weather-footer">
        <span>{{ weather.daily[1].textDay }}</span>
      </div>
    </div>

    <!-- 后天 -->
    <div class="day-after hover-dark">
      <div class="weather-title">
        <span>Tomorrow</span>
        <span>After</span>
      </div>
      <div class="weather-body">
        <img :src="getImgUrl(WEATHER_CODE_MAP.get(weather.daily[2].iconDay)!.icon!)" style="width: 40px; height: 40px" />
        <span>{{ weather.daily[2].tempMax }}°C</span>
        ~
        <span>{{ weather.daily[2].tempMin }}°C</span>
      </div>
      <div class="weather-footer">
        <span>{{ weather.daily[2].textDay }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@renderer/stores/config'
import { Request } from '@renderer/assets/utils/http'
import { type WeatherRes, WEATHER_CODE_MAP } from './scripts/weather'
import { isBlank } from '@renderer/assets/utils/obj'
import { getTime } from '@renderer/assets/utils/util'

const configStore = useConfigStore()
const request = new Request()
// ==================== 生命周期 ====================

/**
 * 移除图标前缀
 */
const replacePrefix = (icon: string): string => {
  if (icon?.trim()) {
    return icon.replaceAll('#wt-', '')
  }
  return ''
}

const getImgUrl = (name: string) => {
  let iconValue = replacePrefix(name)
  if (isBlank(iconValue)) return new URL(`../assets/imgs/weather/qing.png`, import.meta.url).href
  return new URL(`../assets/imgs/weather/${iconValue}.png`, import.meta.url).href
}

// ==================== 响应式数据 ====================
const lastRefreshTime = ref()
const weather = ref<WeatherRes>({
  location: { name: '', id: '', adm1: '', adm2: '未配置天气' },
  now: { temp: '0', text: '晴', icon: '100' },
  hourly: { temp: '', text: '0', icon: '100' },
  daily: [
    { tempMin: '0', tempMax: '0', textDay: '晴', fxDate: '', iconDay: '100', iconNight: '', textNight: '' },
    { tempMin: '0', tempMax: '0', textDay: '晴', fxDate: '', iconDay: '100', iconNight: '', textNight: '' },
    { tempMin: '0', tempMax: '0', textDay: '晴', fxDate: '', iconDay: '100', iconNight: '', textNight: '' }
  ]
})

/**
 * 获取地址
 */
const getLocaltion = () => {
  if (!configStore.weatherConfig.enabled) return
  if (isBlank(configStore.weatherConfig.location) || isBlank(configStore.weatherConfig.host) || isBlank(configStore.weatherConfig.key)) return
  const API_lookup = `${configStore.weatherConfig.host}/geo/v2/city/lookup`

  const key = configStore.weatherConfig.key
  const location = configStore.weatherConfig.location
  // 城市
  request.get(API_lookup, { params: { location: location, key: key } }).then((resp) => {
    if (resp.data.code === '200') {
      weather.value.location = resp.data.location[0]
    }
  })
}

/**
 * 获取天气信息
 */
const getWeather = async (): Promise<void> => {
  if (!configStore.weatherConfig.enabled) return
  if (isBlank(configStore.weatherConfig.location) || isBlank(configStore.weatherConfig.host) || isBlank(configStore.weatherConfig.key)) return
  lastRefreshTime.value = getTime()
  console.warn('刷新天气信息')
  const API____now = `${configStore.weatherConfig.host}/v7/weather/now`
  const API____24h = `${configStore.weatherConfig.host}/v7/weather/24h`
  const API_____3d = `${configStore.weatherConfig.host}/v7/weather/3d`
  const key = configStore.weatherConfig.key
  const location = configStore.weatherConfig.location

  // 当前
  request.get(API____now, { params: { location: location, key: key } }).then((resp) => {
    if (resp.data.code === '200') {
      weather.value.now = resp.data.now
    }
  })
  // 24h
  request.get(API____24h, { params: { location: location, key: key } }).then((resp) => {
    if (resp.data.code === '200') {
      weather.value.hourly = resp.data.hourly[0]
    }
  })
  // 三天
  request.get(API_____3d, { params: { location: location, key: key } }).then((resp) => {
    if (resp.data.code === '200') {
      weather.value.daily = resp.data.daily
    }
  })
}
/**
 * 刷新天气信息
 */
const refresh = async (): Promise<void> => {
  getLocaltion()
  getWeather()
}
/**
 * 定时刷新天气任务（每30分钟刷新一次）
 */
const refreshWeatherTask = (): void => {
  const TWENTY_MINUTES = 1000 * 60 * 30
  setInterval(getWeather, TWENTY_MINUTES)
}
</script>

<style scoped lang="scss">
.weather-root {
  @include flex(row, center, flex-end);
  @include font(15px, 500, 'jellee');
  @include themeColor(#ffffff, #d8d8d8);
  @include themeText(2px 3px 4px rgba(107, 104, 104, 0.5), 2px 3px 4px rgba(39, 39, 39, 0.5));
  min-height: 250px;
  max-height: 250px;
  position: relative;
  border-radius: 10px;
  transition: box-shadow 0.5s;
  z-index: 99;

  .location {
    @include font(12px, 300);
    @include absolute(30px, 10px, '', '');
    color: var(--bl-text-color-light);
    text-shadow: var(--bl-text-shadow-light);

    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }

      100% {
        transform: rotate(-360deg);
      }
    }

    .bl-refresh-smile {
      cursor: pointer;
      margin-left: 3px;
      transition: color 0.3s;

      &:hover {
        animation: rotation 10s linear infinite;
        text-shadow: none;
        color: var(--el-color-primary);
      }
    }
  }

  .weather-title {
    @include flex(column, flex-start, flex-end);
    @include box(100%, 15%);
    padding: 0 10px;
    font-size: 11px;
  }

  .weather-body {
    @include flex(column, center, center);
    @include box(100%, 70%);
  }

  .weather-footer {
    @include flex(row, center, center);
    @include box(100%, 15%);
    @include font(11px, 500);
  }

  .now {
    @include box(140px, 200px);
    border-top-left-radius: 10px;
    border-bottom-left-radius: 10px;
    background-color: var(--el-color-primary);
    transition:
      box-shadow 0.3s,
      width 0.2s;
    margin-left: 10px;

    svg {
      @include box(200px, 200px);
      position: absolute;
      top: -30px;
      z-index: 100;
    }

    img {
      @include box(200px, 200px);
      position: absolute;
      top: -30px;
      z-index: 100;
    }

    .temp-wrapper {
      @include flex(row, center, center);
      width: 100%;
      margin-top: 70px;
    }

    &-temp {
      @include flex(row, center, center);
      @include font(60px, 900);
      height: 100%;
    }

    &-temp-extra {
      @include flex(column, center);
      @include font(16px, 700);
      height: 100%;
    }

    &:hover {
      z-index: 15;
    }
  }
  .now-placeholder {
    @include box(140px, 200px);
    background-color: var(--el-color-primary-light-7);
    position: relative;
    overflow: hidden;
    border-top-left-radius: 10px;
    border-bottom-left-radius: 10px;
    margin-left: 10px;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 200%;
      height: 100%;
      background: repeating-linear-gradient(
        -45deg,
        transparent 0,
        transparent 20px,
        var(--el-color-primary-light-5) 20px,
        var(--el-color-primary-light-5) 40px
      );
    }
  }

  .today,
  .tomorrow,
  .day-after {
    @include box(100px, 200px);
    transition:
      box-shadow 0.3s,
      width 0.2s,
      height 0.2s;

    &:hover {
      z-index: 15;
    }

    .weather-body {
      svg {
        @include box(50px, 50px);
      }

      span {
        @include font(15px, 700);
        margin-top: 10px;
      }
    }
  }

  .today {
    background-color: var(--el-color-primary-light-3);
  }

  .tomorrow {
    background-color: var(--el-color-primary-light-5);
  }

  .day-after {
    background-color: var(--el-color-primary-light-7);
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
  }
}

.hover-dark {
  &:hover {
    box-shadow: 0 2px 10px 3px rgba(0, 0, 0, 0.3);
  }
}

.weather-root .placeholder {
  @include flex(column, center, center);
  width: 440px;
  height: 200px;
  margin-left: 10px;
  border-radius: 10px;
  background-color: var(--el-color-primary-light-7);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 200%;
    height: 100%;
    background: repeating-linear-gradient(
      -45deg,
      transparent 0,
      transparent 20px,
      var(--el-color-primary-light-5) 20px,
      var(--el-color-primary-light-5) 40px
    );
  }

  .remark {
    z-index: 1;
    padding: 10px;
    border-radius: 10px;
    background-color: var(--el-color-primary-light-3);
  }
}
</style>
