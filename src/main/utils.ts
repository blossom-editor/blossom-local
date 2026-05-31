/**
 * 校验是否是一个合法的名称
 */
export const validateFileName = (str: string): boolean => {
  const regex = /[<>\/\\:*?"|.]/
  return regex.test(str)
}
