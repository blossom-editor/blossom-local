/**
 * ============================================================================
 * 列表：官方 list-item-block 组件
 * ============================================================================
 *
 * GFM 的任务列表项在文档模型里只是 `list_item` 多了个 `checked` 属性，
 * milkdown 不会自动渲染复选框（`li[data-checked]` 上没有任何可点的 DOM），
 * 所以之前 `- [x] 任务` 能解析、却不能点击切换。
 *
 * 官方 `listItemBlockComponent` 解决的就是这件事：
 * - 每个列表项前面有一块「标签区」（圆点 / 序号 / 复选框）
 * - 复选框用 `pointerdown` 直接修改节点的 `checked` 属性，不需要自定义命令
 * - 顺带让有序列表的序号在增删项后自动同步
 *
 * 图标用内联 SVG，颜色跟随主题；样式见 bl-milkdown.css 的「列表」小节。
 */

import type { Ctx } from '@milkdown/kit/ctx'
import { listItemBlockComponent, listItemBlockConfig } from '@milkdown/kit/component/list-item-block'
/**
 * 标签渲染参数
 *
 * 官方只声明了 interface 没有 export，这里按 d.ts 原样声明一份，
 * 避免依赖未导出的类型。
 */
interface RenderLabelProps {
  label: string
  listType: string
  readonly?: boolean
  checked?: boolean | null
}

/** 未勾选：空心圆角方框 */
const UNCHECKED_ICON =
  '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

/** 已勾选：主题色实心 + 勾 */
const CHECKED_ICON =
  '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1.5" fill="var(--el-color-primary)" stroke="currentColor" stroke-width="1.5"/><path d="M6.2 10.3l2.4 2.4 5-5.2" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/**
 * 标签渲染
 *
 * - 普通列表项：直接使用 GFM 给出的 label（`•` 或 `1.`）
 * - 任务列表项：渲染复选框图标
 */
const renderLabel = ({ label, checked }: RenderLabelProps) => {
  if (checked == null) return label
  return checked ? CHECKED_ICON : UNCHECKED_ICON
}

/** 配置列表标签（必须在 `.use(listItemBlockComponent)` 之后调用） */
export const configureListItem = (ctx: Ctx) => {
  ctx.update(listItemBlockConfig.key, (prev) => ({ ...prev, renderLabel }))
}

/** 列表插件集合 */
export const listItemPlugins = listItemBlockComponent
