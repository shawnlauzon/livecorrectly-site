/**
 * Serializes an editor selection as Liquid for the clipboard — the inverse of
 * liquid-paste.ts. Variable chips become `{{ … }}` text and conditional blocks
 * become `{% if %}` / `{% elsif %}` / `{% else %}` / `{% endif %}` paragraphs,
 * so copy/paste (inside the editor or out to another app) carries plain Liquid
 * and pasting rebuilds the nodes through LiquidClipboard's transformPasted.
 */

import { DOMSerializer, Fragment, type Node as PMNode, type Schema, type Slice } from '@tiptap/pm/model';
import { liquidTag } from './variable-node';
import { branchOpenTag, ENDIF_TAG } from './conditional-node';

function convert(fragment: Fragment, schema: Schema): PMNode[] {
  const out: PMNode[] = [];
  fragment.forEach(node => {
    if (node.type.name === 'variableNode') {
      out.push(schema.text(liquidTag(node.attrs), node.marks));
    } else if (node.type.name === 'conditionalBlock') {
      out.push(...convertBlock(node, schema));
    } else if (node.type.name === 'conditionalBranch') {
      // A bare branch means the selection started and ended inside it:
      // copy its content, not the branch structure.
      out.push(...convert(node.content, schema));
    } else if (node.isLeaf) {
      out.push(node);
    } else {
      out.push(node.copy(Fragment.from(convert(node.content, schema))));
    }
  });
  return out;
}

function convertBlock(block: PMNode, schema: Schema): PMNode[] {
  const tagParagraph = (tag: string) => schema.nodes.paragraph.create(null, schema.text(tag));
  const out: PMNode[] = [];
  let opened = false;

  block.forEach(branch => {
    const { branchType, condition } = branch.attrs;
    // A selection that starts in an else branch has no condition to open with,
    // so its content is copied without tags.
    if (!opened && branchType === 'else') {
      out.push(...convert(branch.content, schema));
      return;
    }
    // The first branch copied always opens with `if` so the Liquid stays
    // balanced when the selection starts in an elsif branch.
    out.push(tagParagraph(branchOpenTag(opened ? branchType : 'if', condition)));
    opened = true;
    out.push(...convert(branch.content, schema));
  });

  if (opened) out.push(tagParagraph(ENDIF_TAG));
  return out;
}

/**
 * Whether an open wrapper the selection sits inside can be dropped: its
 * children must still make sense on their own — a single child, or all
 * plain blocks (the editor's top-level `container`, a branch). Wrappers whose
 * children depend on them (a multi-branch conditional, a multi-item list) stay.
 */
function canUnwrap(wrapper: PMNode): boolean {
  if (wrapper.isTextblock) return false;
  if (wrapper.childCount === 1) return true;
  let allBlocks = true;
  wrapper.forEach(child => {
    if (!child.type.isInGroup('block')) allBlocks = false;
  });
  return allBlocks;
}

/**
 * Convert a selection slice to a Liquid fragment. Like ProseMirror's own
 * clipboard serializer, wrappers that the selection sits entirely inside are
 * dropped first, so copying text from one branch copies just that text.
 */
export function sliceToLiquid(slice: Slice, schema: Schema): Fragment {
  let { content, openStart, openEnd } = slice;
  while (openStart > 0 && openEnd > 0 && content.childCount === 1 && canUnwrap(content.firstChild!)) {
    content = content.firstChild!.content;
    openStart--;
    openEnd--;
  }
  return Fragment.from(convert(content, schema));
}

/** Clipboard payloads (`text/html` and `text/plain`) for a selection slice. */
export function liquidClipboardContent(slice: Slice, schema: Schema): { html: string; text: string } {
  const fragment = sliceToLiquid(slice, schema);
  const container = document.createElement('div');
  container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(fragment));
  const text = fragment.textBetween(0, fragment.size, '\n\n', leaf => (leaf.type.name === 'hardBreak' ? '\n' : ''));
  return { html: container.innerHTML, text };
}
