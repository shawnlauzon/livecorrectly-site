// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@react-email/editor/extensions';
import {
  ContentBlockTrigger,
  CONTENT_BLOCKS_CATEGORY,
  filterSlashItems,
} from '@/app/admin/newsletters/[id]/[number]/content-block-trigger';

const items = [
  { title: 'Heading', description: '', category: 'Text' },
  { title: 'Variable', description: '', category: 'Text' },
  { title: 'If / then', description: '', category: 'Conditionals' },
  { title: 'Newsletter library', description: '', category: CONTENT_BLOCKS_CATEGORY },
];

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

function newEditor() {
  editor = new Editor({
    extensions: [StarterKit.configure({ CodeBlockPrism: false, Link: false }), ContentBlockTrigger],
    content: '<p></p>',
  });
  return editor;
}

/** Type text the way a keyboard does, so input rules run. */
function type(ed: Editor, text: string) {
  for (const ch of text) {
    const { from, to } = ed.state.selection;
    const handled = ed.view.someProp('handleTextInput', f => f(ed.view, from, to, ch, () => ed.state.tr.insertText(ch, from, to)));
    if (!handled) ed.view.dispatch(ed.state.tr.insertText(ch, from, to));
  }
}

const titles = (ed: Editor, query: string) => filterSlashItems(items, query, ed).map(i => i.title);

describe('[[ content block trigger', () => {
  it('turns [[ into the slash trigger', () => {
    const ed = newEditor();
    type(ed, '[[');
    expect(ed.state.doc.textContent).toBe('/');
  });

  it('shows only content blocks for a menu opened by [[', () => {
    const ed = newEditor();
    type(ed, '[[');
    expect(titles(ed, '')).toEqual(['Newsletter library']);
    type(ed, 'lib');
    expect(titles(ed, 'lib')).toEqual(['Newsletter library']);
  });

  it('shows every item for a menu opened by /', () => {
    const ed = newEditor();
    type(ed, '/');
    expect(titles(ed, '')).toEqual(items.map(i => i.title));
  });

  it('goes back to every item once the [[ menu is gone', () => {
    const ed = newEditor();
    type(ed, '[[');
    // Delete the slash, then open a normal slash menu at the same spot
    ed.view.dispatch(ed.state.tr.delete(1, 2));
    type(ed, '/');
    expect(titles(ed, '')).toEqual(items.map(i => i.title));
  });
});
