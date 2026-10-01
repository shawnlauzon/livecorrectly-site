/**
 * Converts pasted Liquid text into the editor's Variable and Conditional nodes.
 *
 * Pure functions over TipTap JSONContent so they can be unit-tested without a
 * live editor. The LiquidPaste extension (liquid-paste-extension.ts) wires
 * transformPastedContent into ProseMirror's transformPasted hook.
 *
 *   {{ first_name | default: 'there' | capitalize }}  → variableNode
 *   {% if X %} … {% elsif Y %} … {% else %} … {% endif %}
 *     (each tag in its own paragraph)                 → conditionalBlock
 */

import type { JSONContent } from '@tiptap/core';

export interface VariableAttrs {
  variableId: string;
  default: string;
  capitalize: boolean;
}

const VARIABLE_TAG_RE = /\{\{([^{}]*)\}\}/g;
const VARIABLE_NAME_RE = /^[A-Za-z_][\w.]*$/;
const DEFAULT_FILTER_RE = /^default\s*:\s*(['"])(.*)\1$/;

/**
 * Parse the inside of a `{{ … }}` tag into Variable node attributes.
 * Returns null when the tag can't be represented by a Variable node (empty, or
 * uses a filter other than `default` / `capitalize`), so it stays as text
 * rather than silently losing part of the expression.
 */
export function parseVariableTag(inner: string): VariableAttrs | null {
  const [name, ...filters] = inner.split('|').map(s => s.trim());
  if (!VARIABLE_NAME_RE.test(name)) return null;

  const attrs: VariableAttrs = { variableId: name, default: '', capitalize: false };
  for (const filter of filters) {
    const defaultMatch = filter.match(DEFAULT_FILTER_RE);
    if (defaultMatch) {
      attrs.default = defaultMatch[2];
    } else if (filter === 'capitalize') {
      attrs.capitalize = true;
    } else {
      return null;
    }
  }
  return attrs;
}

/** Split a JSON text node around `{{ … }}` tags, inserting variableNodes. Marks stay on the text pieces. */
export function convertVariablesInText(node: JSONContent): JSONContent[] {
  const text = node.text ?? '';
  const out: JSONContent[] = [];
  let last = 0;

  const pushText = (s: string) => {
    if (s) out.push({ ...node, text: s });
  };

  // Formatting like bold carries onto the variable (it renders around the
  // value in the email). `code` is dropped: claude.ai and similar sources wrap
  // template tags in inline code purely for display.
  const variableMarks = node.marks?.filter(m => m.type !== 'code');

  for (const match of text.matchAll(VARIABLE_TAG_RE)) {
    const attrs = parseVariableTag(match[1]);
    if (!attrs) continue;
    pushText(text.slice(last, match.index));
    out.push({
      type: 'variableNode',
      attrs: { ...attrs },
      ...(variableMarks?.length ? { marks: variableMarks } : {}),
    });
    last = match.index + match[0].length;
  }

  if (last === 0) return [node];
  pushText(text.slice(last));
  return out;
}

/**
 * Recursively convert variables in every text node in `nodes`. Text nodes can
 * appear at the top level when the pasted HTML has no block wrapper
 * (e.g. copying part of a line from claude.ai).
 */
function convertVariablesDeep(nodes: JSONContent[]): JSONContent[] {
  return nodes.flatMap(node => {
    if (node.type === 'text') return convertVariablesInText(node);
    if (!node.content) return [node];
    return [{ ...node, content: convertVariablesDeep(node.content) }];
  });
}

type TagKind = 'if' | 'elsif' | 'else' | 'endif';

const CONDITIONAL_TAG_RE = /^\{%-?\s*(if|elsif|else|endif)\b\s*(.*?)\s*-?%\}$/;

/** If `block` is a paragraph containing only a conditional tag, return it. */
function conditionalTagOf(block: JSONContent): { kind: TagKind; condition: string } | null {
  if (block.type !== 'paragraph' || !block.content?.length) return null;
  if (!block.content.every(c => c.type === 'text')) return null;

  const text = block.content.map(c => c.text ?? '').join('').trim();
  const match = text.match(CONDITIONAL_TAG_RE);
  if (!match) return null;

  const kind = match[1] as TagKind;
  const condition = match[2];
  // if/elsif need a condition; else/endif must not have one.
  const needsCondition = kind === 'if' || kind === 'elsif';
  if (needsCondition !== (condition.length > 0)) return null;
  return { kind, condition };
}

interface Branch {
  branchType: 'if' | 'elsif' | 'else';
  condition: string;
  content: JSONContent[];
}

interface Frame {
  /** Original blocks (tags included) — restored verbatim if the block is never closed. */
  raw: JSONContent[];
  branches: Branch[];
}

/**
 * Group top-level `{% if %}` … `{% endif %}` paragraph runs into conditionalBlocks.
 * Unbalanced tags are left as plain paragraphs.
 */
function convertConditionals(blocks: JSONContent[]): { content: JSONContent[]; built: boolean } {
  const root: JSONContent[] = [];
  const stack: Frame[] = [];
  let built = false;

  const append = (node: JSONContent) => {
    const frame = stack.at(-1);
    if (!frame) {
      root.push(node);
      return;
    }
    frame.raw.push(node);
    frame.branches.at(-1)!.content.push(node);
  };

  for (const block of blocks) {
    const tag = conditionalTagOf(block);
    const frame = stack.at(-1);
    const lastBranch = frame?.branches.at(-1);

    if (tag?.kind === 'if') {
      stack.push({ raw: [block], branches: [{ branchType: 'if', condition: tag.condition, content: [] }] });
    } else if ((tag?.kind === 'elsif' || tag?.kind === 'else') && frame && lastBranch?.branchType !== 'else') {
      frame.raw.push(block);
      frame.branches.push({ branchType: tag.kind, condition: tag.condition, content: [] });
    } else if (tag?.kind === 'endif' && frame) {
      stack.pop();
      built = true;
      append({
        type: 'conditionalBlock',
        content: frame.branches.map(b => ({
          type: 'conditionalBranch',
          attrs: { branchType: b.branchType, condition: b.condition },
          content: b.content.length ? b.content : [{ type: 'paragraph' }],
        })),
      });
    } else {
      append(block);
    }
  }

  // Unclosed blocks: restore their original blocks into the enclosing level.
  while (stack.length) {
    const frame = stack.pop()!;
    for (const node of frame.raw) append(node);
  }

  return { content: root, built };
}

/**
 * Transform a pasted slice's top-level blocks: build conditional blocks first,
 * then convert variables everywhere (including inside branches).
 * `structureChanged` tells the caller the slice's open depths are no longer valid.
 */
export function transformPastedContent(blocks: JSONContent[]): { content: JSONContent[]; structureChanged: boolean } {
  const { content, built } = convertConditionals(blocks);
  return {
    content: convertVariablesDeep(content),
    structureChanged: built,
  };
}
