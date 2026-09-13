'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Extension, InputRule, type Content, type Editor, type JSONContent } from '@tiptap/core';
import { EditorProvider, useCurrentEditor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extension-placeholder';
import { StarterKit } from '@react-email/editor/extensions';
import { EmailTheming, useEditorImage, imageSlashCommand } from '@react-email/editor/plugins';
import { BubbleMenu, SlashCommand, defaultSlashCommands } from '@react-email/editor/ui';
import { composeReactEmail } from '@react-email/editor/core';
import { Liquid } from 'liquidjs';
import '@react-email/editor/themes/default.css';
import styles from './editor.module.css';
import adminStyles from '../../admin.module.css';
import { VariableNode, VariableEditForm, VARIABLE } from './variable-node';
import { ConditionalBlockNode, ConditionalBranchNode, ConditionalKeymap, IF_THEN_ELSE, DEFAULT_CONDITION } from './conditional-node';
import {
  types,
  careerDesigns,
  strategies,
  innerAuthorityTypes,
  innerAuthorityDescriptions,
  signatureThemes,
  notSelfThemes,
} from '@/lib/hd-chart/constants';
import type { Subscriber } from '@/lib/types/subscriber';

interface NewsletterData {
  number: number;
  subject: string;
  preview: string;
  slug: string | null;
  description: string;
  postscripts: string[];
  bodyJson: unknown | null;
  bodyHtml: string | null;
}

interface EditorHandle {
  getEmailHTML: () => Promise<string>;
  getJSON: () => JSONContent;
}

function getPassword(): string | null {
  return sessionStorage.getItem('adminPassword');
}

/** Bridges the TipTap editor instance into an imperative ref for save. */
function RefBridge({
  editorRef,
  onUpdate,
}: {
  editorRef: React.RefObject<EditorHandle | null>;
  onUpdate: () => void;
}) {
  const { editor } = useCurrentEditor();
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; });

  React.useImperativeHandle(editorRef, () => ({
    getEmailHTML: async () => {
      if (!editor) return '';
      return (await composeReactEmail({ editor })).html;
    },
    getJSON: () => editor?.getJSON() ?? { type: 'doc', content: [] },
  }), [editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => onUpdateRef.current();
    editor.on('update', handler);
    return () => { editor.off('update', handler); };
  }, [editor]);

  return null;
}

// Sort by category to match the visual grouping in the SlashCommand menu.
// The library's CommandList groups items by category but uses array indices
// for selection, so the array order must match the grouped display order.
// {{ → insert Variable node, {% → insert Conditional node
const BraceShortcuts = Extension.create({
  name: 'braceShortcuts',
  addInputRules() {
    return [
      new InputRule({
        find: /\{\{$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .insertContent({ type: 'variableNode', attrs: {} })
            .setNodeSelection(range.from)
            .run();
        },
      }),
      new InputRule({
        find: /\{%$/,
        handler: ({ chain, range }) => {
          chain()
            .deleteRange(range)
            .insertContent({
              type: 'conditionalBlock',
              content: [
                { type: 'conditionalBranch', attrs: { branchType: 'if', condition: DEFAULT_CONDITION }, content: [{ type: 'paragraph' }] },
                { type: 'conditionalBranch', attrs: { branchType: 'else', condition: '' }, content: [{ type: 'paragraph' }] },
              ],
            })
            .run();
        },
      }),
    ];
  },
});

const SLASH_CATEGORY_ORDER = ['Text', 'Media', 'Layout', 'Conditionals', 'Utility'];
const slashCommandItems = [...defaultSlashCommands, imageSlashCommand, VARIABLE, IF_THEN_ELSE]
  .sort((a, b) => {
    const ai = SLASH_CATEGORY_ORDER.indexOf(a.category);
    const bi = SLASH_CATEGORY_ORDER.indexOf(b.category);
    return (ai === -1 ? SLASH_CATEGORY_ORDER.length : ai) - (bi === -1 ? SLASH_CATEGORY_ORDER.length : bi);
  });


function EditorPanel({
  content,
  editorKey,
  num,
  subject,
  preview,
  slug,
  description,
  postscripts,
  setDirty,
  editorRef,
  onEditorUpdate,
}: {
  content: Content;
  editorKey: number;
  num: number;
  subject: string;
  preview: string;
  slug: string;
  description: string;
  postscripts: string[];
  setDirty: (d: boolean) => void;
  editorRef: React.RefObject<EditorHandle | null>;
  onEditorUpdate: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleUploadImage = useCallback(async (file: File) => {
    const pwd = getPassword();
    if (!pwd) throw new Error('Not authenticated');

    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${pwd}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Upload failed (${res.status})`);
    }

    const { url } = await res.json();
    return { url };
  }, []);

  const imageExtension = useEditorImage({ uploadImage: handleUploadImage });

  const extensions = useMemo(() => [
    StarterKit.configure({ CodeBlockPrism: false }),
    Placeholder.configure({
      placeholder: ({ node }: { node: { type: { name: string }; attrs: { level?: number } } }) => {
        if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
        return "Press '/' for commands, '{{' for variable, '{%' for conditional";
      },
      includeChildren: true,
    }),
    EmailTheming.configure({ theme: 'basic' }),
    imageExtension,
    VariableNode,
    ConditionalBlockNode,
    ConditionalBranchNode,
    ConditionalKeymap,
    BraceShortcuts,
  ], [imageExtension]);

  const handleSave = async () => {
    if (!editorRef.current) return;
    const pwd = getPassword();
    if (!pwd) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const html = await editorRef.current.getEmailHTML();
      const json = editorRef.current.getJSON();

      const res = await fetch(`/api/admin/newsletters/${num}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bodyJson: json,
          bodyHtml: html,
          subject: subject || undefined,
          preview: preview || undefined,
          slug: slug || null,
          description: description || undefined,
          postscripts,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      setSaveMessage('Saved');
      setDirty(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Save bar */}
      <div className={styles.saveBar}>
        {saveMessage && (
          <span
            className={
              saveMessage.startsWith('Error')
                ? styles.saveError
                : styles.saveSuccess
            }
          >
            {saveMessage}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className={styles.saveButton}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Editor */}
      <p className={styles.editorLabel}>Email body</p>
      <div className={styles.editorWrap}>
        <EditorProvider
          key={editorKey}
          extensions={extensions}
          content={content}
          immediatelyRender={false}
          editorProps={{
            transformPastedHTML(html) {
              // Strip inline styles and classes so PreservedStyle doesn't
              // capture colors/fonts the editor UI can't remove.
              const cleaned = html.replace(/\s+style="[^"]*"/gi, '').replace(/\s+class="[^"]*"/gi, '');

              // Unwrap conditional block/branch wrappers so that copying
              // text from one branch pastes only the text content, not the
              // entire conditional structure.
              const doc = new DOMParser().parseFromString(cleaned, 'text/html');
              doc.querySelectorAll('[data-type="conditional-block"], [data-branch-type]').forEach(el => {
                while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
                el.remove();
              });
              return doc.body.innerHTML;
            },
          }}
        >
          <RefBridge editorRef={editorRef} onUpdate={() => { setDirty(true); onEditorUpdate(); }} />
          <BubbleMenu hideWhenActiveNodes={['button', 'horizontalRule', 'variableNode']} hideWhenActiveMarks={['link']} />
          <BubbleMenu.LinkDefault />
          <BubbleMenu.ButtonDefault />
          <BubbleMenu.ImageDefault />
          <BubbleMenu
            trigger={({ editor: e }: { editor: Editor }) => e.isActive('variableNode')}
            placement="bottom"
          >
            <VariableEditForm />
          </BubbleMenu>
          <SlashCommand items={slashCommandItems} />
        </EditorProvider>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Preview pane — resolves Liquid + contact vars client-side
// ---------------------------------------------------------------------------

const liquidEngine = new Liquid();

/** Build a Liquid context from raw chart indices (client-side, no server deps). */
function buildPreviewContext(chart: { type: number; authority: number }): Record<string, string | boolean> {
  const typeIdx = chart.type;
  const authIdx = chart.authority;

  const decisionMakingStrategy =
    typeIdx === 2
      ? `${innerAuthorityDescriptions[authIdx]}, and then ${strategies[typeIdx]}`
      : `${strategies[typeIdx]}, and then ${innerAuthorityDescriptions[authIdx]}`;

  return {
    mode: 'email' as const,
    career_type: careerDesigns[typeIdx],
    type: types[typeIdx],
    strategy: strategies[typeIdx],
    inner_authority: innerAuthorityTypes[authIdx],
    inner_authority_description: innerAuthorityDescriptions[authIdx],
    signature_theme: signatureThemes[typeIdx],
    not_self_theme: notSelfThemes[typeIdx],
    decision_making_strategy: decisionMakingStrategy,

    isBuilder: typeIdx === 0 || typeIdx === 1,
    isClassicBuilder: typeIdx === 0,
    isExpressBuilder: typeIdx === 1,
    isInitiator: typeIdx === 2,
    isAdvisor: typeIdx === 3,
    isEvaluator: typeIdx === 4,
    isEmotional: authIdx === 0,
  };
}

/** Resolve preview HTML: escape Resend vars, run Liquid, replace contact/template vars. */
async function resolvePreview(
  html: string,
  subscriber: Subscriber,
): Promise<string> {
  const chart = subscriber.chart?.chart;
  if (!chart) return html;

  // 1. Escape non-Liquid template patterns so Liquid doesn't choke on them
  //    - Triple-brace Resend vars: {{{FIRST_NAME|there}}}
  //    - Legacy double-brace vars with non-identifier chars: {{chart:/lunar-cycle}}
  const escaped = html
    .replace(
      /\{\{\{([^}]+)\}\}\}/g,
      '{% raw %}{{{$1}}}{% endraw %}',
    )
    .replace(
      /\{\{([^}]*[^a-zA-Z0-9_ |'":,.\-}][^}]*)\}\}/g,
      (match) => `{% raw %}${match}{% endraw %}`,
    );

  // 2. Build context and run Liquid (include subscriber identity fields)
  const ctx: Record<string, string | boolean> = {
    ...buildPreviewContext(chart),
    first_name: subscriber.first_name || '',
    last_name: subscriber.last_name || '',
    email: subscriber.email || '',
    // Uppercase aliases for backward compat with stored newsletters
    FIRST_NAME: subscriber.first_name || '',
    LAST_NAME: subscriber.last_name || '',
    EMAIL: subscriber.email || '',
  };
  let resolved = await liquidEngine.parseAndRender(escaped, ctx);

  // 3. Replace Resend contact property vars: {{{contact.key|fallback}}} or {{{contact.key}}}
  resolved = resolved.replace(
    /\{\{\{contact\.([a-zA-Z_]+)(?:\|([^}]*))?\}\}\}/g,
    (_match: string, key: string, fallback?: string) => {
      const val = ctx[key];
      if (typeof val === 'string' && val) return val;
      return fallback ?? '';
    },
  );

  // 4. Replace Resend standard vars: {{{FIRST_NAME|fallback}}} or {{{FIRST_NAME}}}
  resolved = resolved.replace(
    /\{\{\{FIRST_NAME(?:\|([^}]*))?\}\}\}/g,
    (_match: string, fallback?: string) => subscriber.first_name || fallback || '',
  );
  resolved = resolved.replace(
    /\{\{\{LAST_NAME(?:\|([^}]*))?\}\}\}/g,
    (_match: string, fallback?: string) => subscriber.last_name || fallback || '',
  );
  resolved = resolved.replace(
    /\{\{\{EMAIL(?:\|([^}]*))?\}\}\}/g,
    (_match: string, fallback?: string) => subscriber.email || fallback || '',
  );

  return resolved;
}

/** Generate postscript prefix: P.S., P.P.S., P.P.P.S., etc. */
function getPostscriptPrefix(index: number): string {
  if (index === 0) return 'P.S.';
  return 'P.' + 'P.'.repeat(index) + 'S.';
}

/** Format a subscriber's profile number (e.g. 46 → "4/6"). */
function formatProfile(profile: number): string {
  const s = String(profile);
  if (s.length === 2) return `${s[0]}/${s[1]}`;
  return s;
}

function PreviewPane({
  editorRef,
  previewTrigger,
  postscripts,
}: {
  editorRef: React.RefObject<EditorHandle | null>;
  previewTrigger: number;
  postscripts: string[];
}) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch subscribers on mount
  useEffect(() => {
    const pwd = getPassword();
    if (!pwd) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/admin/subscribers', {
          headers: { Authorization: `Bearer ${pwd}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const subs: Subscriber[] = (data.subscribers ?? []).filter(
          (s: Subscriber) => s.chart?.chart != null,
        );
        if (cancelled) return;
        setSubscribers(subs);
        if (subs.length > 0) setSelectedId(subs[0].id);
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load subscribers');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Regenerate preview on trigger change or subscriber selection (debounced)
  useEffect(() => {
    if (!selectedId || !editorRef.current) return;

    const subscriber = subscribers.find(s => s.id === selectedId);
    if (!subscriber) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const html = await editorRef.current!.getEmailHTML();
        if (cancelled) return;
        const resolved = await resolvePreview(html, subscriber);
        if (!cancelled) setPreviewHtml(resolved);
      } catch (err) {
        console.error('Preview render error:', err);
        if (!cancelled) setPreviewHtml('<p style="color: var(--coral)">Preview error</p>');
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [previewTrigger, selectedId, subscribers, editorRef]);

  const subscriberLabel = useCallback((s: Subscriber) => {
    const chart = s.chart?.chart;
    const name = [s.first_name, s.last_name].filter(Boolean).join(' ');
    if (!chart) return name || s.email;
    const career = careerDesigns[chart.type] ?? '';
    const profile = chart.profile != null ? formatProfile(chart.profile) : '';
    return `${name} — ${career} (${profile})`;
  }, []);

  return (
    <div className={styles.rightColumn}>
      <div className={styles.previewHeader}>
        <span className={styles.previewLabel}>Preview</span>
        {fetchError ? (
          <span className={styles.previewEmpty}>{fetchError}</span>
        ) : (
          <select
            className={styles.previewSelect}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            {subscribers.length === 0 && (
              <option value="">Loading subscribers...</option>
            )}
            {subscribers.map(s => (
              <option key={s.id} value={s.id}>
                {subscriberLabel(s)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className={styles.previewBody}>
        {!previewHtml && subscribers.length > 0 && (
          <p className={styles.previewEmpty}>Type in the editor to see a preview</p>
        )}
        {previewHtml && (
          <div className={styles.previewEmailContainer}>
            {/* Logo */}
            <img
              src="/newsletter/permission-slip-logo.png"
              alt="Permission Slip"
              width={381}
              height={167}
              style={{ display: 'block', margin: '0 auto 24px' }}
            />
            {/* Body */}
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            {/* Signature */}
            <div style={{ marginTop: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <img
                src="/shawn-lauzon-headshot.jpg"
                alt="Shawn Lauzon headshot"
                width={48}
                height={48}
                style={{ borderRadius: '50%', flexShrink: 0 }}
              />
              <div>
                <div style={{ margin: 0, fontSize: '14px', fontWeight: 600, lineHeight: '20px', color: '#292524' }}>
                  Shawn Lauzon
                </div>
                <div style={{ margin: 0, fontSize: '12px', lineHeight: '16px', color: '#78716c' }}>
                  Certified Human Design for Business<br />
                  BG5 Career &amp; Business Consultant
                </div>
              </div>
            </div>
            {/* Postscripts */}
            {postscripts.filter(Boolean).map((ps, i) => (
              <p
                key={i}
                style={{
                  marginTop: '24px',
                  marginBottom: '16px',
                  fontSize: '16px',
                  fontStyle: 'italic',
                  lineHeight: '24px',
                  color: '#45585B',
                }}
              >
                {getPostscriptPrefix(i)} {ps}
              </p>
            ))}
            {/* Divider */}
            <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #C9C2B4' }} />
            {/* Footer */}
            <div style={{ fontSize: '12px', lineHeight: '18px', color: '#45585B' }}>
              Live Correctly<br />
              5305 Indio Drive, Austin, TX 78745
            </div>
            <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: '18px' }}>
              <span style={{ color: '#45585B', textDecoration: 'underline', cursor: 'default' }}>
                Unsubscribe
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewsletterEditorPage() {
  const router = useRouter();
  const params = useParams();
  const num = Number(params.number);

  const [data, setData] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_dirty, setDirty] = useState(false);

  // Metadata fields
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [postscripts, setPostscripts] = useState<string[]>([]);

  // Editor content — set once after load
  const [editorContent, setEditorContent] = useState<Content | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // Lifted editor ref + preview trigger
  const editorRef = useRef<EditorHandle | null>(null);
  const [previewTrigger, setPreviewTrigger] = useState(0);
  const handleEditorUpdate = useCallback(() => {
    setPreviewTrigger(t => t + 1);
  }, []);

  const fetchNewsletter = useCallback(async () => {
    const pwd = getPassword();
    if (!pwd) {
      router.push('/admin');
      return;
    }

    try {
      const res = await fetch(`/api/admin/newsletters/${num}`, {
        headers: { Authorization: `Bearer ${pwd}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem('adminPassword');
          router.push('/admin');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json: NewsletterData = await res.json();
      setData(json);
      setSubject(json.subject);
      setPreview(json.preview);
      setSlug(json.slug ?? '');
      setDescription(json.description);
      setPostscripts(json.postscripts ?? []);

      if (json.bodyJson) {
        setEditorContent(json.bodyJson as Content);
      } else {
        setEditorContent('<p></p>');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [num, router]);

  useEffect(() => {
    void (async () => { await fetchNewsletter(); })();
  }, [fetchNewsletter]);

  const handlePostscriptChange = (index: number, value: string) => {
    const updated = [...postscripts];
    updated[index] = value;
    setPostscripts(updated);
    setDirty(true);
  };

  const handleAddPostscript = () => {
    setPostscripts([...postscripts, '']);
    setDirty(true);
  };

  const handleRemovePostscript = (index: number) => {
    setPostscripts(postscripts.filter((_, i) => i !== index));
    setDirty(true);
  };

  if (loading) {
    return (
      <div className={adminStyles.container}>
        <p className={adminStyles.loading}>Loading newsletter #{num}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={adminStyles.container}>
        <p className={adminStyles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={adminStyles.title}>Newsletter #{num}</h1>
          <p className={adminStyles.subtitle}>
            <Link href="/admin/newsletters" style={{ color: 'var(--grape)' }}>
              Back to newsletters
            </Link>
            {data?.bodyJson != null && (
              <span className={styles.badge}>Saved</span>
            )}
          </p>
        </div>
      </div>

      {/* Metadata panel */}
      <div className={styles.metadataPanel}>
        <div className={styles.metadataGrid}>
          <label className={styles.fieldLabel}>
            Subject
            <input
              type="text"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setDirty(true); }}
              className={styles.fieldInput}
            />
          </label>
          <label className={styles.fieldLabel}>
            Preview text
            <input
              type="text"
              value={preview}
              onChange={(e) => { setPreview(e.target.value); setDirty(true); }}
              className={styles.fieldInput}
            />
          </label>
          <label className={styles.fieldLabel}>
            Slug
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setDirty(true); }}
              className={styles.fieldInput}
              placeholder="url-safe-slug"
            />
          </label>
          <label className={styles.fieldLabel}>
            Description
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
              className={styles.fieldInput}
            />
          </label>
        </div>
      </div>

      {/* Split layout: editor + postscripts (left) | preview (right) */}
      <div className={styles.splitContainer}>
        <div className={styles.leftColumn}>
          {/* Editor */}
          {editorContent !== null && (
            <EditorPanel
              content={editorContent}
              editorKey={editorKey}
              num={num}
              subject={subject}
              preview={preview}
              slug={slug}
              description={description}
              postscripts={postscripts}
              setDirty={setDirty}
              editorRef={editorRef}
              onEditorUpdate={handleEditorUpdate}
            />
          )}

          {/* Postscripts */}
          <div className={styles.postscriptsSection}>
            <h3 className={styles.sectionTitle}>Postscripts</h3>
            {postscripts.map((ps, i) => (
              <div key={i} className={styles.postscriptRow}>
                <span className={styles.postscriptLabel}>P.{i > 0 ? 'P.'.repeat(i) : ''}S.</span>
                <input
                  type="text"
                  value={ps}
                  onChange={(e) => handlePostscriptChange(i, e.target.value)}
                  className={styles.fieldInput}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => handleRemovePostscript(i)}
                  className={styles.removeButton}
                  title="Remove postscript"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              onClick={handleAddPostscript}
              className={styles.addButton}
            >
              + Add postscript
            </button>
          </div>
        </div>

        {/* Live preview pane */}
        {editorContent !== null && (
          <PreviewPane
            editorRef={editorRef}
            previewTrigger={previewTrigger}
            postscripts={postscripts}
          />
        )}
      </div>

    </div>
  );
}

