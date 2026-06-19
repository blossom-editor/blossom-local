/* ======================================================================
 * 文章树状列表自定义节点
 * ====================================================================== */
import { isNotBlank } from '@renderer/assets/utils/obj'

/**
 * 文章图标是否是链接
 * @param doc
 * @param viewStyle
 * @returns
 */
export const isShowImg = (doc: DocTree, viewStyle: { isShowArticleIcon: boolean }) => {
  return viewStyle.isShowArticleIcon && isNotBlank(doc.icon) && !doc?.updn
}

/**
 * 文章图标是否是内置 svg
 * @param doc
 * @param viewStyle
 * @returns
 */
export const isShowSvg = (doc: DocTree, viewStyle: { isShowArticleIcon: boolean }) => {
  return viewStyle.isShowArticleIcon && !doc?.updn && doc.icon?.startsWith('wl-')
}
