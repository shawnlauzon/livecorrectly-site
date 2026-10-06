import { Extension, InputRule, type Editor } from '@tiptap/core';
import { filterAndRankItems, isAtMaxColumnsDepth, type SlashCommandItem } from '@react-email/editor/ui';

/** Slash menu category holding the content blocks (see library-block-command.tsx). */
export const CONTENT_BLOCKS_CATEGORY = 'Content blocks';

interface TriggerStorage {
  /** Position of the `/` that `[[` turned into, while that slash menu can still be open. */
  slashPos: number | null;
  /** slashPos is already in the coordinates of the transaction that inserted the slash */
  justInserted: boolean;
}

/**
 * `[[` opens the slash menu limited to content blocks.
 *
 * The library allows only one slash menu (its plugin key is fixed), so `[[` is
 * replaced with `/` — opening the regular menu — and its position remembered.
 * filterSlashItems() then shows only content blocks while the menu belongs to
 * that slash.
 */
export const ContentBlockTrigger = Extension.create<object, TriggerStorage>({
  name: 'contentBlockTrigger',

  addStorage() {
    return { slashPos: null, justInserted: false };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[$/,
        handler: ({ chain, range }) => {
          chain().deleteRange(range).insertContent('/').run();
          this.storage.slashPos = range.from;
          this.storage.justInserted = true;
        },
      }),
    ];
  },

  // Follow the slash through edits; forget it once its menu can no longer be open
  onTransaction({ transaction }) {
    if (this.storage.slashPos === null) return;
    const pos = this.storage.justInserted
      ? this.storage.slashPos
      : transaction.mapping.map(this.storage.slashPos);
    this.storage.justInserted = false;
    this.storage.slashPos = ownsSlashMenu(this.editor, pos) ? pos : null;
  },
});

/** True while the text from `pos` to the cursor is `/` plus a space-free query. */
function ownsSlashMenu(editor: Editor, pos: number): boolean {
  const { doc, selection } = editor.state;
  if (!selection.empty || selection.from <= pos || pos + 1 > doc.content.size) return false;
  const text = doc.textBetween(pos, selection.from, '\n');
  return text.startsWith('/') && !/\s/.test(text);
}

/**
 * SlashCommand `filterItems`: the library's default filtering, limited to
 * content blocks when the menu was opened with `[[`.
 */
export function filterSlashItems<T extends Pick<SlashCommandItem, 'title' | 'description' | 'category'> & { searchTerms?: string[] }>(
  items: T[],
  query: string,
  editor: Editor,
): T[] {
  const storage = editor.storage as unknown as Record<string, TriggerStorage | undefined>;
  const slashPos = storage.contentBlockTrigger?.slashPos ?? null;
  // The menu opened by `[[` is the one whose query starts right after that slash
  const blocksOnly =
    slashPos !== null && editor.state.selection.from === slashPos + 1 + query.length;

  if (blocksOnly) {
    return filterAndRankItems(items.filter(i => i.category === CONTENT_BLOCKS_CATEGORY), query);
  }
  // Same as the library's default filter
  const pool = isAtMaxColumnsDepth(editor)
    ? items.filter(i => i.category !== 'Layout' || !i.title.includes('column'))
    : items;
  return filterAndRankItems(pool, query);
}
