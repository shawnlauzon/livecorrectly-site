import { describe, it, expect } from 'vitest';
import type { JSONContent } from '@tiptap/core';
import {
  parseVariableTag,
  convertVariablesInText,
  transformPastedContent,
} from '@/app/admin/newsletters/[id]/[number]/liquid-paste';

const p = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const variable = (variableId: string, def = '', capitalize = false, marks?: JSONContent['marks']): JSONContent => ({
  type: 'variableNode',
  attrs: { variableId, default: def, capitalize },
  ...(marks ? { marks } : {}),
});

describe('parseVariableTag', () => {
  it('parses a bare name', () => {
    expect(parseVariableTag('first_name')).toEqual({ variableId: 'first_name', default: '', capitalize: false });
  });

  it('ignores surrounding whitespace', () => {
    expect(parseVariableTag('  first_name  ')).toEqual({ variableId: 'first_name', default: '', capitalize: false });
  });

  it('parses a single-quoted default', () => {
    expect(parseVariableTag("first_name | default: 'there'")).toEqual({ variableId: 'first_name', default: 'there', capitalize: false });
  });

  it('parses a double-quoted default', () => {
    expect(parseVariableTag('first_name | default: "there"')).toEqual({ variableId: 'first_name', default: 'there', capitalize: false });
  });

  it('parses capitalize', () => {
    expect(parseVariableTag('decision_making_strategy | capitalize')).toEqual({ variableId: 'decision_making_strategy', default: '', capitalize: true });
  });

  it('parses default and capitalize together with loose spacing', () => {
    expect(parseVariableTag("first_name|default:'friend'|capitalize")).toEqual({ variableId: 'first_name', default: 'friend', capitalize: true });
  });

  it('returns null for a filter the node cannot represent', () => {
    expect(parseVariableTag('first_name | upcase')).toBeNull();
  });

  it('returns null for an empty tag', () => {
    expect(parseVariableTag('   ')).toBeNull();
  });
});

describe('convertVariablesInText', () => {
  it('splits text around a variable, keeping marks on the text and the variable', () => {
    const bold = [{ type: 'bold' }];
    expect(convertVariablesInText({ type: 'text', text: 'Hey {{ first_name }},', marks: bold })).toEqual([
      { type: 'text', text: 'Hey ', marks: bold },
      variable('first_name', '', false, bold),
      { type: 'text', text: ',', marks: bold },
    ]);
  });

  it('drops the code mark from variables (claude.ai wraps them in <code>) but keeps others', () => {
    expect(convertVariablesInText({ type: 'text', text: '{{ top_shadow }}', marks: [{ type: 'code' }, { type: 'italic' }] })).toEqual([
      variable('top_shadow', '', false, [{ type: 'italic' }]),
    ]);
    expect(convertVariablesInText({ type: 'text', text: '{{ top_shadow }}', marks: [{ type: 'code' }] })).toEqual([
      variable('top_shadow'),
    ]);
  });

  it('converts multiple variables', () => {
    expect(convertVariablesInText({ type: 'text', text: '{{first_name}} {{ last_name }}' })).toEqual([
      variable('first_name'),
      { type: 'text', text: ' ' },
      variable('last_name'),
    ]);
  });

  it('leaves text without tags unchanged', () => {
    const node = { type: 'text', text: 'Nothing here' };
    expect(convertVariablesInText(node)).toEqual([node]);
  });

  it('leaves unrepresentable tags as text', () => {
    const node = { type: 'text', text: 'Hi {{ first_name | upcase }}' };
    expect(convertVariablesInText(node)).toEqual([node]);
  });
});

describe('transformPastedContent', () => {
  it('converts a variable-only paste without changing structure', () => {
    const result = transformPastedContent([p('Hey {{ first_name }},')]);
    expect(result.structureChanged).toBe(false);
    expect(result.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Hey ' }, variable('first_name'), { type: 'text', text: ',' }] },
    ]);
  });

  it('converts variables in top-level inline text (paste without a block wrapper)', () => {
    const bold = [{ type: 'bold' }];
    const result = transformPastedContent([
      { type: 'text', text: '{{ top_shadow }}', marks: bold },
      { type: 'text', text: ' — {{ top_shadow_description }}.' },
    ]);
    expect(result.structureChanged).toBe(false);
    expect(result.content).toEqual([
      variable('top_shadow', '', false, bold),
      { type: 'text', text: ' — ' },
      variable('top_shadow_description'),
      { type: 'text', text: '.' },
    ]);
  });

  it('builds a conditional block from if/else/endif paragraphs', () => {
    const result = transformPastedContent([
      p('{% if career_type == "Builder" %}'),
      p('Builder text'),
      p('{% else %}'),
      p('Other text'),
      p('{% endif %}'),
    ]);
    expect(result.structureChanged).toBe(true);
    expect(result.content).toEqual([
      {
        type: 'conditionalBlock',
        content: [
          { type: 'conditionalBranch', attrs: { branchType: 'if', condition: 'career_type == "Builder"' }, content: [p('Builder text')] },
          { type: 'conditionalBranch', attrs: { branchType: 'else', condition: '' }, content: [p('Other text')] },
        ],
      },
    ]);
  });

  it('builds if/elsif/else branches and keeps surrounding blocks', () => {
    const result = transformPastedContent([
      p('Before'),
      p('{% if type == "Projector" %}'),
      p('A'),
      p('{% elsif type == "Reflector" %}'),
      p('B'),
      p('{% else %}'),
      p('C'),
      p('{% endif %}'),
      p('After'),
    ]);
    expect(result.content).toEqual([
      p('Before'),
      {
        type: 'conditionalBlock',
        content: [
          { type: 'conditionalBranch', attrs: { branchType: 'if', condition: 'type == "Projector"' }, content: [p('A')] },
          { type: 'conditionalBranch', attrs: { branchType: 'elsif', condition: 'type == "Reflector"' }, content: [p('B')] },
          { type: 'conditionalBranch', attrs: { branchType: 'else', condition: '' }, content: [p('C')] },
        ],
      },
      p('After'),
    ]);
  });

  it('gives an empty branch an empty paragraph', () => {
    const result = transformPastedContent([p('{% if isBuilder %}'), p('{% endif %}')]);
    expect(result.content).toEqual([
      {
        type: 'conditionalBlock',
        content: [{ type: 'conditionalBranch', attrs: { branchType: 'if', condition: 'isBuilder' }, content: [{ type: 'paragraph' }] }],
      },
    ]);
  });

  it('supports nested conditionals', () => {
    const result = transformPastedContent([
      p('{% if isBuilder %}'),
      p('{% if isEmotional %}'),
      p('Inner'),
      p('{% endif %}'),
      p('{% endif %}'),
    ]);
    expect(result.content).toEqual([
      {
        type: 'conditionalBlock',
        content: [{
          type: 'conditionalBranch',
          attrs: { branchType: 'if', condition: 'isBuilder' },
          content: [{
            type: 'conditionalBlock',
            content: [{ type: 'conditionalBranch', attrs: { branchType: 'if', condition: 'isEmotional' }, content: [p('Inner')] }],
          }],
        }],
      },
    ]);
  });

  it('leaves an unclosed if as plain paragraphs', () => {
    const blocks = [p('{% if isBuilder %}'), p('Text')];
    const result = transformPastedContent(blocks);
    expect(result.structureChanged).toBe(false);
    expect(result.content).toEqual(blocks);
  });

  it('leaves stray else/endif tags as plain paragraphs', () => {
    const blocks = [p('{% else %}'), p('Text'), p('{% endif %}')];
    expect(transformPastedContent(blocks).content).toEqual(blocks);
  });

  it('closes an outer block but keeps an unclosed inner if as text', () => {
    const result = transformPastedContent([
      p('{% if isBuilder %}'),
      p('{% if isEmotional %}'),
      p('Inner'),
      p('{% endif %}'),
    ]);
    expect(result.content).toEqual([
      p('{% if isBuilder %}'),
      {
        type: 'conditionalBlock',
        content: [{ type: 'conditionalBranch', attrs: { branchType: 'if', condition: 'isEmotional' }, content: [p('Inner')] }],
      },
    ]);
  });

  it('leaves inline conditional tags as text', () => {
    const blocks = [p('You are {% if isBuilder %}a builder{% endif %}.')];
    expect(transformPastedContent(blocks).content).toEqual(blocks);
  });

  it('converts variables inside conditional branches', () => {
    const result = transformPastedContent([
      p('{% if isBuilder %}'),
      p('Hi {{ first_name }}'),
      p('{% endif %}'),
    ]);
    expect(result.content).toEqual([
      {
        type: 'conditionalBlock',
        content: [{
          type: 'conditionalBranch',
          attrs: { branchType: 'if', condition: 'isBuilder' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi ' }, variable('first_name')] }],
        }],
      },
    ]);
  });
});
