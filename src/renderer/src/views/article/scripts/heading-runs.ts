/**
 * ============================================================================
 * 标题按颜色切段（右侧目录 / 预览窗口目录共用）
 * ============================================================================
 *
 * 正文标题的颜色是行内 HTML（见 plugins/font-color.ts 的 `<font color>`，
 * 以及旧式简写 `<re>` / `<gr>` 等被 marked 转成的 `<font style="color:...">`）。
 *
 * 目录如果只取 `textContent`，颜色就丢了；直接整行套一个颜色又和正文不一致
 * （用户只给标题里的某几个字上色时，目录里却是整行变色）。所以这里按**呈现顺序**
 * 把标题文字切成若干段，每段带上自己的颜色，交给目录逐段渲染：
 *
 * ```md
 * # 关于 <font color="#e74c3c">Redis</font> 的缓存
 * ```
 *
 * => `[{text:'关于 '}, {text:'Redis', color:'#e74c3c'}, {text:' 的缓存'}]`
 *
 * 两个调用方：`milkdown/editor.ts` 的 `getHeadings()`（编辑器右侧目录）、
 * `scripts/article.ts` 的 `parseTocAsync()`（只读预览窗口目录）。
 */

/** 标题里的一段文字 */
export interface HeadingRun {
  /** 文字内容 */
  text: string
  /** 该段文字的颜色，没设置颜色时为 undefined */
  color?: string
}

/**
 * 允许写进目录样式的颜色值
 *
 * 颜色来自文章正文（可被任意编辑，也可能来自导入的历史文章），
 * 最终会写进元素的内联样式，所以先按 CSS 颜色语法白名单过滤一遍，
 * 避免非法的值（比如 `red; background: url(...)`）被当作样式注入。
 *
 * `var(--el-color-danger)` 这类主题变量要放行：旧式简写 `<re>` 等
 * 就是被渲染成 `style="color:var(--el-color-xxx)"` 的。
 */
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/]+\)|var\(\s*--[\w-]+\s*\)|[a-z]{3,20})$/i

/** 校验并返回颜色，不合法返回 undefined */
const sanitizeColor = (value?: string | null): string | undefined => {
  const color = (value ?? '').trim()
  return color !== '' && COLOR_RE.test(color) ? color : undefined
}

/**
 * 从 `<font>` 元素上取它自己声明的颜色
 *
 * 两种来源都要认：
 *
 * 1. `color="..."` 属性 —— 编辑器里用浮动工具条设置的颜色
 * 2. `style="color:..."` —— 旧式简写（`<re>` 等）经 marked 渲染出来的形式
 *
 * 注意取的是**该元素自己声明的**颜色而不是计算样式：计算样式会把继承色
 * 也算进来，就无法判断「这段文字到底有没有被上色」了。
 */
const fontColorOf = (font: HTMLElement): string | undefined => {
  const attr = sanitizeColor(font.getAttribute('color'))
  if (attr) return attr
  const inline = sanitizeColor(font.style?.color)
  if (inline) return inline
  // style 里有语法错误、CSSOM 解析不出 color 时，退一步从原始 style 文本里抠
  const styleAttr = font.getAttribute('style') ?? ''
  return sanitizeColor(/(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(styleAttr)?.[1])
}

/**
 * 取某个文本节点所属的文字颜色
 *
 * 从文本节点自身往上找最近的 `<font>`（颜色可以嵌在加粗等其它标签里，
 * 也可能多层嵌套），一直找到标题元素为止 —— 走到标题就停，不越界。
 *
 * @param node 标题内的文本节点
 * @param root 标题元素
 */
const runColorOf = (node: Text, root: HTMLElement): string | undefined => {
  let parent = node.parentElement
  while (parent && parent !== root) {
    if (parent.tagName === 'FONT') {
      const color = fontColorOf(parent)
      if (color) return color
    }
    parent = parent.parentElement
  }
  return undefined
}

/**
 * 把标题文字按颜色切成若干段
 *
 * 用 TreeWalker 按**呈现顺序**遍历文本节点，逐段读取所属颜色，
 * 相邻且同色的段落合并。
 *
 * @param el 标题元素（h1 - h6）
 */
export const headingRuns = (el: HTMLElement): HeadingRun[] => {
  const runs: HeadingRun[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode() as Text | null
  while (node) {
    const text = node.nodeValue ?? ''
    if (text.length > 0) {
      const color = runColorOf(node, el)
      const last = runs[runs.length - 1]
      if (last && last.color === color) last.text += text
      else runs.push({ text, color })
    }
    node = walker.nextNode() as Text | null
  }
  return runs
}
