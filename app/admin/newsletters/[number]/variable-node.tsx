'use client';

import React, { useState, useEffect } from 'react';
import { mergeAttributes } from '@tiptap/core';
import { EmailNode } from '@react-email/editor/core';
import { useCurrentEditor, useEditorState } from '@tiptap/react';
import type { SlashCommandItem } from '@react-email/editor/ui';

/**
 * Standard Resend fields that don't need the `contact.` prefix in template syntax.
 * Custom contact properties are referenced as `{{{contact.key}}}`.
 */
const STANDARD_RESEND_FIELDS = new Set(['FIRST_NAME', 'LAST_NAME', 'EMAIL']);

const KNOWN_PROPERTIES: { label: string; value: string; fallback?: string }[] = [
  { label: 'First Name', value: 'FIRST_NAME', fallback: 'there' },
  { label: 'Last Name', value: 'LAST_NAME' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Career Type', value: 'career_type' },
  { label: 'Type', value: 'type' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Inner Authority', value: 'inner_authority' },
  { label: 'Signature Theme', value: 'signature_theme' },
  { label: 'Not-Self Theme', value: 'not_self_theme' },
  { label: 'Decision-making Strategy', value: 'decision_making_strategy' },
];

/**
 * VariableEditForm — edit UI rendered inside a BubbleMenu when a
 * variableNode is selected. Shows a property dropdown and fallback input.
 */
export function VariableEditForm() {
  const { editor } = useCurrentEditor();

  const attrs = useEditorState({
    editor: editor!,
    selector: ({ editor: e }) => {
      if (!e?.isActive('variableNode')) return null;
      return e.getAttributes('variableNode') as {
        variableId: string;
        fallback: string;
      };
    },
  });

  const [draftId, setDraftId] = useState(attrs?.variableId ?? '');
  const [draftFallback, setDraftFallback] = useState(attrs?.fallback ?? '');

  // Sync drafts when the selected node changes.
  useEffect(() => {
    if (attrs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync external attr → local draft
      setDraftId(attrs.variableId);
      setDraftFallback(attrs.fallback);
    }
    // Only re-sync when the specific attribute values change, not the attrs object ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrs?.variableId, attrs?.fallback]);

  const apply = () => {
    if (!editor) return;
    const trimmedId = draftId.trim();
    if (trimmedId) {
      editor.commands.updateAttributes('variableNode', {
        variableId: trimmedId,
        fallback: draftFallback.trim(),
      });
    }
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
              if (selected.fallback !== undefined) {
                setDraftFallback(selected.fallback);
              }
            }
          }}
          style={{ fontSize: 13, padding: '5px 7px', border: '1px solid #E6E1F4', borderRadius: 4, outline: 'none', width: '100%', background: '#fff' }}
        >
          <option value="" disabled>Custom…</option>
          {KNOWN_PROPERTIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6E688A', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', flexDirection: 'column', gap: 3 }}>
        fallback
        <input
          type="text"
          value={draftFallback}
          onChange={(e) => setDraftFallback(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); apply(); }
          }}
          placeholder="there"
          style={{ fontSize: 13, padding: '5px 7px', border: '1px solid #E6E1F4', borderRadius: 4, outline: 'none', width: '100%' }}
        />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button
          type="button"
          onClick={apply}
          style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', background: '#6A4BD6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/**
 * VariableNode — inline atom node for substitution variables.
 * Renders as a styled <span> in the editor (via renderHTML + CSS).
 * Serializes to Resend triple-brace syntax via renderToReactEmail.
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
      variableId: { default: 'FIRST_NAME' },
      fallback: { default: 'there' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { variableId, fallback, ...rest } = HTMLAttributes;
    return [
      'span',
      mergeAttributes(rest, {
        'data-variable-id': variableId,
        'data-variable-fallback': fallback,
      }),
      `{{ ${variableId} }}`,
    ];
  },

  renderToReactEmail({ node }) {
    const variableId = node.attrs?.variableId ?? 'FIRST_NAME';
    const fallback = node.attrs?.fallback;
    // Custom contact properties need the `contact.` prefix in Resend template syntax.
    // Standard fields (FIRST_NAME, etc.) are referenced directly.
    const resendVar = STANDARD_RESEND_FIELDS.has(variableId)
      ? variableId
      : `contact.${variableId}`;
    const template = fallback
      ? `{{{${resendVar}|${fallback}}}}`
      : `{{{${resendVar}}}}`;
    return <span>{template}</span>;
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
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: 'variableNode',
        attrs: { variableId: 'FIRST_NAME', fallback: 'there' },
      })
      .run();
  },
};
