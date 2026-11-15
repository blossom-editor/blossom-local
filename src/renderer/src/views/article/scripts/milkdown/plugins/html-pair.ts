/**
 * ============================================================================
 * 行内 HTML 配对工具
 * ============================================================================
 *
 * remark 会把 `<sup>xxx</sup>`、`<font color="red">xxx</font>` 这类行内 HTML
 * 拆成三个兄弟节点：`html('<sup>')` + `text('xxx')` + `html('</sup>')`。
 *
 * 这个工具负责把成对的开闭标签合并成一个自定义 mdast 节点（例如 `{type:'sup'}`），
 * 让上标/下标、文字颜色这类「用 HTML 表达格式」的历史语法可以在所见即所得编辑器里
 * 变成真正的 mark，同时序列化时再原样写回 HTML。
 *
 * 处理规则：
 * - 只在**同一个父节点的 children** 里配对（行内 HTML 不会跨块）
 * - 支持同名标签的嵌套，用深度计数匹配
 * - 找不到闭标签时保持原样，绝不丢弃用户的原始内容
 */

/** 匹配到开标签时的返回 */
export interface OpenTagMatch {
  /** 生成的 mdast 节点类型 */
  type: string
  /**
   * 开标签的标签名（如 `sup` / `sub` / `font`）
   *
   * 必须提供：闭标签只能配对自己同名的开标签。同一个 matcher 可能同时处理
   * 多个标签（sup-sub 就是 sup + sub），不校验名字的话
   * `<sup>2<sub>i</sub></sup>` 会被 `</sub>` 提前闭合，结构直接错位。
   */
  tag?: string
  /** 节点附加属性（例如 color） */
  attrs?: Record<string, string>
}

/** 匹配到闭标签时的返回 */
export interface CloseTagMatch {
  /** 该闭标签对应的标签名（用于配对） */
  close: string
}

/** 单个 html 节点值的判定结果 */
export type TagMatch = OpenTagMatch | CloseTagMatch | null

/** 判断是否是闭标签结果 */
const isCloseMatch = (match: TagMatch): match is CloseTagMatch => !!match && 'close' in match

/**
 * 把 children 里成对的行内 HTML 合并成结构化节点，并递归处理所有子节点
 *
 * @param children mdast 的 children 数组
 * @param matcher  判断某个 html 节点的文本，返回开/闭标签信息或 null
 */
export const pairHtmlTags = (children: any[], matcher: (value: string) => TagMatch): any[] => {
  if (!Array.isArray(children) || children.length === 0) return children

  const result: any[] = []
  let index = 0

  while (index < children.length) {
    const child = children[index]
    const value = child?.type === 'html' ? String(child.value ?? '').trim() : ''
    const match = value ? matcher(value) : null

    // ---------------- 开标签：向后寻找配对的闭标签 ----------------
    if (match && !isCloseMatch(match)) {
      const tagType = match.type
      const tagName = match.tag
      /** 两个开标签是否算「同一个标签」（用于嵌套计数） */
      const isSameTag = (other: OpenTagMatch): boolean => (tagName ? other.tag === tagName : other.type === tagType)
      let depth = 1
      let cursor = index + 1
      const inner: any[] = []

      for (; cursor < children.length; cursor++) {
        const next = children[cursor]
        if (next?.type !== 'html') {
          inner.push(next)
          continue
        }
        const nextValue = String(next.value ?? '').trim()
        const nextMatch = matcher(nextValue)
        if (!nextMatch) {
          inner.push(next)
          continue
        }
        if (isCloseMatch(nextMatch)) {
          // 闭标签必须与开标签同名：`</sub>` 不能闭合 `<sup>`
          if (tagName && nextMatch.close !== tagName) {
            inner.push(next)
            continue
          }
          depth--
          if (depth === 0) break
          inner.push(next)
          continue
        }
        // 同名开标签，深度 +1
        if (isSameTag(nextMatch)) depth++
        inner.push(next)
      }

      // 找到配对的闭标签，合并成一个节点
      // 注意：附加属性直接展开到节点上（而不是塞进 attrs），
      // 这样与序列化时 withMark(mark, type, value, props) 产出的结构保持一致
      if (depth === 0) {
        result.push({ type: tagType, ...(match.attrs ?? {}), children: pairHtmlTags(inner, matcher) } as any)
        index = cursor + 1
        continue
      }
      // 没找到，原样保留（继续往下走，交给下面的通用分支处理）
    }

    // ---------------- 普通节点：递归处理自己的 children ----------------
    if (Array.isArray(child?.children)) {
      result.push({ ...child, children: pairHtmlTags(child.children, matcher) })
    } else {
      result.push(child)
    }
    index++
  }

  return result
}

/**
 * 序列化时把 mark 包装成行内 HTML 的 toMarkdown handler
 *
 * @param render 生成 HTML 的具体实现
 */
export const createInlineHtmlHandler = (render: (node: any, content: string) => string) => {
  return (node: any, _parent: any, state: any, info: any) => {
    // containerPhrasing 负责把子节点（文本 + 其它 mark）序列化为字符串
    const content = state.containerPhrasing(node, { ...info, before: 'a', after: 'a' })
    return render(node, content)
  }
}
