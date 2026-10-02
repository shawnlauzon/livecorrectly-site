// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import { DOMParser, DOMSerializer, Fragment, type Node as PMNode } from '@tiptap/pm/model';
import { StarterKit } from '@react-email/editor/extensions';
import { VariableNode } from '@/app/admin/newsletters/[id]/[number]/variable-node';
import { ConditionalBlockNode, ConditionalBranchNode } from '@/app/admin/newsletters/[id]/[number]/conditional-node';

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
        content: [{ type: 'variableNode', attrs: { variableId: 'first_name', default: 'there', capitalize: true } }],
      }],
    });

    const chip = roundTrip(doc).firstChild!.firstChild!;
    expect(chip.type.name).toBe('variableNode');
    expect(chip.attrs).toEqual({ variableId: 'first_name', default: 'there', capitalize: true });
  });

  it('keeps a variable chip without default or capitalize', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'variableNode', attrs: { variableId: 'type' } }] }],
    });

    expect(roundTrip(doc).firstChild!.firstChild!.attrs).toEqual({ variableId: 'type', default: '', capitalize: false });
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
