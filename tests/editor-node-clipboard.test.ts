// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Editor, getSchema, type JSONContent } from '@tiptap/core';
import { DOMParser, DOMSerializer, Fragment, type Node as PMNode } from '@tiptap/pm/model';
import { StarterKit } from '@react-email/editor/extensions';
import { VariableNode } from '@/app/admin/newsletters/[id]/[number]/variable-node';
import { ConditionalBlockNode, ConditionalBranchNode } from '@/app/admin/newsletters/[id]/[number]/conditional-node';
import { LiquidClipboard } from '@/app/admin/newsletters/[id]/[number]/liquid-paste-extension';
import { liquidClipboardContent } from '@/app/admin/newsletters/[id]/[number]/liquid-copy';

// Copy/paste goes through the node's renderHTML (DOMSerializer) and back
// through its parseHTML (DOMParser). Every attribute must survive that trip.
const schema = getSchema([StarterKit.configure({ CodeBlockPrism: false, Link: false }), VariableNode, ConditionalBlockNode, ConditionalBranchNode]);

function roundTrip(doc: PMNode): PMNode {
  const container = document.createElement('div');
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
  return DOMParser.fromSchema(schema).parse(container);
}

describe('editor node clipboard round-trip', () => {
  it('keeps variable chip attributes', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'variableNode', attrs: { variableId: 'first_name', default: 'there', capitalize: true, lowercase: false } }],
      }],
    });

    const chip = roundTrip(doc).firstChild!.firstChild!;
    expect(chip.type.name).toBe('variableNode');
    expect(chip.attrs).toEqual({ variableId: 'first_name', default: 'there', capitalize: true, lowercase: false });
  });

  it('keeps a lowercase variable chip', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'variableNode', attrs: { variableId: 'career_type', lowercase: true } }] }],
    });

    expect(roundTrip(doc).firstChild!.firstChild!.attrs).toEqual({ variableId: 'career_type', default: '', capitalize: false, lowercase: true });
  });

  it('keeps a variable chip without default or capitalize', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'variableNode', attrs: { variableId: 'type' } }] }],
    });

    expect(roundTrip(doc).firstChild!.firstChild!.attrs).toEqual({ variableId: 'type', default: '', capitalize: false, lowercase: false });
  });

  it('keeps conditional branch types and conditions', () => {
    const branch = (branchType: string, condition: string, text: string) => ({
      type: 'conditionalBranch',
      attrs: { branchType, condition },
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    });
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{
        type: 'conditionalBlock',
        content: [
          branch('if', "type == 'Projector'", 'a'),
          branch('elsif', "type == 'Generator'", 'b'),
          branch('else', '', 'c'),
        ],
      }],
    });

    const block = roundTrip(doc).firstChild!;
    expect(block.type.name).toBe('conditionalBlock');
    const attrs: unknown[] = [];
    Fragment.from(block.content).forEach(b => attrs.push(b.attrs));
    expect(attrs).toEqual([
      { branchType: 'if', condition: "type == 'Projector'" },
      { branchType: 'elsif', condition: "type == 'Generator'" },
      { branchType: 'else', condition: '' },
    ]);
  });
});

// Full clipboard path: copy serializes the selection as Liquid
// (liquid-copy.ts), paste re-parses it and LiquidClipboard's transformPasted
// rebuilds the chips and conditional blocks.
describe('copy as Liquid, paste rebuilds nodes', () => {
  const extensions = [
    StarterKit.configure({ CodeBlockPrism: false, Link: false }),
    VariableNode,
    ConditionalBlockNode,
    ConditionalBranchNode,
    LiquidClipboard,
  ];
  const makeEditor = (content: JSONContent) => new Editor({ element: document.createElement('div'), extensions, content });

  /** Clipboard payload for the editor's text between `from` and `to`. */
  const copy = (editor: Editor, from: number, to: number) =>
    liquidClipboardContent(editor.state.doc.slice(from, to), editor.schema);

  /** Position just before the first occurrence of `needle` in a text node. */
  const posOf = (editor: Editor, needle: string): number => {
    let found = -1;
    editor.state.doc.descendants((node, pos) => {
      if (found >= 0) return false;
      if (node.isText && node.text!.includes(needle)) found = pos + node.text!.indexOf(needle);
    });
    if (found < 0) throw new Error(`"${needle}" not found`);
    return found;
  };

  /** Every node of `type` in the editor's document, as JSON. */
  const findAll = (editor: Editor, type: string): JSONContent[] => {
    const out: JSONContent[] = [];
    editor.state.doc.descendants(node => {
      if (node.type.name === type) out.push(node.toJSON());
    });
    return out;
  };

  it('moves a whole conditional block with its chips intact', () => {
    const block = {
      type: 'conditionalBlock',
      content: [
        {
          type: 'conditionalBranch',
          attrs: { branchType: 'if', condition: "career_type == 'Builder'" },
          content: [{
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hi ' },
              { type: 'variableNode', attrs: { variableId: 'first_name', default: 'there', capitalize: true, lowercase: false } },
            ],
          }],
        },
        {
          type: 'conditionalBranch',
          attrs: { branchType: 'elsif', condition: "career_type == 'Guide'" },
          content: [{ type: 'paragraph', content: [{ type: 'variableNode', attrs: { variableId: 'type', default: '', capitalize: false, lowercase: true } }] }],
        },
        {
          type: 'conditionalBranch',
          attrs: { branchType: 'else', condition: '' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'other' }] }],
        },
      ],
    };
    const source = makeEditor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'before' }] }, block] });
    // A real selection: from the start of "before" to the end of "other",
    // inside the editor's top-level container node.
    const { html } = copy(source, posOf(source, 'before'), posOf(source, 'other') + 'other'.length);

    const target = makeEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    target.view.pasteHTML(html);

    // toMatchObject: the editor adds presentation attrs (class/style) to parsed paragraphs.
    expect(findAll(target, 'conditionalBlock')).toMatchObject([block]);
    source.destroy();
    target.destroy();
  });

  it('pastes only the text when copying from inside one branch', () => {
    const source = makeEditor({
      type: 'doc',
      content: [{
        type: 'conditionalBlock',
        content: [{
          type: 'conditionalBranch',
          attrs: { branchType: 'if', condition: "career_type == 'Builder'" },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'builder text' }] }],
        }],
      }],
    });
    const from = posOf(source, 'builder');
    const { html } = copy(source, from, from + 'builder'.length);

    const target = makeEditor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi ' }] }] });
    target.commands.setTextSelection(posOf(target, 'Hi ') + 'Hi '.length);
    target.view.pasteHTML(html);

    expect(findAll(target, 'conditionalBlock')).toEqual([]);
    expect(target.state.doc.textContent).toBe('Hi builder');
    source.destroy();
    target.destroy();
  });
});
