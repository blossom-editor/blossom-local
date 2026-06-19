/** 城市信息 */
export interface CityLocation {
  adm1: string
  adm2: string
  name: string
  id: string
}

/** 当前天气 */
export interface Now {
  temp: string
  icon: string
  text: string
}

/** 每日天气预报 */
export interface Daily {
  fxDate: string
  tempMax: string
  tempMin: string
  iconDay: string
  textDay: string
  iconNight: string
  textNight: string
}

/** 逐小时预报 */
export interface Hourly {
  temp: string
  icon: string
  text: string
}

/** 天气完整响应 */
export interface WeatherRes {
  location: CityLocation
  now: Now
  hourly: Hourly
  daily: Daily[]
}

/** 天气图标映射 */
export interface WeatherNode {
  icon: string
  text: string
}

export const WEATHER_CODE_MAP = new Map<string, WeatherNode>([
  ['100', { icon: '#wt-qing', text: '晴' }],
  ['101', { icon: '#wt-yin', text: '多云' }],
  ['102', { icon: '#wt-yin', text: '少云' }],
  ['103', { icon: '#wt-yin', text: '晴间多云' }],
  ['104', { icon: '#wt-yin', text: '阴' }],
  ['150', { icon: '#wt-qing', text: '晴' }],
  ['151', { icon: '#wt-yin', text: '多云' }],
  ['152', { icon: '#wt-yin', text: '少云' }],
  ['153', { icon: '#wt-yin', text: '晴间多云' }],
  ['154', { icon: '#wt-yin', text: '阴' }],
  ['200', { icon: '#wt-feng', text: '有风' }],
  ['201', { icon: '#wt-qing', text: '平静' }],
  ['202', { icon: '#wt-qing', text: '微风' }],
  ['203', { icon: '#wt-qing', text: '和风' }],
  ['204', { icon: '#wt-qing', text: '清风' }],
  ['205', { icon: '#wt-feng', text: '强风劲风' }],
  ['206', { icon: '#wt-feng', text: '疾风' }],
  ['207', { icon: '#wt-feng', text: '大风' }],
  ['208', { icon: '#wt-feng', text: '烈风' }],
  ['209', { icon: '#wt-feng', text: '风暴' }],
  ['210', { icon: '#wt-feng', text: '狂爆风' }],
  ['211', { icon: '#wt-feng', text: '飓风' }],
  ['212', { icon: '#wt-feng', text: '龙卷风' }],
  ['213', { icon: '#wt-feng', text: '热带风暴' }],
  ['300', { icon: '#wt-yu', text: '阵雨' }],
  ['301', { icon: '#wt-yu', text: '强阵雨' }],
  ['302', { icon: '#wt-zhongyu', text: '雷阵雨' }],
  ['303', { icon: '#wt-zhongyu', text: '强雷阵雨' }],
  ['304', { icon: '#wt-zhongyu', text: '阵雨冰雹' }],
  ['305', { icon: '#wt-yu', text: '小雨' }],
  ['306', { icon: '#wt-yu', text: '中雨' }],
  ['307', { icon: '#wt-zhongyu', text: '大雨' }],
  ['308', { icon: '#wt-zhongyu', text: '极端降雨' }],
  ['309', { icon: '#wt-yu', text: '毛毛细雨' }],
  ['310', { icon: '#wt-zhongyu', text: '暴雨' }],
  ['311', { icon: '#wt-zhongyu', text: '大暴雨' }],
  ['312', { icon: '#wt-zhongyu', text: '特大暴雨' }],
  ['313', { icon: '#wt-zhongyu', text: '冻雨' }],
  ['314', { icon: '#wt-zhongyu', text: '小到中雨' }],
  ['315', { icon: '#wt-zhongyu', text: '中到大雨' }],
  ['316', { icon: '#wt-zhongyu', text: '大到暴雨' }],
  ['317', { icon: '#wt-zhongyu', text: '暴到大暴雨' }],
  ['318', { icon: '#wt-zhongyu', text: '大暴特暴雨' }],
  ['399', { icon: '#wt-yu', text: '雨' }],
  ['400', { icon: '#wt-xue', text: '小雪' }],
  ['401', { icon: '#wt-xue', text: '中雪' }],
  ['402', { icon: '#wt-xue', text: '大雪' }],
  ['403', { icon: '#wt-xue', text: '暴雪' }],
  ['404', { icon: '#wt-xue', text: '雨夹雪' }],
  ['405', { icon: '#wt-xue', text: '雨雪天气' }],
  ['406', { icon: '#wt-xue', text: '阵雨夹雪' }],
  ['407', { icon: '#wt-xue', text: '阵雪' }],
  ['408', { icon: '#wt-xue', text: '小到中雪' }],
  ['409', { icon: '#wt-xue', text: '中到大雪' }],
  ['410', { icon: '#wt-xue', text: '大到暴雪' }],
  ['499', { icon: '#wt-xue', text: '雪' }],
  ['500', { icon: '#wt-wu', text: '薄雾' }],
  ['501', { icon: '#wt-wu', text: '雾' }],
  ['502', { icon: '#wt-wu', text: '霾' }],
  ['503', { icon: '#wt-wu', text: '扬沙' }],
  ['504', { icon: '#wt-wu', text: '浮尘' }],
  ['507', { icon: '#wt-wu', text: '沙尘暴' }],
  ['508', { icon: '#wt-wu', text: '强沙尘暴' }],
  ['509', { icon: '#wt-wu', text: '浓雾' }],
  ['510', { icon: '#wt-wu', text: '强浓雾' }],
  ['511', { icon: '#wt-wu', text: '中度霾' }],
  ['512', { icon: '#wt-wu', text: '重度霾' }],
  ['513', { icon: '#wt-wu', text: '严重霾' }],
  ['514', { icon: '#wt-wu', text: '大雾' }],
  ['515', { icon: '#wt-wu', text: '特强浓雾' }],
  ['900', { icon: '#', text: '热' }],
  ['901', { icon: '#', text: '冷' }],
  ['999', { icon: '#', text: '未知' }]
])
