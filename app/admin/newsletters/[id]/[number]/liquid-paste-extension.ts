import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { transformPastedContent } from './liquid-paste';
import { liquidClipboardContent } from './liquid-copy';

/**
 * LiquidClipboard — copy/cut put the selection on the clipboard as Liquid
 * (see liquid-copy.ts), and pasted `{{ … }}` / `{% … %}` text is converted
 * into Variable and Conditional nodes (see liquid-paste.ts). Together they make
 * copy/paste of chips and conditional blocks work by round-tripping through
 * Liquid. A plain Extension because EmailNode.create does not wire plugin methods.
 */
export const LiquidClipboard = Extension.create({
  name: 'liquidClipboard',
  addProseMirrorPlugins() {
    const { schema } = this.editor;

    const copyAsLiquid = (view: EditorView, event: ClipboardEvent, cut: boolean): boolean => {
      const { selection } = view.state;
      if (selection.empty || !event.clipboardData) return false;

      const { html, text } = liquidClipboardContent(selection.content(), view.state.schema);
      event.preventDefault();
      event.clipboardData.clearData();
      event.clipboardData.setData('text/html', html);
      event.clipboardData.setData('text/plain', text);
      if (cut) view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta('uiEvent', 'cut'));
      return true;
    };

    return [
      new Plugin({
        key: new PluginKey('liquidClipboard'),
        props: {
          handleDOMEvents: {
            copy: (view, event) => copyAsLiquid(view, event, false),
            cut: (view, event) => copyAsLiquid(view, event, true),
          },
          transformPasted(slice) {
            const { content, structureChanged } = transformPastedContent(slice.content.toJSON() ?? []);
            const fragment = Fragment.fromJSON(schema, content);
            // A new conditional block is a closed block, so the slice can no
            // longer be "open" into the surrounding paragraph.
            return structureChanged
              ? new Slice(fragment, 0, 0)
              : new Slice(fragment, slice.openStart, slice.openEnd);
          },
        },
      }),
    ];
  },
});
