// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor, getSchema } from '@tiptap/core';
import { DOMParser, DOMSerializer } from '@tiptap/pm/model';
import { StarterKit } from '@react-email/editor/extensions';
import { composeReactEmail } from '@react-email/editor/core';
import { ContentBlockNode } from '@/app/admin/newsletters/[id]/[number]/content-block-node';
import { liquidClipboardContent } from '@/app/admin/newsletters/[id]/[number]/liquid-copy';
import { LIBRARY_BLOCK_COPY, LIBRARY_BLOCK_TOKEN, replaceLibraryBlock } from '@/lib/newsletter/library-block';

const extensions = [StarterKit.configure({ CodeBlockPrism: false, Link: false }), ContentBlockNode];

const content = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
    { type: 'contentBlock' },
    { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
  ],
};

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('ContentBlockNode', () => {
  it('serializes to the token paragraph the send pipeline replaces', async () => {
    editor = new Editor({ extensions, content });
    const { html } = await composeReactEmail({ editor });

    expect(html).toContain(LIBRARY_BLOCK_TOKEN);
    const sent = replaceLibraryBlock(html, '11111111-2222-3333-4444-555555555555', 7, 'email');
    expect(sent).not.toContain(LIBRARY_BLOCK_TOKEN);
    expect(sent).toContain(LIBRARY_BLOCK_COPY.heading);
  });

  it('renders as a chip showing the token in the editor', () => {
    editor = new Editor({ extensions, content });
    const chip = editor.view.dom.querySelector('[data-content-block]');
    expect(chip?.textContent).toBe(LIBRARY_BLOCK_TOKEN);
  });

  it('survives a clipboard round-trip', () => {
    const schema = getSchema(extensions);
    const doc = schema.nodeFromJSON(content);
    const container = document.createElement('div');
    container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
    const parsed = DOMParser.fromSchema(schema).parse(container);
    expect(parsed.child(1).type.name).toBe('contentBlock');
  });

  it('copies as the token in plain text and as the chip in HTML', () => {
    editor = new Editor({ extensions, content });
    const { html, text } = liquidClipboardContent(editor.state.doc.slice(0, editor.state.doc.content.size), editor.schema);
    expect(text).toBe(`Before\n\n${LIBRARY_BLOCK_TOKEN}\n\nAfter`);
    expect(html).toContain('data-content-block');
  });
});
