'use client';

import React, { useState, useEffect } from 'react';
import { mergeAttributes } from '@tiptap/core';
import { EmailNode } from '@react-email/editor/core';
import { useCurrentEditor, useEditorState } from '@tiptap/react';
import type { SlashCommandItem } from '@react-email/editor/ui';
import { EMAIL_FIELDS } from './email-fields';

const KNOWN_PROPERTIES = EMAIL_FIELDS.map(f => ({ label: f.label, value: f.key }));

/**
 * VariableEditForm — edit UI rendered inside a BubbleMenu when a
 * variableNode is selected. Shows a property dropdown and default value input.
 */
export function VariableEditForm() {
  const { editor } = useCurrentEditor();

  const attrs = useEditorState({
    editor: editor!,
    selector: ({ editor: e }) => {
      if (!e?.isActive('variableNode')) return null;
      return e.getAttributes('variableNode') as {
        variableId: string;
        default: string;
        capitalize: boolean;
      };
    },
  });

  const [draftId, setDraftId] = useState(attrs?.variableId ?? '');
  const [draftDefault, setDraftDefault] = useState(attrs?.default ?? '');
  const [draftCapitalize, setDraftCapitalize] = useState(attrs?.capitalize ?? false);

  // Sync drafts when the selected node changes.
  useEffect(() => {
    if (attrs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync external attr → local draft
      setDraftId(attrs.variableId);
      setDraftDefault(attrs.default);
      setDraftCapitalize(attrs.capitalize);
    }
    // Only re-sync when the specific attribute values change, not the attrs object ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs?.variableId, attrs?.default, attrs?.capitalize]);

  /** Push current draft values to the node, preserving selection. */
  const updateNode = (overrides: Partial<{ variableId: string; default: string; capitalize: boolean }> = {}) => {
    if (!editor) return;
    const id = overrides.variableId ?? draftId;
    if (!id.trim()) return;
    const pos = editor.state.selection.from;
    editor.chain()
      .updateAttributes('variableNode', {
        variableId: id.trim(),
        default: (overrides.default ?? draftDefault).trim(),
        capitalize: overrides.capitalize ?? draftCapitalize,
      })
      .setNodeSelection(pos)
      .run();
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, minWidth: 240 }}
    >
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6E688A', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', flexDirection: 'column', gap: 3 }}>
        property
        <select
          value={KNOWN_PROPERTIES.some((p) => p.value === draftId) ? draftId : ''}
          onChange={(e) => {
            const selected = KNOWN_PROPERTIES.find((p) => p.value === e.target.value);
            if (selected) {
              setDraftId(selected.value);
              updateNode({ variableId: selected.value });
            }
          }}
          style={{ fontSize: 13, padding: '5px 7px', border: '1px solid #E6E1F4', borderRadius: 4, outline: 'none', width: '100%', background: '#fff' }}
        >
          <option value="" disabled>Select property…</option>
          {KNOWN_PROPERTIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6E688A', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', flexDirection: 'column', gap: 3 }}>
        default
        <input
          type="text"
          value={draftDefault}
          onChange={(e) => { setDraftDefault(e.target.value); updateNode({ default: e.target.value }); }}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="If not set"
          style={{ fontSize: 13, padding: '5px 7px', border: '1px solid #E6E1F4', borderRadius: 4, outline: 'none', width: '100%' }}
        />
      </label>
      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#221B3D', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={draftCapitalize}
          onChange={(e) => { setDraftCapitalize(e.target.checked); updateNode({ capitalize: e.target.checked }); }}
          style={{ margin: 0 }}
        />
        Capitalize
      </label>
    </div>
  );
}

/**
 * VariableNode — inline atom node for substitution variables.
 * Renders as a styled <span> in the editor (via renderHTML + CSS).
 * Serializes to Liquid output tag syntax ({{ var | filter }}) via renderToReactEmail.
 * The send pipeline converts Liquid to final values at render time.
 * Edit UI is a BubbleMenu wired up in page.tsx.
 */
export const VariableNode = EmailNode.create({
  name: 'variableNode',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      variableId: { default: '' },
      default: { default: '' },
      capitalize: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { variableId, default: defaultVal, capitalize, ...rest } = HTMLAttributes;
    return [
      'span',
      mergeAttributes(rest, {
        'data-variable-id': variableId,
        'data-variable-default': defaultVal,
        'data-variable-capitalize': capitalize ? 'true' : undefined,
      }),
      (() => {
        if (!variableId) return '{{ … }}';
        const filters: string[] = [];
        if (defaultVal) filters.push(`default: '${defaultVal}'`);
        if (capitalize) filters.push('capitalize');
        const filterStr = filters.length ? ` | ${filters.join(' | ')}` : '';
        return `{{ ${variableId}${filterStr} }}`;
      })(),
    ];
  },

  renderToReactEmail({ node }) {
    const variableId = node.attrs?.variableId;
    if (!variableId) return <span />;

    const defaultVal = node.attrs?.default;
    const capitalize = node.attrs?.capitalize ?? false;

    // Build Liquid filter chain
    const filters: string[] = [];
    if (defaultVal) filters.push(`default: '${defaultVal}'`);
    if (capitalize) filters.push('capitalize');
    const filterStr = filters.length ? ` | ${filters.join(' | ')}` : '';

    // Use dangerouslySetInnerHTML so React doesn't HTML-encode the Liquid
    // syntax (e.g. single quotes in default filters becoming &#x27;).
    return <span dangerouslySetInnerHTML={{ __html: `{{ ${variableId}${filterStr} }}` }} />;
  },
});

/**
 * Slash command entry for inserting a variable node.
 */
export const VARIABLE: SlashCommandItem = {
  title: 'Variable',
  description: 'Insert a personalization variable',
  searchTerms: ['variable', 'var', 'personalization', 'merge', 'template'],
  icon: <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>{'{ }'}</span>,
  category: 'Text',
  command: ({ editor, range }) => {
    const insertPos = range.from;
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: 'variableNode',
        attrs: {},
      })
      .setNodeSelection(insertPos)
      .run();
  },
};
