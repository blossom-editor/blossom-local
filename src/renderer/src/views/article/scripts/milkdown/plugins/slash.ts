/**
 * ============================================================================
 * 斜杠命令菜单（输入 "/" 唤起）
 * ============================================================================
 *
 * 基于 `@milkdown/kit/plugin/slash` 的 SlashProvider（负责「何时显示 + 定位」），
 * 菜单 UI 用原生 DOM 手写，键盘上下键与回车在 PluginSpec 的 `handleKeyDown` 中处理。
 *
 * 交互流程：
 * 1. 在段落里输入 `/`，SlashProvider 触发显示
 * 2. 继续输入可以过滤菜单项
 * 3. 回车 / 点击执行命令：先删掉 `/查询词` 再执行对应命令
 */

import type { MilkdownPlugin } from '@milkdown/kit/ctx'
import { commandsCtx, schemaCtx } from '@milkdown/kit/core'
import { SlashProvider, slashFactory } from '@milkdown/kit/plugin/slash'
import {
  createCodeBlockCommand,
  insertHrCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand
} from '@milkdown/kit/preset/commonmark'
import { insertTableCommand } from '@milkdown/kit/preset/gfm'
import { REQUEST_EVENT } from '../constants'

/** slash 插件的 spec 容器 */
export const slash = slashFactory('BL_SLASH')

interface SlashItem {
  /** 显示名称 */
  label: string
  /** 右侧提示 */
  hint?: string
  /** 图标 class（可选） */
  icon?: string
  /** 过滤用的关键字 */
  keywords: string
  /** 执行 */
  run: () => void
}

/**
 * 根据上下文创建菜单项
 */
const createItems = (ctx: any, view: any): SlashItem[] => {
  const commands = ctx.get(commandsCtx)
  const schema = ctx.get(schemaCtx)

  const insertMath = () => {
    const node = schema.nodes.math_block?.create({ value: '' })
    if (!node) return
    view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
    view.focus()
  }

  /** 插入行内公式（占位为空，插入后双击即可编辑） */
  const insertInlineMath = () => {
    const node = schema.nodes.math_inline?.create({ value: '' })
    if (!node) return
    view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
    view.focus()
  }

  const requestImage = () => {
    view.dom.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: { type: 'image' }, bubbles: true }))
  }

  return [
    // { label: '一级标题', hint: '#', keywords: 'h1 bt 标题', run: () => commands.call(wrapInHeadingCommand.key, 1) },
    // { label: '二级标题', hint: '##', keywords: 'h2 bt 标题', run: () => commands.call(wrapInHeadingCommand.key, 2) },
    // { label: '三级标题', hint: '###', keywords: 'h3 bt 标题', run: () => commands.call(wrapInHeadingCommand.key, 3) },
    // {
    //   label: '引用',
    //   icon: 'bl-a-rightsmallline-line',
    //   keywords: 'quote yinyong',
    //   run: () => commands.call(wrapInBlockquoteCommand.key)
    // },
    // {
    //   label: '无序列表',
    //   icon: 'bl-list-unordered',
    //   keywords: 'ul list liebiao',
    //   run: () => commands.call(wrapInBulletListCommand.key)
    // },
    // {
    //   label: '有序列表',
    //   icon: 'bl-list-ordered',
    //   keywords: 'ol list liebiao',
    //   run: () => commands.call(wrapInOrderedListCommand.key)
    // },
    {
      label: '表格',
      icon: 'bl-table-',
      keywords: 'table biaoge',
      run: () => commands.call(insertTableCommand.key, { row: 3, col: 3 })
    },
    {
      label: '代码块',
      icon: 'bl-double-quotes-r',
      keywords: 'code pre daima',
      run: () => commands.call(createCodeBlockCommand.key, 'text')
    },
    // { label: '分割线', icon: 'bl-separator', keywords: 'hr fenge', run: () => commands.call(insertHrCommand.key) },
    // { label: '行内公式', hint: '$x$', keywords: 'math latex inline gongshi hangnei', run: insertInlineMath },
    { label: '公式块', hint: '$$', keywords: 'math latex block gongshi', run: insertMath },
    { label: '图片', icon: 'bl-image--line', keywords: 'image picture tupian', run: requestImage }
  ]
}

/**
 * 创建 PluginSpec：view 负责菜单渲染与定位，handleKeyDown 负责键盘导航
 */
const createSlashSpec = (ctx: any) => {
  let menuEl: HTMLElement | null = null
  let provider: SlashProvider | null = null
  let items: SlashItem[] = []
  let filtered: SlashItem[] = []
  let activeIndex = 0
  let editorView: any = null

  const isOpen = () => menuEl?.dataset.show === 'true'

  /** 重新渲染列表 */
  const render = () => {
    if (!menuEl) return
    menuEl.innerHTML = ''
    if (filtered.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'bl-slash-empty'
      empty.textContent = '没有匹配的命令'
      menuEl.appendChild(empty)
      return
    }
    filtered.forEach((item, index) => {
      const row = document.createElement('div')
      row.className = `bl-slash-item${index === activeIndex ? ' is-active' : ''}`

      const icon = document.createElement('span')
      icon.className = item.icon ? `iconbl ${item.icon}` : 'bl-slash-icon-text'
      if (!item.icon) icon.textContent = item.hint ?? '•'

      const label = document.createElement('span')
      label.className = 'bl-slash-label'
      label.textContent = item.label

      row.appendChild(icon)
      row.appendChild(label)
      if (item.hint && item.icon) {
        const hint = document.createElement('span')
        hint.className = 'bl-slash-hint'
        hint.textContent = item.hint
        row.appendChild(hint)
      }

      row.addEventListener('mousedown', (e) => e.preventDefault())
      row.addEventListener('click', (e) => {
        e.preventDefault()
        activeIndex = index
        execute()
      })

      menuEl!.appendChild(row)
    })
  }

  /** 根据输入内容过滤 */
  const refreshFilter = () => {
    if (!provider || !editorView) return
    const content = provider.getContent(editorView, (node: any) => node.isTextblock) ?? ''
    const matched = /(?:^|\s)\/([^\s/]*)$/.exec(content)
    const query = (matched?.[1] ?? '').toLowerCase()

    items = createItems(ctx, editorView)
    filtered = query ? items.filter((x) => x.label.toLowerCase().includes(query) || x.keywords.includes(query)) : items
    if (activeIndex >= filtered.length) activeIndex = 0
    render()
  }

  /** 删除 `/查询词` 并执行命令 */
  const execute = () => {
    const item = filtered[activeIndex]
    if (!item || !editorView) return

    const { state } = editorView
    const { $from } = state.selection
    const text = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
    const slashIndex = text.lastIndexOf('/')

    provider?.hide()

    if (slashIndex >= 0) {
      const from = $from.start() + slashIndex
      editorView.dispatch(state.tr.delete(from, state.selection.from))
    }
    // 让 ProseMirror 先处理完删除事务，再执行命令，避免位置错乱
    setTimeout(() => item.run(), 0)
  }

  return {
    view: (view: any) => {
      editorView = view
      menuEl = document.createElement('div')
      menuEl.className = 'bl-slash-menu'
      /*
       * ⚠️ 必须自己初始化 `data-show="false"`。
       *
       * `SlashProvider` 只在 `hide()` 里写这个属性，构造时不会写；而它的
       * `#onUpdate` 是「先挂载元素，再看 shouldShow」的顺序，一旦第一次 update
       * 恰好是「文档与选区都没变」的空更新，它会在挂载之后直接 return，
       * 于是这个空的 `.bl-slash-menu` 就以「显示」状态留在页面上，
       * 直到用户点一下编辑器才被 hide() 收掉 —— 也就是「打开文章时冒出一个空菜单」。
       */
      menuEl.dataset.show = 'false'

      provider = new SlashProvider({
        content: menuEl,
        trigger: '/',
        debounce: 60,
        offset: 8,
        // 只有当光标前是 `/查询词` 时才显示，避免正文里的时间 "10/12" 误触发
        shouldShow: (v: any) => {
          if (!v.hasFocus() || !v.editable || !v.state.selection.empty) return false
          const content = provider!.getContent(v, (node: any) => node.isTextblock) ?? ''
          return /(?:^|\s)\/[^\s/]*$/.test(content)
        }
      })
      provider.onShow = () => {
        activeIndex = 0
        refreshFilter()
      }

      return {
        update: (v: any, prevState: any) => {
          provider!.update(v, prevState)
          if (isOpen()) refreshFilter()
        },
        destroy: () => {
          provider?.destroy()
          menuEl?.remove()
        }
      }
    },
    props: {
      handleKeyDown: (_view: any, event: KeyboardEvent) => {
        if (!isOpen() || filtered.length === 0) return false
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          activeIndex = (activeIndex + 1) % filtered.length
          render()
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          activeIndex = (activeIndex - 1 + filtered.length) % filtered.length
          render()
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          execute()
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          provider?.hide()
          return true
        }
        return false
      }
    }
  }
}

/** 交给 `.config()` 的配置函数 */
export const configureSlash = (ctx: any) => {
  ctx.set(slash.key, createSlashSpec(ctx) as any)
}

/** 插件集合 */
export const slashPlugins = [slash].flat() as unknown as MilkdownPlugin[]
