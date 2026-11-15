# Milkdown 所见即所得编辑器

本目录是 Blossom Local 文章编辑器的内核，用 [Milkdown 7](https://milkdown.dev/) 替换了原来的「CodeMirror6 + marked 双屏预览」方案。

页面层（`ArticleIndex.vue`）只依赖 `editor.ts` 中 `WysiwygEditor` 暴露的方法与自定义事件，**不直接接触** milkdown / ProseMirror 的任何 API。

```
milkdown/
├── editor.ts              # 编辑器封装（唯一对外入口）：创建、读写 markdown、命令、目录
├── commands.ts            # 工具栏/快捷键命令集合（含 milkdown 未提供的手写事务）
├── constants.ts           # 编辑器内部与 Vue 层通信的自定义事件名
└── plugins/
    ├── table.ts           # 官方 table-block 的图标配置（增删行列 / 对齐 / 拖拽）
    ├── code-block.ts      # 官方 code-block（CodeMirror）的语言列表、主题、高亮配色
    ├── list-item.ts       # 官方 list-item-block 的标签 / 复选框图标
    ├── math.ts            # LaTeX 公式（remark-math + katex + 自定义 NodeView）
    ├── sup-sub.ts         # 上标 <sup> / 下标 <sub>（自定义 mark + remark 转换）
    ├── block-marker.ts    # 彩色引用 ##green##、容器表格 ##container## 的视觉装饰
    ├── code-languages.ts  # 工具栏下拉用的语言候选
    ├── font-color.ts      # 文字颜色（<font color>）
    ├── html-pair.ts       # 行内 HTML 配对工具（sup/sub、u、font 共用）
    ├── image.ts           # 图片 NodeView（协议转换、alt 样式标记、尺寸预留、编辑按钮）
    ├── drag-guard.ts      # 禁止在编辑器内拖动文字 / 图片
    ├── empty-block-drag.ts # 从空段落按下拖动时自己扩展选区（浏览器原生不支持）
    ├── link.ts            # 链接点击拦截（单击移光标 / Ctrl+单击打开）+ `[文字](地址)` 输入规则
    ├── link-edit.ts       # 链接输入浮层（官方 LinkEditTooltip 的等价实现）
    ├── search.ts          # 正文查找（Ctrl+F）的命中高亮装饰
    ├── slash.ts           # 输入 "/" 唤起的命令菜单
    └── selection-tooltip.ts # 选中文字后的浮动工具条（颜色 + 格式 + 设为链接）
```

样式分两层：

| 文件 | 作用 |
| ---- | ---- |
| `../../styles/bl-milkdown-official.css` | 从 **Crepe 主题** 原样搬运的表格 / 列表 / 代码块样式（组件本身不带样式） |
| `../../styles/bl-milkdown.css` | 本项目特有的部分：容器、公式、图片、斜杠菜单、浮动工具条，以及覆盖旧 `bl-preview.css` 的少量规则 |

## 一、数据流

```
打开文章
  ArticleIndex.clickCurDoc()
    -> articleInfoApi()                      主进程读 .md
    -> wysiwyg.setMarkdown(markdown)         replaceAll(flush) 重建 EditorState
       └─ remark 解析 -> ProseMirror 文档 -> 渲染

编辑内容
  ProseMirror 事务
    -> listener.updated() -> onChange()      只通知「变了」，不做序列化
    -> 防抖 refreshViewData()
         -> wysiwyg.getMarkdown()            序列化（同时做 URL 归一化）
         -> 目录 / 源码分屏 / 图片列表 / 字数

保存
  Ctrl/Cmd + S（ArticleIndex.vue 的 document 捕获阶段监听，焦点在 CodeMirror 代码块内也生效）
    -> saveCurArticleContent()
    -> wysiwyg.getMarkdown() -> save-article-content IPC -> 写 .md
    -> 主进程 DocLibStatsManager.updateM2P_P2M_M2M() 重新解析引用关系
```

**关键点**：保存到磁盘的永远是标准 markdown，与旧版完全一致，因此主进程的
`docLibStatsManager`（文章↔文章、文章↔图片引用解析）、双链引用图表都不需要为
milkdown 迁移改动。

⚠️ `getMarkdown()` 在序列化失败时返回 **`null`**（不是空串）：保存流程会判空并跳过写盘，
否则一次序列化异常就能把整篇文章写成空文件。调用方一律当可空处理。

另：引用解析与右侧目录图片列表都会忽略代码块 / 行内代码里的 `![...]()`、`[...]()`，
它们只是示例文本。代码区识别在两端**各放一份逐行相同的副本**
（`src/main/doclib/markdownCode.ts` 与 `scripts/article.ts` 中的 `buildCodeMask`），
按项目惯例不建跨 main/renderer 的共享模块，修改时记得两处同步。

## 二、表格 / 代码块 / 列表：直接用官方组件，不引入 Crepe

官方 playground 上那些「表格悬停加行加列」「代码块语言搜索」「任务列表勾选」
并不是 prosemirror 自带的能力，而是 `@milkdown/components` 里的一组组件，
Crepe 只是把它们组装起来。

本项目**不引入 Crepe**（它还会带来自带的工具栏、图片块、顶部栏等一整套 UI，
与现有页面重复），只单独接入这三个组件：

| 功能 | 接入的插件 | 得到的能力 |
| ---- | ---- | ---- |
| 表格 | `@milkdown/kit/component/table-block` 的 `tableBlock` | 悬停单元格出拖拽手柄、行列之间出「+」、对齐/删除行列、整行整列拖动 |
| 链接 | `@milkdown/kit/component/link-tooltip` 的 `linkTooltipPlugin` | 悬停链接弹出预览（复制 / 编辑 / 删除）；选中文字后由工具栏在选区上方弹出地址输入框 |
| 代码块 | `@milkdown/kit/component/code-block` 的 `codeBlockComponent` | 内部是 CodeMirror：光标/选区/缩进都正常，空代码块也能点进去；语言搜索、复制、语法高亮 |
| 列表 | `@milkdown/kit/component/list-item-block` 的 `listItemBlockComponent` | 圆点/序号/复选框由组件渲染，任务列表可以直接点击切换 |

### 为什么样式要单独搬一份

`@milkdown/components` **只提供结构，不带任何 CSS**。官方观感来自
`@milkdown/crepe` 的 `theme/common/*.css`。为了不引入整个 Crepe 包，
`bl-milkdown-official.css` 把 `table.css` / `list-item.css` / `code-mirror.css`
三段原样搬过来，只改了两处：

1. 选择器前缀 `.milkdown` → `.bl-milkdown`
2. `--crepe-*` 设计变量映射到项目主题变量（`--el-*` / `--bl-*`），明暗主题自动跟随

升级 milkdown 时，对比 `node_modules/@milkdown/crepe/lib/theme/common/*.css` 同步即可。

### 之前那些 bug 的根因

| 现象 | 根因 |
| ---- | ---- |
| 空代码块点不进去、光标看不见 | 旧实现用 `<pre>` + `Decoration.widget` 在代码块内部塞了一个 `contenteditable=false` 的按钮条，光标落点被它挡住；而且 `<pre>` 是深底、光标却继承主题黑色 |
| 代码块不能选语言 | 语言选择是自绘的角标 + 下拉，与编辑器焦点抢夺，且没有真正的语法高亮（hljs 装饰只是染色） |
| 表格不能加行列 | prosemirror-tables 只提供命令，不提供 UI；需要 table-block 组件 |
| 任务列表点不动 | GFM 只给 `list_item` 加了 `checked` 属性，**没有渲染任何复选框 DOM**，需要 list-item-block 组件 |
| 黏贴代码后内容跑到代码块外 | 右键「黏贴」走的是 markdown 解析插入，而不是原生 paste；现已改为派发原生 `paste` 事件（`WysiwygEditor.pasteText`） |

## 三、必须自己实现的部分

| 需求 | 官方方案 | 本项目做法 | 原因 |
| ---- | ---- | ---- | ---- |
| LaTeX 公式 | `@milkdown/plugin-math` | 自研 `plugins/math.ts` | 官方包停留在 7.5.x，与 7.23 的 ctx API 不兼容 |
| 上标/下标 | 无 | 自研 `plugins/sup-sub.ts` | 历史文章用行内 HTML `<sup>`，需保证存回时格式不变 |
| 彩色引用 | 无 | `plugins/block-marker.ts` + Decoration | 不修改文档内容，只把 `##green##` 视觉隐藏并给 blockquote 加 class |
| 文字颜色 | 无 | `plugins/font-color.ts` | 继续使用 `<font color>`，兼容历史文章与只读预览窗口 |
| 图片协议 | 无 | `plugins/image.ts` 的 NodeView | `src` 属性保持相对路径，只在渲染时转成 `blossom:` 协议 |

### 为什么彩色引用用 Decoration 而不是改 schema

`##green##` 是 Blossom 自己发明的语法。如果用「自定义 blockquote schema + attr」实现，
序列化时需要把 attr 再写回文本，一旦漏掉就会破坏文件；而且覆盖内置 schema 风险很高。
Decoration 只影响渲染，文档模型里仍然是那段文本，**存回去必然一致**，是最稳的做法。

### 上标/下标的两条链路

1. 解析：`html(<sup>) + text + html(</sup>)` 三个兄弟节点合并成 mdast `{type:'sup'}`
2. 序列化：通过 unified 的 `toMarkdownExtensions` 注册 handler，把 `sup` 节点写回 `<sup>...</sup>`

## 四、与 Vue 层的通信

编辑器内部（NodeView / ProseMirror 插件）通过**自定义 DOM 事件**通知页面，事件名集中在 `constants.ts`：

| 事件 | 触发时机 | 页面处理 |
| ---- | ---- | ---- |
| `bl-editor-request` | Alt+M / Alt+K | 打开选图弹窗 / 弹出链接输入框 |
| `bl-link-click` | **Ctrl / Cmd + 单击**链接 | 外部链接用浏览器打开；内部链接弹出文章预览浮层（普通单击只是移动光标，不发事件） |
| `bl-image-click` | 点击图片右上角的「编辑」按钮 | 弹出图片设置面板（宽度 / 阴影），面板位置跟随图片滚动 |
| `bl-math-edit` | 双击公式 | 弹出公式编辑对话框，回调里写回节点 |

## 五、如何扩展

**新增一个工具栏命令**

1. 在 `commands.ts` 的 `EditorCommandName` 里加名字，并在 `runCommand` 的 switch 中实现
2. `EditorTools.vue` 增加按钮并 `emits('command', 'xxx')`

**新增一种 markdown 语法**

参考 `plugins/sup-sub.ts`：`$remark` 处理解析/序列化 → `$markSchema` 或 `$nodeSchema` 描述结构
→ 需要自定义渲染时再加 `$view`。最后把插件数组加进 `editor.ts` 的 `.use()` 链。

**新增一个需要 UI 的插件**（如 slash 菜单）

用 `xxxFactory()` 拿到 spec ctx，写一个 `configureXxx(ctx)` 函数，在 `editor.ts` 里
`.use(xxxPlugins).config(configureXxx)`。

**⚠️ 命令的 `.key` 必须在点击时读取**

`$command()` 返回的对象在**模块加载时还没有 `key`**，它是在插件执行（`editor.create()`）时才挂上去的：

```ts
const plugin = (ctx) => async () => {
  plugin.key = cmdKey   // ← 创建编辑器之后才有值
  ...
}
```

所以不要把 `.key` 提前存进模块级常量，否则点击时会抛
`Cannot read properties of undefined (reading 'id')`（Commands 容器查表时读 `slice.id`）。
`selection-tooltip.ts` 的 `FORMAT_BUTTONS` 直接存 `$command` 对象、点击时再取 `command.key`，
`slash.ts` 也是在 `run: () => commands.call(xxx.key)` 里现取。

## 六、编辑器的交互约定

| 操作 | 行为 |
| ---- | ---- |
| 单击链接 | 外部链接：只是把光标放进链接，**不跳转**（可以直接接着编辑文字）；内部文章链接：打开应用内的引用预览（引用浮层的「新窗口打开」会打开 `ArticleViewWindow`） |
| Ctrl / Cmd + 单击外部链接 | 用系统浏览器打开 |
| 点击链接浮层里的地址 | 外部链接 → 系统浏览器；内部文章链接 → 引用预览（不再交给浏览器） |
| 选中文字 → 工具条「设为链接」 | 在选区上方就地弹出输入框，回车即应用 |
| Alt+K | 光标已在链接里 → 进入编辑态；否则在选区上方弹出空输入框 |
| 输入 `[文字](地址 "标题")` | 输入到右括号时自动转成真正的链接 |
| 悬停链接 | 弹出官方链接浮层：点 🔗 复制地址、点 ✎ 就地编辑（输入框替换浮层）、点 ✕ 移除链接 |
| 单击图片 | 只选中图片（不弹面板），右上角浮现「编辑」按钮；不会弹出文字格式工具条 |
| 点击图片「编辑」按钮 | 弹出图片设置面板，可改宽度（px / %）与阴影，实时写回 alt |
| Ctrl/Cmd + F | 打开正文查找框，命中项高亮，Enter / Shift+Enter 切换，Esc 关闭 |
| 工具栏「回到顶部 / 前往底部」 | 平滑滚到 0 / 正文末尾（底部会留 40px，不翻出那 40vh 书写余量） |
| 切换文章 | 记住每篇文章各自的滚动位置（本次运行有效），下次打开原位恢复；本次没打开过的从顶部开始 |
| 点击右侧目录 | 只滚动编辑区容器，标题落在顶部下方 12px；不会滚出正文底部 40vh 的书写余量（不会出现一大片空白），也不会滚动任何祖先元素 |
| Alt + 1 | 收起 / 展开左侧文档列表 |
| 双击公式 | 打开 LaTeX 编辑弹窗，实时预览 |
| 输入 `/` | 弹出斜杠命令菜单（含「行内公式」「公式块」），↑↓ 选择、回车执行 |
| 输入 `$x^2$` | 自动转成行内公式（`plugins/math.ts` 的 input rule），双击可编辑 |
| 表格内选中文字 | 正常显示格式工具条；只有拖选整行 / 整列（CellSelection）时隐藏，避免与表格的对齐工具条重叠 |
| 选中文字 | 出现两行浮动工具条：第一行预设颜色（直接点，另有「清除」），第二行加粗 / 斜体 / 删除线 / 行内代码 / 设为链接；已生效的格式会高亮 |
| 拖拽正文（选中的文字 / 图片） | 已禁用，拖不起来（选字时手一抖不会把整段搬走）；代码块里的代码同样拖不出去；表格的行 / 列手柄仍可拖动 |
| 拖入或黏贴图片 | 自动上传到文档库并插入 `![](文件名)` |
| Ctrl/Cmd + S | 保存；绑定在 document 捕获阶段，光标在代码块（CodeMirror）、查找框等任意位置都能触发 |
| 右键 → 复制 | 与 Ctrl+C 相同（浏览器原生 copy，含 text/html） |
| 右键 → 黏贴 | 与 Ctrl+V 相同（派发原生 paste 事件） |

## 七、图片宽度与阴影的存储格式

沿用旧版 marked 的约定，写在 markdown 图片的 **alt** 里：

```md
![照片A##shadow##w120](a.png)     <!-- 加阴影、宽 120px -->
![图表##w50%](b.png)              <!-- 宽 50% -->
```

`plugins/image.ts` 的 `parseImageAlt` 负责解析，页面上的图片面板只修改 `alt`，
不改变 `src`，因此引用关系解析（`docLibStatsManager`）完全不受影响。

## 八、链接：全部就地编辑，不再弹对话框

链接相关的 UI 只有一个「输入框浮层」，三种入口共用它：

| 入口 | 走到的 API | 行为 |
| ---- | ---- | ---- |
| 选中文字 → 工具条「设为链接」 | `linkTooltipAPI.addLink(from, to)` | 输入框为空，回车把选区变成链接 |
| 悬停链接 → ✎ | `linkTooltipAPI.editLink(mark, from, to)` | 输入框预填原地址，回车改地址 |
| Alt+K | `WysiwygEditor.openLinkTooltip()` | 在链接里 = 编辑，否则 = 新增 |

官方 `@milkdown/kit/component/link-tooltip` 自带这个浮层，但有三处不合适，
所以 `plugins/link-edit.ts` 照着它的 `LinkEditTooltip` 重写了一份
（同样的 `{ from, to, mark }` 数据、同样的 `removeMark + addMark` 事务、
同样的「地址为空 = 移除链接」、同样通过 `linkTooltipState.mode` 让预览浮层让位）：

| 官方实现 | 本项目 |
| ---- | ---- |
| Vue 子应用（`createApp`）渲染 | 原生 DOM，与 `selection-tooltip.ts` 风格一致 |
| 确认时 `type.create({ href })`，**丢掉 title** | 重建时带上原 `title`，`[文字](地址 "标题")` 编辑后提示不丢 |
| 打开编辑前 `setSelection(from, to)` 选中整个链接 | **不碰选区**：不会把链接整段选蓝，也不会把格式工具条顶出来 |

`selection-tooltip.ts` 另外导出了 `hideSelectionTooltip()`：编辑浮层打开时主动收起
格式工具条 —— TooltipProvider 的 update 在「文档与选区都没变」时会直接返回，
这种场景等不到下一次 update，必须显式收。

预览浮层的 🔗 / ✎ / ✕ 与 `linkTooltipState` 的 `preview` / `edit` 语义都还是官方的；
`editor.ts` 只是把 `configureLinkTooltip` 的文案换成中文，然后接上自己的编辑浮层。

`toggleLinkCommand` 用的是组件包里的那个（命令名同为 `ToggleLink`，但 key 不同，
与 preset-commonmark 的同名命令互不影响）。

## 九、为什么打开长文章会「抖」以及怎么处理

`replaceAll(md, true)` 会重建 EditorState（清空撤销历史，避免把上一篇的撤销记录带过来），
整篇文档的 DOM 会在一次更新里重建。真正让人感觉「文章被重新渲染」的是随后陆续发生的布局变化：

| 来源 | 处理 |
| ---- | ---- |
| 图片陆续加载，从 0 高度变成图片高度，把下方正文整体顶下去 | 图片 NodeView 在渲染前用 `primeImageSizes()` 预加载固有尺寸，并写成 `<img width height>` 属性；浏览器据此在解码前按比例占位。注意 CSS 必须同时写 `height: auto`，否则属性里的高度会变成固定高度，宽度被压缩时图片就被纵向拉长 |
| 图片加载失败的虚线占位框（min-width/min-height）先撑开再收缩 | 失败时只显示一行错误文字，不再撑高 |
| `loading="lazy"` 在自定义滚动容器里滚动时才触发 | 去掉懒加载（本地图片很快），避免滚动过程中一段段重排 |
| 打开文章后同步执行 `getMarkdown()`（长文档几百毫秒）阻塞首帧 | `setNewState` 把 `refreshViewData()` 放到下一帧，正文先画出来再算目录 / 源码 |

## 十、已知限制

- 公式以 `atom` 节点呈现，双击才能编辑源码（不是「原地输入 LaTeX」）
- 代码块只显示代码本身，`mermaid` / `markmap` 不再在编辑器内绘图（可在只读预览窗口查看）
- 表格序列化时 `remark-stringify` 会对齐列宽，保存后源码的表格排版会被规范化
- 源码分屏是只读的，避免「两处同时编辑」导致内容覆盖
- 黏贴外部富文本时**不会**保留对方文字颜色（只认 `<font color>`），避免正文被塞满 `<font>` 标签
- 公式块目前没有 `$$` 的输入规则，用斜杠菜单插入（行内公式支持 `$...$` 直接输入）
- 正文查找只在**单个文本节点**内匹配，跨加粗 / 链接边界的关键字不会命中（与浏览器查找的降级行为类似）
- 初次打开某张从未加载过的图片时仍可能有几十像素的位移（拿不到固有尺寸），再次打开即无
- 链接只能用输入框改**地址**；链接文字直接在正文里编辑（不再有「文本 / 地址 / 标题」三栏表单）

## 十一、相关设置项（设置 - 编辑器）

| 设置项 | 对应 CSS 变量 | 说明 |
| ---- | ---- | ---- |
| 编辑器字体 / 字体大小 | 内联样式 | 绑定在 `.editor-body`，由 `editorFontStyle` 计算属性下发（直接从 store 读，避免解构失去响应式）。注意 `main.css` 里有全局 `* { font-family }`，所以 `.editor-main` / `.milkdown` / `.bl-milkdown` 都显式写了 `font-family: inherit`，否则继承链会被全局规则截断 |
| 编辑器左右边距 | `--bl-editor-padding-x` | `.bl-milkdown` 的左右 padding |
| 正文背景颜色（日间 / 夜间） | `--bl-editor-content-bg` | 两套主题变量分别保存；背景画在滚动容器 `.editor-wysiwyg` 上，代码块跟随 |
| 编辑器内容行高 | `--bl-editor-line-height` | 段落行高 |
| — | `overflow-anchor: none` | 关闭浏览器滚动锚定，见下方「为什么关掉滚动锚定」 |
| 代码块字体大小 | `--bl-code-font-size` | 多行代码块（CodeMirror）的字号，见 `plugins/code-block.ts` 的主题与 `bl-milkdown.css` 第 3 节 |
| 编辑器内阴影 | `--bl-editor-box-shadow-inset` | 画在 `.editor-main::after` 覆盖层上，滚动时不会跟着内容跑 |

旧的「显示编辑器左侧边栏」「显示代码块行数」「代码块默认语言」随旧编辑器一起移除。

## 十二、列表样式为何要覆盖官方主题

官方 list-item-block 的尺寸是按 Crepe 的 32px 行高写死的（`.label-wrapper { height: 32px }`），
而本项目正文行高是 `--bl-editor-line-height`（默认 1.6em）。直接沿用时：

- 序号/圆点与文字不在同一条基线上
- 标签颜色取的是 `--crepe-color-outline`（边框色），不是主题色
- 列表项段落多了一层 `div`，`.bl-milkdown li > p { margin: 0 }` 命中不到，
  段落自带的 8px 外边距会把行距撑大一倍

因此 `bl-milkdown.css` 的「4. 列表」小节把标签高度、行高、间距全部改为跟随
`--bl-editor-line-height`，并把标签颜色改为 `--el-color-primary`。

## 十三、为什么关掉滚动锚定（overflow-anchor）

长文章里偶尔会出现「滚动条自己小幅滚动」，实测原因是浏览器的 **scroll anchoring**：
视口上方的内容一旦变高（图片解码出固有尺寸、代码块测量高度、公式渲染完成……），
Chromium 会自动把 `scrollTop` 加上这段高度，以保持眼前内容不动。实测在视口上方插入
215px 内容，`scrollTop` 会自己从 1500 跳到 1715，并触发一次 scroll 事件。

编辑器的正文高度本来就频繁变化，这种「自作主张」的补偿只会让滚动条乱跳，所以
`.editor-wysiwyg` 上设了 `overflow-anchor: none`，滚动位置只由用户和我们的滚动代码决定。
代价是：**没有预留高度的图片**若在视口上方加载完成，下方内容会被推一下；`primeImageSizes`
（打开文章时预载固有尺寸并写进 `<img width height>`）已经把这种情况降到最低。
