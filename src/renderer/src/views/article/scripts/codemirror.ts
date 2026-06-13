import { useConfigStore } from '@renderer/stores/config'
import { EditorState } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { ViewUpdate, keymap, BlockInfo } from '@codemirror/view'
import { insertTab, indentLess } from '@codemirror/commands'
import { markdown as cmmd } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorSelection, SelectionRange } from '@codemirror/state'
import { search } from '@codemirror/search'

import * as prettier from 'prettier/standalone'
import pluginMarkdown from 'prettier/plugins/markdown'

import { isBlank } from '@renderer/assets/utils/obj'

const { editorStyle } = useConfigStore()

/**
 * codemirror 样式配置
 * https://codemirror.net/examples/styling/#themes
 */
export const cwTheme: any = {
  '&': {
    color: 'var(--bl-editor-color)',
    backgroundColor: 'var(--bl-editor-bg-color)',
    fontSize: '14px'
  },
  '.cm-panels': {
    backgroundColor: 'var(--bl-editor-gutters-bg-color)',
    color: 'var(--el-color-primary)'
  },
  '.cm-panel.cm-search [name=close]': {
    fontSize: '20px !important',
    marginRight: '10px',
    color: 'var(--el-color-primary)'
  },
  '.cm-panels-top': {
    'z-index': '999',
    borderColor: 'var(--el-border-color)'
  },
  '.cm-panels-bottom': {
    borderColor: 'var(--el-border-color)'
  },
  '.cm-textfield': {
    backgroundColor: 'var(--bl-editor-bg-color)',
    border: '1px solid var(--el-border-color)',
    outline: 'none'
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--bl-editor-bg-color)',
    border: '1px solid var(--el-border-color)'
  },
  '.cm-button::active': {
    backgroundColor: 'var(--bl-text-bg-color)'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bl-editor-gutters-bg-color)',
    borderColor: 'var(--bl-editor-gutters-border-color)',
    color: 'var(--bl-editor-gutters-color)',
    fontSize: '12px',
    width: '50px',
    minWidth: '50px',
    maxWidth: '50px'
  },
  '.cm-gutterElement': {
    fontSize: '13px !important'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--bl-editor-gutters-bg-color)',
    color: 'var(--el-color-primary)'
  },
  '.cm-lineNumbers': {
    width: '40px'
  },
  '.cm-scroller': {
    // overflow: 'scroll',
    outline: 'none'
  },
  '.cm-foldGutter': {
    // paddingRight: '3px'
  },
  '.cm-content': {
    whiteSpace: 'break-spaces',
    wordWrap: 'break-word',
    // overflow: 'auto',
    width: 'calc(100% - 55px)',
    padding: '0',
    caretColor: '#707070'
  },
  '.cm-line': {
    // color: '#707070'
    // caretColor: 'var(--bl-editor-caret-color) !important',
    wordWrap: 'break-word',
    wordBreak: 'break-all',
    padding: '0'
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--bl-editor-active-line-gutter-bg-color)'
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--bl-editor-selection-match-bg-color)'
  },
  '.ͼ1.cm-focused': {
    outline: 'none'
  },
  '.ͼ2 .cm-activeLine': {
    backgroundColor: 'var(--bl-editor-active-line-gutter-bg-color)'
  },
  '.ͼ5': {
    // color: 'var(--bl-editor-c5-color)',
    color: 'var(--el-color-primary)',
    fontWeight: '700'
  },
  '.ͼ6': {
    color: '#707070',
    fontWeight: '500'
  },
  '.ͼ7': {
    backgroundColor: 'var(--bl-editor-c7-bg-color)',
    // color: 'var(--bl-editor-c7-color)'
    // backgroundColor: 'var(--el-color-primary)',
    color: 'var(--el-color-primary)'
  },
  '.ͼc': {
    color: 'var(--bl-editor-cc-color)'
  },
  // ͼm: 注释   #940
  '.ͼm': {
    color: 'var(--bl-editor-cm-color)'
  },
  // ͼb: 关键字 #708
  '.ͼb': {
    color: 'var(--bl-editor-cb-color)'
  },
  // ͼd: 数字 #708
  '.ͼd': {
    color: 'var(--bl-editor-cd-color)'
  },
  // ͼe: 字符串 #a11
  '.ͼe': {
    color: 'var(--bl-editor-ce-color)'
  },
  //ͼi: 类名:
  '.ͼi': {
    color: 'var(--bl-editor-ci-color)'
  },
  //ͼg: 方法名和参数
  '.ͼg': {
    color: 'var(--bl-editor-cg-color)'
  }
}

const zhCNPhrases = {
  'Fold line': '折叠',
  'Unfold line': '展开',
  'Go to line': '前往行',
  go: '前往',
  Find: '查找内容',
  Replace: '替换内容',
  next: '下一个',
  previous: '上一个',
  all: '全部',
  'match case': '区分大小写',
  'by word': '全字匹配',
  replace: '替换',
  'replace all': '替换全部',
  close: 'schließen',
  regexp: '使用正则表达式'
}

/**
 * Codemirror 封装
 */
export class CmWrapper {
  /**
   * editor
   */
  private _editor: EditorView

  constructor(editor: EditorView) {
    this._editor = editor
  }

  /**
   * 获取编辑器，不建议直接使用该对象，而是对使用到的方法进行封装
   */
  get editor(): EditorView {
    return this._editor
  }

  /**
   * 创建 EditorState
   *
   * @param updateCallback 编辑器内容变动时的回调
   * @param saveCallback 保存内容时的回调
   * @param uploadFileCallback 拖拽上传文件后的会调
   * @param doc 初始化的内容
   * @returns
   */
  static newState = (updateCallback: any, saveCallback: any, uploadFileCallback: any, doc?: string): EditorState => {
    return EditorState.create({
      doc: doc,
      extensions: [
        EditorState.phrases.of(zhCNPhrases),
        basicSetup,
        search({ top: true }),
        cmmd({ codeLanguages: languages }),
        EditorView.theme(cwTheme),
        keymap.of([
          { key: 'Tab', run: insertTab },
          { key: 'Shift-Tab', run: indentLess },
          {
            key: 'Ctrl-s',
            mac: 'Cmd-s',
            run(_view: EditorView) {
              saveCallback()
              return true
            }
          },
          {
            key: 'Alt-b',
            mac: 'Cmd-b',
            run(view: EditorView) {
              CmWrapper.commandBold(view)
              return true
            }
          },
          {
            key: 'Alt-i',
            mac: 'Cmd-Alt-b',
            run(view: EditorView) {
              CmWrapper.commandItalic(view)
              return true
            }
          },
          {
            key: 'Alt-s',
            mac: 'Alt-s',
            run(view: EditorView) {
              CmWrapper.commandStrike(view)
              return true
            }
          },
          {
            key: 'Alt-t',
            mac: 'Cmd-t',
            run(view: EditorView) {
              CmWrapper.commandTable(view)
              return true
            }
          },
          {
            key: 'Alt-e',
            mac: 'Cmd-e',
            run(view: EditorView) {
              CmWrapper.commandCode(view)
              return true
            }
          },
          {
            key: 'Alt-m',
            mac: 'Cmd-m',
            run(view: EditorView) {
              CmWrapper.commandImg(view)
              return true
            }
          },
          {
            key: 'Alt-k',
            mac: 'Cmd-k',
            run(view: EditorView) {
              CmWrapper.commandLink(view)
              return true
            }
          },
          // { key: 'Ctrl-Alt-c', mac: 'Ctrl-Cmd-c', run(view: EditorView) { CmWrapper.commandCheckBox(view); return true } },
          {
            key: 'Ctrl-Alt-p',
            mac: 'Ctrl-Cmd-p',
            run(view: EditorView) {
              CmWrapper.commandSup(view)
              return true
            }
          },
          {
            key: 'Ctrl-Alt-b',
            mac: 'Ctrl-Cmd-b',
            run(view: EditorView) {
              CmWrapper.commandSub(view)
              return true
            }
          },
          {
            key: 'Ctrl-Alt-e',
            mac: 'Ctrl-Cmd-e',
            run(view: EditorView) {
              CmWrapper.commandPre(view)
              return true
            }
          },
          {
            key: 'Ctrl-Alt-s',
            mac: 'Ctrl-Cmd-s',
            run(view: EditorView) {
              CmWrapper.commandSeparator(view)
              return true
            }
          },
          {
            key: 'Shift-Alt-f',
            mac: 'Shift-Alt-f',
            run(view: EditorView) {
              CmWrapper.commandFormatMarkdown(view)
              return true
            }
          }
        ]),
        EditorView.updateListener.of((viewUpd: ViewUpdate) => {
          if (viewUpd.docChanged) {
            updateCallback()
          }
        }),
        EditorView.domEventHandlers({
          drop(event: DragEvent) {
            uploadFileCallback(event)
            return
          },
          paste(event: ClipboardEvent) {
            uploadFileCallback(event)
            return
          }
        })
      ]
    })
  }
  /**
   *
   * @param state
   * @param parent
   * @returns
   */
  static newEditor = (state: EditorState, parent: Element | DocumentFragment): EditorView => {
    return new EditorView({
      state: state,
      parent: parent
    })
  }
  /**
   * 设置变成
   * @param state
   */
  setState = (state: EditorState) => {
    this._editor.setState(state)
    CmWrapper.insert(this._editor, 0, 0, '', 0, 0)
  }

  //#region ============================================================ codemirror 方法封装 ============================================================
  /**
   * 获取指定范围的内容
   * @param editor
   * @param from 开始位置
   * @param to 结束位置
   * @returns 范围内的内容
   */
  static sliceDoc = (editor: EditorView, from?: number, to?: number): string => {
    return editor.state.sliceDoc(from, to)
  }
  /**
   * 获取文档内容
   * @param editor
   * @returns 内容
   */
  static getDocString = (editor: EditorView): string => {
    return editor.state.doc.toString()
  }
  /**
   * 获取文档的最大长度
   * @param editor
   * @returns 长度
   */
  static getDocLength = (editor: EditorView): number => {
    return editor.state.doc.length
  }
  /**
   * 获取当前选中内容, 并返回选中的文本内容, 可以选中多个不同的段落, 多个段落之间会以 \n 换行
   * @param editor
   * @returns 文本内容, 多个选中之间会换行
   */
  static getSelectionRangesText = (editor: EditorView): string => {
    let ranges = editor.state.selection.ranges
    let text = ''
    if (ranges.length > 0) {
      for (let i = 0; i < ranges.length; i++) {
        let range = ranges[i]
        if (range != undefined) {
          let rangeText = editor.state.sliceDoc(range.from, range.to)
          if (isBlank(rangeText)) {
            continue
          }
          if (i != 0) {
            text += '\n'
          }
          text += rangeText
        }
      }
    }
    return text
  }
  /**
   * 获取选中的内容
   * @param editor
   * @returns 存在多个选中所以返回数组
   */
  static getSlelctionRangesArr = (editor: EditorView): readonly SelectionRange[] => {
    return editor.state.selection.ranges
  }
  /**
   * 在指定位置(istFrom -> istTo)插入 content, 或将内容替换为 content, 随后选中 (selectFrom -> selectTo)
   * istFrom 与 istTo 相同即为插入，不同即为替换
   * 如果要将光标移动到某处, selectFrom 与 selectTo 相同即可
   *
   * @param istFrom 插入的开始位置
   * @param istTo 插入的结束位置
   * @param content 插入的内容
   * @param selectFrom 插入内容后, 将光标移动到的开始位置
   * @param selectTo 插入内容后, 将光标移动到的结束位置
   */
  static insert = (editor: EditorView, istFrom: number, istTo: number, content: string, selectFrom: number, selectTo: number) => {
    let changeByRange = {
      /* 创建变更的内容, 可以是个数组, 说明同时修改多个部分 */
      changes: [{ from: istFrom, to: istTo, insert: content }],
      /* 修改之后光标移动到的位置 */
      selection: EditorSelection.create([EditorSelection.range(selectFrom, selectTo)])
    }
    editor.dispatch(changeByRange)
  }
  sliceDoc = (from?: number, to?: number): string => {
    return this._editor.state.sliceDoc(from, to)
  }
  getDocString = (): string => {
    return CmWrapper.getDocString(this._editor)
  }
  getDocLength = (): number => {
    return CmWrapper.getDocLength(this._editor)
  }
  getTotalLine = () => {
    return this.editor.state.doc.lines
  }
  getSelectionRangesText = (): string => {
    return CmWrapper.getSelectionRangesText(this._editor)
  }
  getSlelctionRangesArr = (): readonly SelectionRange[] => {
    return CmWrapper.getSlelctionRangesArr(this._editor)
  }
  getDocumentTop = (): number => {
    return this._editor.documentTop
  }
  getElementAtHeight = (height: number): BlockInfo => {
    return this._editor.elementAtHeight(height)
  }
  getLineBlockAtHeight = (height: number): BlockInfo => {
    return this._editor.lineBlockAtHeight(height)
  }
  insert = (istFrom: number, istTo: number, content: string, selectFrom: number, selectTo: number) => {
    CmWrapper.insert(this._editor, istFrom, istTo, content, selectFrom, selectTo)
  }
  //#endregion
  //#region ============================================================ 自定义命令 ============================================================
  /**
   * 行内格式的替换命令, 用于前后缀相同的格式, 如 `**` / `~~` 等
   *
   * @param editor 编辑器
   * @param range 范围
   * @param target 添加的前后缀字符, 如加粗是 **, 行内代码块是 `
   */
  static replaceInlineCommand = (editor: EditorView, range: SelectionRange, target: string): any => {
    let len = target.length

    const prefixFrom: number = range.from - len
    const prefixTo: number = range.from
    const prefix = this.sliceDoc(editor, prefixFrom, prefixTo)

    const suffixFrom: number = range.to
    const suffixTo: number = range.to + len
    const suffix = this.sliceDoc(editor, suffixFrom, suffixTo)
    // 判断是取消还是添加, 如果被选中的文本前后已经是 target 字符, 则删除前后字符
    if (prefix == target && suffix == target) {
      return {
        changes: [
          { from: prefixFrom, to: prefixTo, insert: '' },
          { from: suffixFrom, to: suffixTo, insert: '' }
        ],
        range: EditorSelection.range(prefixFrom, suffixFrom - len)
      }
    } else {
      return {
        changes: [
          { from: range.from, insert: target },
          { from: range.to, insert: target }
        ],
        range: EditorSelection.range(range.from + len, range.to + len)
      }
    }
  }
  /**
   * 行内格式的替换命令, 用于前后缀不同的格式, 如 `<sup></sup>`等
   *
   * @param editor 编辑器
   * @param range  范围
   * @param prefixTarget 前缀
   * @param suffixTarget 后缀
   * @returns
   */
  static replaceDifInlineCommand = (editor: EditorView, range: SelectionRange, prefixTarget: string, suffixTarget: string): any => {
    let prefixLen = prefixTarget.length
    let suffixLen = suffixTarget.length

    const prefixFrom: number = range.from - prefixLen
    const prefixTo: number = range.from
    const prefix = this.sliceDoc(editor, prefixFrom, prefixTo)

    const suffixFrom: number = range.to
    const suffixTo: number = range.to + suffixLen
    const suffix = this.sliceDoc(editor, suffixFrom, suffixTo)

    // 判断是取消还是添加, 如果被选中的文本前后已经是 target 字符, 则删除前后字符
    if (prefix == prefixTarget && suffix == suffixTarget) {
      return {
        changes: [
          { from: prefixFrom, to: prefixTo, insert: '' },
          { from: suffixFrom, to: suffixTo, insert: '' }
        ],
        range: EditorSelection.range(prefixFrom, range.to - prefixLen)
      }
    } else {
      return {
        changes: [
          { from: range.from, insert: prefixTarget },
          { from: range.to, insert: suffixTarget }
        ],
        range: EditorSelection.range(range.from + prefixLen, range.to + prefixLen)
      }
    }
  }
  /**
   * 将选中内容替换为 content, 如果没有选中, 则在光标位置插入
   * @param editor 编辑器
   * @param content 插入的内容
   */
  static insertBlockCommand = (editor: EditorView, content: string) => editor.dispatch(editor.state.replaceSelection(content))
  /** 选中内容加粗 */
  private static commandBold = (editor: EditorView) =>
    editor.dispatch(editor.state.changeByRange((range: SelectionRange) => this.replaceInlineCommand(editor, range, '**')))
  /** 选中内容斜体 */
  private static commandItalic = (editor: EditorView) =>
    editor.dispatch(editor.state.changeByRange((range: SelectionRange) => this.replaceInlineCommand(editor, range, '*')))
  /** 选中内容增加删除线 */
  private static commandStrike = (editor: EditorView) =>
    editor.dispatch(editor.state.changeByRange((range: SelectionRange) => this.replaceInlineCommand(editor, range, '~~')))
  /** 选择内容设置为行内代码块 */
  private static commandCode = (editor: EditorView) =>
    editor.dispatch(editor.state.changeByRange((range: SelectionRange) => this.replaceInlineCommand(editor, range, '`')))
  /** 选择内容设置为上标 */
  private static commandSup = (editor: EditorView) =>
    editor.dispatch(editor.state.changeByRange((range: SelectionRange) => this.replaceDifInlineCommand(editor, range, '<sup>', '</sup>')))
  /** 选择内容设置为下标 */
  private static commandSub = (editor: EditorView) =>
    editor.dispatch(editor.state.changeByRange((range: SelectionRange) => this.replaceDifInlineCommand(editor, range, '<sub>', '</sub>')))
  /** 在当前位置增加表格 */
  private static commandTable = (editor: EditorView) => this.insertBlockCommand(editor, `\n|||\n|---|---|\n|||\n`)
  /** 在当前位置增加多行代码块 */
  private static commandPre = (editor: EditorView) => this.insertBlockCommand(editor, `\n\`\`\`${editorStyle.defaultPreLanguage}\n\n\`\`\`\n`)
  /** 在当前位置增加单选框 */
  private static commandCheckBox = (editor: EditorView) => this.insertBlockCommand(editor, `\n- [ ] \n`)
  /** 在当前位置增加分割线 */
  private static commandSeparator = (editor: EditorView) => this.insertBlockCommand(editor, `\n---\n`)
  /** 在当前位置增加引用 */
  private static commandQuote = (editor: EditorView) => this.insertBlockCommand(editor, `\n>\n>\n`)
  /** 在当前位置增加引用 black */
  private static commandQuoteBlack = (editor: EditorView) => this.insertBlockCommand(editor, `\n> ##black##\n> ⚫\n`)
  /** 在当前位置增加引用 green */
  private static commandQuoteGreen = (editor: EditorView) => this.insertBlockCommand(editor, `\n> ##green##\n> 🟢\n`)
  /** 在当前位置增加引用 yellow */
  private static commandQuoteYellow = (editor: EditorView) => this.insertBlockCommand(editor, `\n> ##yellow##\n> 🟡\n`)
  /** 在当前位置增加引用 red */
  private static commandQuoteRed = (editor: EditorView) => this.insertBlockCommand(editor, `\n> ##red##\n> 🔴\n`)
  /** 在当前位置增加引用 blue */
  private static commandQuoteBlue = (editor: EditorView) => this.insertBlockCommand(editor, `\n> ##blue##\n> 🔵\n`)
  /** 在当前位置增加引用 */
  private static commandQuotePurple = (editor: EditorView) => this.insertBlockCommand(editor, `\n> ##purple##\n> 🟣\n`)
  /** 在当前位置增加无序列表 */
  private static commandUnordered = (editor: EditorView) => this.insertBlockCommand(editor, `\n- \n`)
  /** 在当前位置增加有序列表 */
  private static commandOrdered = (editor: EditorView) => this.insertBlockCommand(editor, `\n1. \n`)
  /** 在当前位置增加图片 */
  private static commandImg = (editor: EditorView) => this.insertBlockCommand(editor, `\n![]()\n`)
  /** 在当前位置增加链接 */
  private static commandLink = (editor: EditorView) => this.insertBlockCommand(editor, `\n[]()\n`)
  /** 格式化内容, 使用 prettier */
  private static commandFormatMarkdown = (editor: EditorView) => {
    prettier.format(CmWrapper.getDocString(editor), { semi: false, parser: 'markdown', plugins: [pluginMarkdown] }).then((formatContent) => {
      let maxLen = CmWrapper.getDocLength(editor)
      let position = editor.state.selection.main.from
      CmWrapper.insert(editor, 0, maxLen, formatContent, position, position)
    })
  }
  /** 转为大写 */
  private static toUpper = (editor: EditorView) => {
    editor.dispatch(
      editor.state.changeByRange((range: SelectionRange) => {
        let text = this.sliceDoc(editor, range.from, range.to)
        return {
          changes: [{ from: range.from, to: range.to, insert: text.toLocaleUpperCase() }],
          range: EditorSelection.range(range.from, range.to)
        }
      })
    )
  }
  /** 转为小写 */
  private static toLower = (editor: EditorView) => {
    editor.dispatch(
      editor.state.changeByRange((range: SelectionRange) => {
        let text = this.sliceDoc(editor, range.from, range.to)
        return {
          changes: [{ from: range.from, to: range.to, insert: text.toLocaleLowerCase() }],
          range: EditorSelection.range(range.from, range.to)
        }
      })
    )
  }
  // 实例调用
  insertBlockCommand = (content: string) => CmWrapper.insertBlockCommand(this._editor, content)
  commandBold = () => CmWrapper.commandBold(this._editor)
  commandItalic = () => CmWrapper.commandItalic(this._editor)
  commandStrike = () => CmWrapper.commandStrike(this._editor)
  commandCode = () => CmWrapper.commandCode(this._editor)
  commandSup = () => CmWrapper.commandSup(this._editor)
  commandSub = () => CmWrapper.commandSub(this._editor)
  commandTable = () => CmWrapper.commandTable(this._editor)
  commandPre = () => CmWrapper.commandPre(this._editor)
  commandCheckBox = () => CmWrapper.commandCheckBox(this._editor)
  commandSeparator = () => CmWrapper.commandSeparator(this._editor)
  commandQuote = () => CmWrapper.commandQuote(this._editor)
  commandQuoteBlack = () => CmWrapper.commandQuoteBlack(this._editor)
  commandQuoteGreen = () => CmWrapper.commandQuoteGreen(this._editor)
  commandQuoteYellow = () => CmWrapper.commandQuoteYellow(this._editor)
  commandQuoteRed = () => CmWrapper.commandQuoteRed(this._editor)
  commandQuoteBlue = () => CmWrapper.commandQuoteBlue(this._editor)
  commandQuotePurple = () => CmWrapper.commandQuotePurple(this._editor)
  commandUnordered = () => CmWrapper.commandUnordered(this._editor)
  commandOrdered = () => CmWrapper.commandOrdered(this._editor)
  commandImg = () => CmWrapper.commandImg(this._editor)
  commandLink = () => CmWrapper.commandLink(this._editor)
  toUpper = () => CmWrapper.toUpper(this._editor)
  toLower = () => CmWrapper.toLower(this._editor)
  commandFormatMarkdown = async () => CmWrapper.commandFormatMarkdown(this._editor)
  //#endregion
}

// export default CmWrapper
