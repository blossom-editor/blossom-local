export const isNull = (val: any): boolean => {
  if (typeof val === 'boolean') {
    return false
  }
  if (typeof val === 'number') {
    return false
  }

  // 控制
  if (val == null || val === undefined || val === 'undefined' || val === '') {
    return true
  }

  // 数组
  if (Array.isArray(val) && val.length === 0) {
    return true
  }

  // 对象, 但无字段
  if (val instanceof Object && JSON.stringify(val) === '{}') {
    return true
  }
  return false
}

export const isNotNull = (val: any): boolean => {
  return !isNull(val)
}

export const isBlank = (str: string | undefined | null): boolean => {
  if (str === undefined) {
    return true
  }
  if (str == null) {
    return true
  }
  if (str == '') {
    return true
  }
  if (str == ' ') {
    return true
  }
  if (str.length == 0) {
    return true
  }
  return false
}

export const isNotBlank = (str: string | undefined | null): boolean => {
  return !isBlank(str)
}

/**
 * 判断数组是否为空（null / undefined / 长度 0 均为空）
 *
 * 项目内统一用本方法做数组的「空」判断，**不要再引入 lodash**：
 * lodash 为 CJS 包，无法被 tree-shake，仅仅为了一个判空函数就会往产物里塞进
 * 200KB+ 的运行时（见构建产物中的 lodash chunk）。
 *
 * 命名带 Arr 后缀是为了明确它**只接受数组**。注意与 `lodash.isEmpty` 的语义差异：
 * lodash 对空对象 `{}`、空字符串 `''`、空 Map/Set 也返回 true，本方法不会。
 * 判断对象或字符串请用 {@link isNull} / {@link isBlank}。
 */
export const isEmptyArr = (arr: any[] | null | undefined): boolean => {
  return !arr || arr.length === 0
}
