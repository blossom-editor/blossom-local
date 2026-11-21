/**
 * ============================================================================
 * Backspace：删除空段落，并选中上方紧邻的原子块
 * ============================================================================
 *
 * ## 现象
 *
 * 选中分割线（hr）按回车，会在下方插入一个空段落；此时再按 Backspace，
 * 只是把选区「退回」到分割线上，空段落却留在原地。
 * 期望：删掉这个空段落，同时保持分割线被选中。
 *
 * ## 根因（milkdown 对基础键位表的改写）
 *
 * `@milkdown/core` 的 `overrideBaseKeymap` 把 Backspace 换成了另一套命令链
 * （见 `node_modules/@milkdown/core/lib/index.js`）：
 *
 * ```js
 * keymap.Backspace = chainCommands(undoInputRule, deleteSelection, joinTextblockBackward, selectNodeBackward)
 * ```
 *
 * 标准实现用的是 `joinBackward`，它里面有一段：
 * 「下面这个块是空的、上面这个节点可以被选中 → 删掉下面的块并选中上面的节点」。
 * milkdown 换成了只负责「文本块合并」的 `joinTextblockBackward`，这段逻辑
 * 就再也走不到；命令链于是落到最后的 `selectNodeBackward`，
 * 只把选区移到分割线上，空段落留着。
 *
 * ## 处理方式
 *
 * 在 milkdown 自己的键位表**之前**（priority 60 > 默认 50）插一条 Backspace：
 * 只在「光标位于空段落最前面 + 上方紧邻可被 NodeSelection 选中的原子块
 * （分割线 / 公式块）」时接管，并直接复用 prosemirror-commands 的 `joinBackward`
 * ——它做的正好就是「删除空块 + 选中上方节点」，不用自己再拼事务和选区。
 *
 * 其余所有情况返回 false，完全走原来的命令链，所以：
 *
 * - 文本块之间的合并、列表 / 引用 / 表格 / 代码块里的退格都不变
 * - 只有「空段落紧跟分割线 / 公式块」这一种场景会多删掉那个空段落
 * - 空段落上方是段落之类的文本块时不接管（不是本次要改的行为）
 */

import { $useKeymap } from '@milkdown/kit/utils'
import { joinBackward } from '@milkdown/kit/prose/commands'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'
import { NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

/**
 * 「空段落上方是可被选中的原子块」时，删除这个空段落并选中上方节点
 *
 * @param state    ProseMirror 的 EditorState
 * @param dispatch 事务派发函数（只探测可用性时为空）
 * @param view     ProseMirror 的 EditorView
 * @returns 是否已处理
 */
const deleteEmptyBlockBelowAtom = (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean => {
  const { selection } = state
  // 只处理「空选区 + 光标在空文本块最前面」：其余位置交给原有命令链
  if (!(selection instanceof TextSelection)) return false
  const $cursor = selection.$cursor
  if (!$cursor || !$cursor.parent.isTextblock) return false
  if ($cursor.parent.content.size > 0 || $cursor.parentOffset > 0) return false

  // 上方紧邻的兄弟节点必须是「可被选中的原子块」，避免顺带改掉文本块合并的行为
  const depth = $cursor.depth
  const index = depth > 0 ? $cursor.index(depth - 1) : 0
  if (index <= 0) return false
  const before = $cursor.node(depth - 1).child(index - 1)
  if (!before.isAtom || !NodeSelection.isSelectable(before)) return false

  return joinBackward(state, dispatch, view)
}

/** 键位插件集合（`$useKeymap` 返回的是 [$ctx, $shortcut] 元组，`.use()` 会自动展开） */
export const backspacePlugins = $useKeymap('blBackspaceKeymap', {
  DeleteEmptyBlockBelowAtom: {
    shortcuts: 'Backspace',
    // 必须高于 milkdown 基础键位表的默认优先级 50，否则轮不到这条命令
    priority: 60,
    command: () => deleteEmptyBlockBelowAtom
  }
})
