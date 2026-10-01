import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Fragment, Slice } from '@tiptap/pm/model';
import { transformPastedContent } from './liquid-paste';

/**
 * LiquidPaste — converts pasted `{{ … }}` / `{% … %}` text into Variable and
 * Conditional nodes (see liquid-paste.ts). A plain Extension because
 * EmailNode.create does not wire plugin methods.
 */
export const LiquidPaste = Extension.create({
  name: 'liquidPaste',
  addProseMirrorPlugins() {
    const { schema } = this.editor;
    return [
      new Plugin({
        key: new PluginKey('liquidPaste'),
        props: {
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
