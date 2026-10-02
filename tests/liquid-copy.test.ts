// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { getSchema } from '@tiptap/core';
import type { Fragment, Node as PMNode } from '@tiptap/pm/model';
import { StarterKit } from '@react-email/editor/extensions';
import { VariableNode } from '@/app/admin/newsletters/[id]/[number]/variable-node';
import { ConditionalBlockNode, ConditionalBranchNode } from '@/app/admin/newsletters/[id]/[number]/conditional-node';
import { sliceToLiquid, liquidClipboardContent } from '@/app/admin/newsletters/[id]/[number]/liquid-copy';

const schema = getSchema([StarterKit.configure({ CodeBlockPrism: false, Link: false }), VariableNode, ConditionalBlockNode, ConditionalBranchNode]);

const para = (...content: object[]) => ({ type: 'paragraph', content });
const text = (t: string, marks?: object[]) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });
const branch = (branchType: string, condition: string, t: string) => ({
  type: 'conditionalBranch',
  attrs: { branchType, condition },
  content: [para(text(t))],
});
const doc = (...content: object[]) => schema.nodeFromJSON({ type: 'doc', content });

/** Position just before the first occurrence of `needle` in a text node. */
function posOf(d: PMNode, needle: string): number {
  let found = -1;
  d.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isText && node.text!.includes(needle)) found = pos + node.text!.indexOf(needle);
  });
  if (found < 0) throw new Error(`"${needle}" not found`);
  return found;
}

/** Top-level block text, one entry per block. */
const blocks = (f: Fragment) => {
  const out: string[] = [];
  f.forEach(n => out.push(n.textContent));
  return out;
};

const ifBlock = {
  type: 'conditionalBlock',
  content: [
    branch('if', "career_type == 'Builder'", 'builder text'),
    branch('elsif', "career_type == 'Guide'", 'guide text'),
    branch('else', '', 'other text'),
  ],
};

describe('sliceToLiquid', () => {
  it('turns a variable chip into its Liquid output tag, keeping marks', () => {
    const d = doc(para(
      text('Hi '),
      { type: 'variableNode', attrs: { variableId: 'first_name', default: 'there', capitalize: true }, marks: [{ type: 'bold' }] },
      text('!'),
    ));
    const out = sliceToLiquid(d.slice(0, d.content.size), schema);

    expect(blocks(out)).toEqual(["Hi {{ first_name | default: 'there' | capitalize }}!"]);
    const tagNode = out.firstChild!.child(1);
    expect(tagNode.isText).toBe(true);
    expect(tagNode.marks.map(m => m.type.name)).toEqual(['bold']);
  });

  it('turns a downcase variable chip into a downcase filter', () => {
    const d = doc(para({ type: 'variableNode', attrs: { variableId: 'type', lowercase: true } }));
    expect(blocks(sliceToLiquid(d.slice(0, d.content.size), schema))).toEqual(['{{ type | downcase }}']);
  });

  it('turns a whole conditional block into tag paragraphs around branch content', () => {
    const d = doc(para(text('before')), ifBlock, para(text('after')));
    const out = sliceToLiquid(d.slice(0, d.content.size), schema);

    expect(blocks(out)).toEqual([
      'before',
      "{% if career_type == 'Builder' %}",
      'builder text',
      "{% elsif career_type == 'Guide' %}",
      'guide text',
      '{% else %}',
      'other text',
      '{% endif %}',
      'after',
    ]);
    out.forEach(n => expect(n.type.name).toBe('paragraph'));
  });

  it('converts variable chips inside branches', () => {
    const d = doc({
      type: 'conditionalBlock',
      content: [{
        type: 'conditionalBranch',
        attrs: { branchType: 'if', condition: "type == 'Projector'" },
        content: [para(text('Hey '), { type: 'variableNode', attrs: { variableId: 'first_name' } })],
      }],
    });
    expect(blocks(sliceToLiquid(d.slice(0, d.content.size), schema))).toEqual([
      "{% if type == 'Projector' %}",
      'Hey {{ first_name }}',
      '{% endif %}',
    ]);
  });

  it('copies only the text when the selection is inside one branch', () => {
    const d = doc(ifBlock);
    const from = posOf(d, 'guide');
    const out = sliceToLiquid(d.slice(from, from + 'guide text'.length), schema);
    expect(blocks(out)).toEqual(['guide text']);
  });

  it('opens with an if tag when the selection starts in an elsif branch', () => {
    const d = doc(ifBlock, para(text('after')));
    const out = sliceToLiquid(d.slice(posOf(d, 'guide'), d.content.size), schema);
    expect(blocks(out)).toEqual([
      "{% if career_type == 'Guide' %}",
      'guide text',
      '{% else %}',
      'other text',
      '{% endif %}',
      'after',
    ]);
  });

  it('emits else-branch content without tags when the selection starts in the else branch', () => {
    const d = doc(ifBlock, para(text('after')));
    const out = sliceToLiquid(d.slice(posOf(d, 'other'), d.content.size), schema);
    expect(blocks(out)).toEqual(['other text', 'after']);
  });
});

describe('liquidClipboardContent', () => {
  it('produces plain-text Liquid with blocks separated by blank lines', () => {
    const d = doc({
      type: 'conditionalBlock',
      content: [{
        type: 'conditionalBranch',
        attrs: { branchType: 'if', condition: "type == 'Projector'" },
        content: [para(text('Hey '), { type: 'variableNode', attrs: { variableId: 'first_name' } })],
      }],
    });
    const { text: plain, html } = liquidClipboardContent(d.slice(0, d.content.size), schema);

    expect(plain).toBe("{% if type == 'Projector' %}\n\nHey {{ first_name }}\n\n{% endif %}");
    expect(html).not.toContain('data-branch-type');
    expect(html).not.toContain('data-variable-id');
    expect(html).toContain('{{ first_name }}');
  });
});
