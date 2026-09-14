'use client';

import React from 'react';
import { Extension, mergeAttributes } from '@tiptap/core';
import { EmailNode } from '@react-email/editor/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
} from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import type { SlashCommandItem } from '@react-email/editor/ui';
import { canJoin } from '@tiptap/pm/transform';
import { TextSelection } from '@tiptap/pm/state';

// ---------------------------------------------------------------------------
// Condition field definitions — same contact property names as the Variable node
// ---------------------------------------------------------------------------

interface ConditionField {
  key: string;
  label: string;
  values: string[];
}

/**
 * Fields available for conditions. Each maps to a contact property
 * (same names used by the Variable node and buildLiquidContext).
 *
 * `career_type` = BG5 career design, `type` = traditional HD type.
 * "(any)" entries use Liquid `contains` to match multiple subtypes.
 */
const CONDITION_FIELDS: ConditionField[] = [
  { key: 'mode', label: 'Mode', values: ['web', 'email'] },
  { key: 'career_type', label: 'Career Type', values: ['Builder (any)', 'Classic Builder', 'Express Builder', 'Initiator', 'Advisor', 'Evaluator'] },
  { key: 'type', label: 'Type', values: ['Generator (any)', 'Generator', 'Manifesting Generator', 'Manifestor', 'Projector', 'Reflector'] },
  { key: 'inner_authority', label: 'Inner Authority', values: ['Emotional', 'Sacral', 'Splenic', 'Ego', 'Self-Projected', 'Ego-Projected', 'None'] },
  { key: 'strategy', label: 'Strategy', values: ['wait to respond before engaging', 'inform before taking action', 'wait for recognition and invitation', 'wait a 28 day cycle to reflect and assess'] },
  { key: 'signature_theme', label: 'Signature Theme', values: ['satisfaction', 'peace', 'success', 'surprise'] },
  { key: 'not_self_theme', label: 'Not-Self Theme', values: ['frustration', 'anger', 'bitterness', 'disappointment'] },
];

const OPERATORS = ['==', '!='] as const;

const FIELD_BY_KEY = new Map(CONDITION_FIELDS.map(f => [f.key, f]));

/**
 * Compound "any" values expand to `field == "A" or field == "B"` in Liquid.
 * To the author they're just another value in the dropdown.
 */
const ANY_VALUES: Record<string, { field: string; members: string[] }> = {
  'Builder (any)': { field: 'career_type', members: ['Classic Builder', 'Express Builder'] },
  'Generator (any)': { field: 'type', members: ['Generator', 'Manifesting Generator'] },
};

/** Parse a Liquid condition string into structured field/op/value parts. */
function parseCondition(condition: string): { field: string; op: string; value: string } | null {
  // Compound "any" with `or`: `field == "A" or field == "B"`
  for (const [anyLabel, def] of Object.entries(ANY_VALUES)) {
    const eqParts = def.members.map(m => `${def.field} == "${m}"`).join(' or ');
    const neqParts = def.members.map(m => `${def.field} != "${m}"`).join(' and ');
    if (condition === eqParts) return { field: def.field, op: '==', value: anyLabel };
    if (condition === neqParts) return { field: def.field, op: '!=', value: anyLabel };
  }
  // Standard: `field == "value"` or `field != "value"`
  const match = condition.match(/^(\w+)\s*(==|!=)\s*"(.+)"$/);
  if (!match) return null;
  return { field: match[1], op: match[2], value: match[3] };
}

/** Compose structured parts into a Liquid condition string. */
function composeCondition(field: string, op: string, value: string): string {
  const any = ANY_VALUES[value];
  if (any) {
    if (op === '!=') {
      // All must not match: `field != "A" and field != "B"`
      return any.members.map(m => `${any.field} != "${m}"`).join(' and ');
    }
    // Any must match: `field == "A" or field == "B"`
    return any.members.map(m => `${any.field} == "${m}"`).join(' or ');
  }
  return `${field} ${op} "${value}"`;
}

const BRANCH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  if: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  elsif: { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
  else: { bg: '#F3E5F5', text: '#7B1FA2', border: '#CE93D8' },
};

const selectStyle = (borderColor: string): React.CSSProperties => ({
  fontSize: 12,
  padding: '2px 4px',
  border: `1px solid ${borderColor}`,
  borderRadius: 3,
  background: '#fff',
  outline: 'none',
});

// ---------------------------------------------------------------------------
// ConditionalBranchView — React NodeView for a single branch
// ---------------------------------------------------------------------------

function ConditionalBranchView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const branchType: string = node.attrs.branchType ?? 'if';
  const condition: string = node.attrs.condition ?? '';
  const colors = BRANCH_COLORS[branchType] ?? BRANCH_COLORS.if;
  const showCondition = branchType !== 'else';
  const canDelete = branchType !== 'if';

  const parsed = showCondition ? parseCondition(condition) : null;
  const field = parsed?.field ?? CONDITION_FIELDS[0].key;
  const op = parsed?.op ?? '==';
  const value = parsed?.value ?? '';
  const fieldDef = FIELD_BY_KEY.get(field);
  const update = (f: string, o: string, v: string) => {
    updateAttributes({ condition: composeCondition(f, o, v) });
  };

  return (
    <NodeViewWrapper data-branch-type={branchType}>
      {/* Branch header bar */}
      <div
        contentEditable={false}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.text,
            flexShrink: 0,
            minWidth: 44,
          }}
        >
          {branchType === 'elsif' ? 'ELSE IF' : branchType.toUpperCase()}
        </span>

        {showCondition && (
          <>
            {/* Field picklist */}
            <select
              value={field}
              onChange={(e) => {
                const newField = e.target.value;
                const newFieldDef = FIELD_BY_KEY.get(newField);
                const newValue = newFieldDef?.values[0] ?? '';
                update(newField, op, newValue);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={selectStyle(colors.border)}
            >
              {CONDITION_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>

            {/* Operator picklist */}
            <select
              value={op}
              onChange={(e) => update(field, e.target.value, value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ ...selectStyle(colors.border), width: 44 }}
            >
              {OPERATORS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            {/* Value picklist */}
            <select
              value={fieldDef?.values.includes(value) ? value : ''}
              onChange={(e) => update(field, op, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              style={selectStyle(colors.border)}
            >
              {!fieldDef?.values.includes(value) && value && (
                <option value="">{value}</option>
              )}
              {(fieldDef?.values ?? []).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={deleteNode}
            onMouseDown={(e) => e.stopPropagation()}
            title={`Remove ${branchType} branch`}
            style={{
              marginLeft: 'auto',
              fontSize: 16,
              lineHeight: 1,
              background: 'none',
              border: 'none',
              color: colors.text,
              cursor: 'pointer',
              padding: '0 2px',
              opacity: 0.6,
              flexShrink: 0,
            }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Editable content area */}
      <NodeViewContent
        style={{
          padding: '8px 12px',
          minHeight: 40,
        }}
      />
    </NodeViewWrapper>
  );
}

// ---------------------------------------------------------------------------
// ConditionalBlockView — React NodeView wrapping all branches
// ---------------------------------------------------------------------------

function ConditionalBlockView({ node, editor, deleteNode, getPos }: ReactNodeViewProps) {
  // Check if an 'else' branch already exists
  const hasElse = (() => {
    let found = false;
    node.content.forEach((child) => {
      if (child.attrs.branchType === 'else') found = true;
    });
    return found;
  })();

  const addBranch = (type: 'elsif' | 'else') => {
    const pos = getPos();
    if (pos === undefined) return;

    // Collect branch info for insertion position + condition derivation
    const branches: Array<{ branchType: string; condition: string; offset: number }> = [];
    let offset = 1; // +1 for the block's opening token
    node.content.forEach((child) => {
      branches.push({
        branchType: child.attrs.branchType as string,
        condition: (child.attrs.condition as string) ?? '',
        offset,
      });
      offset += child.nodeSize;
    });

    // Find the insertion position. Elsif goes before the else (if present),
    // else goes at the end.
    let insertPos = pos + node.nodeSize - 1; // default: end of block
    if (type === 'elsif' && hasElse) {
      for (const b of branches) {
        if (b.branchType === 'else') {
          insertPos = pos + b.offset;
          break;
        }
      }
    }

    // Derive elsif condition: same field/op as the branch above, next value in the list
    let condition = '';
    if (type === 'elsif') {
      let prevIdx = branches.length - 1;
      if (hasElse) {
        const elseIdx = branches.findIndex(b => b.branchType === 'else');
        if (elseIdx > 0) prevIdx = elseIdx - 1;
      }

      const parsed = parseCondition(branches[prevIdx].condition);
      if (parsed) {
        const fieldDef = FIELD_BY_KEY.get(parsed.field);
        if (fieldDef && fieldDef.values.length > 0) {
          const currentIdx = fieldDef.values.indexOf(parsed.value);
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % fieldDef.values.length;
          condition = composeCondition(parsed.field, parsed.op, fieldDef.values[nextIdx]);
        } else {
          condition = composeCondition(parsed.field, parsed.op, parsed.value);
        }
      } else {
        condition = composeCondition('career_type', '==', 'Builder (any)');
      }
    }

    const branchNode = editor.schema.nodes.conditionalBranch.create(
      { branchType: type, condition },
      editor.schema.nodes.paragraph.create(),
    );
    editor.chain().focus().insertContentAt(insertPos, branchNode.toJSON()).run();
  };

  return (
    <NodeViewWrapper data-type="conditional-block">
      <div
        style={{
          position: 'relative',
          border: '2px dashed var(--line, #E6E1F4)',
          borderRadius: 8,
          margin: '12px 0',
          overflow: 'hidden',
          background: '#FAFAFA',
        }}
      >
        {/* Delete block button — top-right corner */}
        <button
          type="button"
          contentEditable={false}
          onClick={deleteNode}
          onMouseDown={(e) => e.stopPropagation()}
          title="Delete conditional block"
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 1,
            fontSize: 16,
            lineHeight: 1,
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F5F5F5',
            border: '1px solid var(--line, #E6E1F4)',
            borderRadius: 4,
            color: '#999',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          &times;
        </button>

        <NodeViewContent />

        {/* Footer bar: add branch buttons */}
        <div
          contentEditable={false}
          style={{
            display: 'flex',
            gap: 8,
            padding: '6px 10px',
            borderTop: '1px dashed var(--line, #E6E1F4)',
            background: '#F5F5F5',
            userSelect: 'none',
          }}
        >
          <button
            type="button"
            onClick={() => addBranch('elsif')}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: BRANCH_COLORS.elsif.text,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            + else if
          </button>
          {!hasElse && (
            <button
              type="button"
              onClick={() => addBranch('else')}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: BRANCH_COLORS.else.text,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              + else
            </button>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ---------------------------------------------------------------------------
// ConditionalBranchNode — TipTap extension
// ---------------------------------------------------------------------------

export const ConditionalBranchNode = EmailNode.create({
  name: 'conditionalBranch',
  group: 'conditionalBranch',
  content: 'block+',
  isolating: true,

  addAttributes() {
    return {
      branchType: { default: 'if' },
      condition: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-branch-type]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { branchType, condition, ...rest } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(rest, {
        'data-branch-type': branchType,
        'data-condition': condition,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalBranchView);
  },

  renderToReactEmail({ node, children }) {
    const branchType: string = node.attrs?.branchType ?? 'if';
    const condition: string = node.attrs?.condition ?? '';

    let openTag: string;
    if (branchType === 'if') {
      openTag = `{% if ${condition} %}`;
    } else if (branchType === 'elsif') {
      openTag = `{% elsif ${condition} %}`;
    } else {
      openTag = '{% else %}';
    }

    return (
      <>
        <span dangerouslySetInnerHTML={{ __html: openTag }} />
        {children}
      </>
    );
  },
});

// ---------------------------------------------------------------------------
// ConditionalBlockNode — TipTap extension
// ---------------------------------------------------------------------------

export const ConditionalBlockNode = EmailNode.create({
  name: 'conditionalBlock',
  group: 'block',
  content: 'conditionalBranch+',

  parseHTML() {
    return [{ tag: 'div[data-type="conditional-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'conditional-block',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalBlockView);
  },

  renderToReactEmail({ children }) {
    return (
      <>
        {children}
        <span dangerouslySetInnerHTML={{ __html: '{% endif %}' }} />
      </>
    );
  },
});

// ---------------------------------------------------------------------------
// ConditionalKeymap — standalone Extension for keyboard shortcuts
// ---------------------------------------------------------------------------
// EmailNode.create does not wire addKeyboardShortcuts into TipTap's keymap
// plugin system (schema methods like addNodeView work, plugin methods don't).
// A plain Extension.create registers properly.

export const ConditionalKeymap = Extension.create({
  name: 'conditionalKeymap',

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor.view;
        const { $head, empty } = state.selection;

        if (!empty) return false;

        // Must be inside a conditionalBranch
        const branchDepth = (() => {
          for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name === 'conditionalBranch') return d;
          }
          return null;
        })();
        if (branchDepth === null) return false;

        const branch = $head.node(branchDepth);

        // --- Delete empty non-if branch ---
        if (branch.attrs.branchType !== 'if' && branch.textContent === '') {
          const branchStart = $head.before(branchDepth);
          const branchEnd = $head.after(branchDepth);
          const tr = state.tr.delete(branchStart, branchEnd);
          const $newPos = tr.doc.resolve(branchStart);
          if ($newPos.nodeBefore) {
            tr.setSelection(TextSelection.near(tr.doc.resolve(branchStart - 1), -1));
          }
          editor.view.dispatch(tr);
          return true;
        }

        // --- Replace entire block if all branches are empty ---
        const blockDepth = (() => {
          for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name === 'conditionalBlock') return d;
          }
          return null;
        })();
        if (blockDepth !== null) {
          const block = $head.node(blockDepth);
          if (block.textContent === '') {
            const blockStart = $head.before(blockDepth);
            const blockEnd = $head.after(blockDepth);
            const paragraph = state.schema.nodes.paragraph.create();
            const tr = state.tr.replaceWith(blockStart, blockEnd, paragraph);
            tr.setSelection(TextSelection.near(tr.doc.resolve(blockStart + 1)));
            editor.view.dispatch(tr);
            return true;
          }
        }

        // --- Join with previous paragraph inside the branch ---
        if ($head.parentOffset !== 0) return false;

        const paragraphDepth = $head.depth;
        if (paragraphDepth <= branchDepth) return false;

        // ReactNodeViewRenderer wraps content in extra div nodes, so
        // paragraphs may not be direct siblings. Find the outermost depth
        // (between branch and paragraph) where there IS a preceding sibling.
        let outerJoinDepth: number | null = null;
        for (let d = paragraphDepth; d > branchDepth; d--) {
          if ($head.index(d - 1) > 0) {
            outerJoinDepth = d;
            break;
          }
        }
        if (outerJoinDepth === null) return false;

        // Join at each nesting level from the outer wrapper down to the
        // paragraph. Each join merges two sibling nodes, making the next
        // level's nodes siblings so the following join can proceed.
        // After each join the document changes, so re-resolve the cursor
        // position to find the correct next join point.
        const tr = state.tr;
        for (let d = outerJoinDepth; d <= paragraphDepth; d++) {
          const mappedPos = tr.mapping.map($head.before(d));
          const $mapped = tr.doc.resolve(mappedPos);
          // Verify nodes on both sides are the same type before joining
          if ($mapped.nodeBefore && $mapped.nodeAfter
              && $mapped.nodeBefore.type === $mapped.nodeAfter.type) {
            tr.join(mappedPos);
          }
        }
        if (tr.docChanged) {
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },

      Delete: ({ editor }) => {
        const { state } = editor.view;
        const { $head, empty } = state.selection;

        if (!empty) return false;

        const branchDepth = (() => {
          for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name === 'conditionalBranch') return d;
          }
          return null;
        })();
        if (branchDepth === null) return false;

        // Cursor must be at end of its textblock
        if ($head.parentOffset !== $head.parent.content.size) return false;

        // Work from the paragraph depth, not branchDepth + 1
        // (ReactNodeViewRenderer wraps content in extra div nodes)
        const paragraphDepth = $head.depth;
        if (paragraphDepth <= branchDepth) return false;

        // Find the outermost depth with a following sibling
        let outerJoinDepth: number | null = null;
        for (let d = paragraphDepth; d > branchDepth; d--) {
          const parent = $head.node(d - 1);
          if ($head.index(d - 1) < parent.childCount - 1) {
            outerJoinDepth = d;
            break;
          }
        }
        if (outerJoinDepth === null) return false;

        // Join at each nesting level from the outer wrapper down to the
        // paragraph, merging wrappers then content.
        const tr = state.tr;
        for (let d = outerJoinDepth; d <= paragraphDepth; d++) {
          const mappedPos = tr.mapping.map($head.after(d));
          const $mapped = tr.doc.resolve(mappedPos);
          if ($mapped.nodeBefore && $mapped.nodeAfter
              && $mapped.nodeBefore.type === $mapped.nodeAfter.type) {
            tr.join(mappedPos);
          }
        }
        if (tr.docChanged) {
          editor.view.dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Slash command
// ---------------------------------------------------------------------------

export const DEFAULT_CONDITION = composeCondition('career_type', '==', 'Builder (any)');

export const IF_THEN_ELSE: SlashCommandItem = {
  title: 'If-Then',
  description: 'Conditional content per subscriber type',
  searchTerms: ['if', 'then', 'else', 'conditional', 'liquid', 'personalize', 'type'],
  icon: (
    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, lineHeight: 1 }}>
      {'{ ? }'}
    </span>
  ),
  category: 'Conditionals',
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: 'conditionalBlock',
        content: [
          {
            type: 'conditionalBranch',
            attrs: { branchType: 'if', condition: DEFAULT_CONDITION },
            content: [{ type: 'paragraph' }],
          },
        ],
      })
      .run();
  },
};
