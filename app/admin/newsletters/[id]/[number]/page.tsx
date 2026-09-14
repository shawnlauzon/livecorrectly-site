'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import NextLink from 'next/link';
import { Extension, InputRule, type Content, type Editor, type JSONContent } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { EditorProvider, useCurrentEditor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extension-placeholder';
import { StarterKit, Link } from '@react-email/editor/extensions';
import { EmailTheming, extendTheme, useEditorImage, imageSlashCommand } from '@react-email/editor/plugins';
import { BubbleMenu, SlashCommand, defaultSlashCommands } from '@react-email/editor/ui';
import { composeReactEmail } from '@react-email/editor/core';
import { toast, Toaster } from 'sonner';
import { EmailNewsletter } from '@/components/admin/email-newsletter';
import { LinkBubble, TextBubbleMenu } from './link-bubble';
import '@react-email/editor/themes/default.css';
import styles from './editor.module.css';
import adminStyles from '../../../admin.module.css';
import { VariableNode, VariableEditForm, VARIABLE } from './variable-node';
import { ConditionalBlockNode, ConditionalBranchNode, ConditionalKeymap, IF_THEN_ELSE, DEFAULT_CONDITION } from './conditional-node';
import { types, innerAuthorityTypes } from '@/lib/hd-chart/constants';
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
  updatedAt: string;
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

const variableBubblePluginKey = new PluginKey('variableBubbleMenu');

/** Extend the editor's Link mark to store a `data-relative` attribute. */
const RelativeLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-relative': {
        default: null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-relative') === 'true' ? 'true' : null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs['data-relative'] === 'true' ? { 'data-relative': 'true' } : {},
      },
    };
  },
});

/**
 * Walk a TipTap JSON tree and collect hrefs that have `data-relative: "true"`.
 * Used at save time to re-inject the attribute into the HTML that
 * composeReactEmail() strips.
 */
function collectRelativeHrefs(json: JSONContent): Set<string> {
  const hrefs = new Set<string>();
  function walk(node: JSONContent) {
    for (const mark of node.marks ?? []) {
      if (
        mark.type === 'link' &&
        mark.attrs?.['data-relative'] === 'true' &&
        mark.attrs?.href
      ) {
        hrefs.add(mark.attrs.href as string);
      }
    }
    for (const child of node.content ?? []) walk(child);
  }
  walk(json);
  return hrefs;
}

/**
 * Re-inject `data-relative="true"` into `<a>` tags whose hrefs are marked
 * relative in the TipTap JSON. Needed because composeReactEmail() strips
 * custom data-* attributes from link marks.
 */
function injectRelativeAttrs(html: string, json: JSONContent): string {
  const relativeHrefs = collectRelativeHrefs(json);
  let result = html;
  for (const href of relativeHrefs) {
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`(<a\\b[^>]*?href="${escaped}"[^>]*?)(/?>)`, 'g'),
      '$1 data-relative="true"$2',
    );
  }
  return result;
}

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
  dirty,
  setDirty,
  editorRef,
  onEditorUpdate,
  updatedAt,
  setUpdatedAt,
  onConflict,
  conflicted,
}: {
  content: Content;
  editorKey: number;
  num: number;
  subject: string;
  preview: string;
  slug: string;
  description: string;
  postscripts: string[];
  dirty: boolean;
  setDirty: (d: boolean) => void;
  editorRef: React.RefObject<EditorHandle | null>;
  onEditorUpdate: () => void;
  updatedAt: string | null;
  setUpdatedAt: (ts: string) => void;
  onConflict: () => void;
  conflicted: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const savingRef = useRef(false);
  const conflictedRef = useRef(conflicted);
  useEffect(() => { conflictedRef.current = conflicted; }, [conflicted]);

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
      const message = err.error || `Upload failed (${res.status})`;
      toast.error(message);
      throw new Error(message);
    }

    const { url } = await res.json();
    return { url };
  }, []);

  const imageExtension = useEditorImage({ uploadImage: handleUploadImage });

  const extensions = useMemo(() => [
    StarterKit.configure({ CodeBlockPrism: false, Link: false }),
    RelativeLink,
    Placeholder.configure({
      placeholder: ({ node }: { node: { type: { name: string }; attrs: { level?: number } } }) => {
        if (node.type.name === 'heading') return `Heading ${node.attrs.level}`;
        return "Press '/' for commands, '{{' for variable, '{%' for conditional";
      },
      includeChildren: true,
    }),
    EmailTheming.configure({
      theme: extendTheme('basic', {
        h1: { fontFamily: "'Fraunces', Georgia, serif" },
        h2: { fontFamily: "'Fraunces', Georgia, serif" },
        h3: { fontFamily: "'Fraunces', Georgia, serif" },
        list: { paddingBottom: '0.25em' },
        listItem: { paddingTop: '0.1em', paddingBottom: '0.1em' },
      }),
    }),
    imageExtension,
    VariableNode,
    ConditionalBlockNode,
    ConditionalBranchNode,
    ConditionalKeymap,
    BraceShortcuts,
  ], [imageExtension]);

  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    const pwd = getPassword();
    if (!pwd) return;
    if (savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setSaveMessage(null);

    try {
      const html = await editorRef.current.getEmailHTML();
      const json = editorRef.current.getJSON();
      const processedHtml = injectRelativeAttrs(html, json);

      const res = await fetch(`/api/admin/newsletters/${num}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${pwd}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bodyJson: json,
          bodyHtml: processedHtml,
          subject: subject || undefined,
          preview: preview || undefined,
          slug: slug || null,
          description: description || undefined,
          postscripts,
          expectedUpdatedAt: updatedAt,
        }),
      });

      if (res.status === 409) {
        onConflict();
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      if (resData.updatedAt) {
        setUpdatedAt(resData.updatedAt);
      }

      const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setSaveMessage(`Saved at ${time}`);
      setDirty(false);
    } catch (err) {
      setSaveMessage(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [editorRef, num, subject, preview, slug, description, postscripts, setDirty, updatedAt, setUpdatedAt, onConflict]);

  // Auto-save every 30 seconds when dirty
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && !savingRef.current && !conflictedRef.current) {
        void handleSaveRef.current();
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSaveRef.current();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* Conflict warning banner */}
      {conflicted && (
        <div className={styles.conflictBanner}>
          <span>This newsletter was saved in another window. Reload to get the latest version, or save again to overwrite.</span>
          <button
            onClick={() => window.location.reload()}
            className={styles.conflictReloadButton}
          >
            Reload
          </button>
        </div>
      )}

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
          <TextBubbleMenu />
          <LinkBubble />
          <BubbleMenu.ButtonDefault />
          <BubbleMenu.ImageDefault />
          <BubbleMenu
            pluginKey={variableBubblePluginKey}
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
// Preview pane — resolves Liquid + contact vars via server API
// ---------------------------------------------------------------------------

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
  num,
}: {
  editorRef: React.RefObject<EditorHandle | null>;
  previewTrigger: number;
  postscripts: string[];
  num: number;
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
        const rawHtml = await editorRef.current!.getEmailHTML();
        const json = editorRef.current!.getJSON();
        const html = injectRelativeAttrs(rawHtml, json);
        if (cancelled) return;
        const pwd = getPassword();
        const res = await fetch('/api/admin/newsletters/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(pwd ? { Authorization: `Bearer ${pwd}` } : {}),
          },
          body: JSON.stringify({ html, subscriberId: subscriber.id, newsletterNumber: num, postscripts }),
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setPreviewHtml(data.html);
      } catch (err) {
        console.error('Preview render error:', err);
        if (!cancelled) setPreviewHtml('<p style="color: var(--coral)">Preview error</p>');
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [previewTrigger, selectedId, subscribers, editorRef, postscripts, num]);

  const subscriberLabel = useCallback((s: Subscriber) => {
    const chart = s.chart?.chart;
    const name = [s.first_name, s.last_name].filter(Boolean).join(' ');
    if (!chart) return name || s.email;
    const profile = chart.profile != null ? formatProfile(chart.profile) : '';
    const hdType = types[chart.type] ?? '';
    let authority = innerAuthorityTypes[chart.authority] ?? '';
    if (authority === 'None') {
      // Reflector has no authority qualifier; Projector with no authority is "Mental"
      authority = hdType === 'Reflector' ? '' : 'Mental';
    }
    return `${name} — ${[profile, authority, hdType].filter(Boolean).join(' ')}`;
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
          <EmailNewsletter
            html={previewHtml}
            className={styles.previewEmailContainer}
          />
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
  const [dirty, setDirty] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [conflicted, setConflicted] = useState(false);

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
      setUpdatedAt(json.updatedAt);

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
      <Toaster position="top-center" richColors />
      <div className={styles.pageHeader}>
        <div>
          <h1 className={adminStyles.title}>Newsletter {params.id} — Issue {num}</h1>
          <p className={adminStyles.subtitle}>
            <NextLink href={`/admin/newsletters/${params.id}`} style={{ color: 'var(--grape)' }}>
              Back to newsletters
            </NextLink>
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
              dirty={dirty}
              setDirty={setDirty}
              editorRef={editorRef}
              onEditorUpdate={handleEditorUpdate}
              updatedAt={updatedAt}
              setUpdatedAt={setUpdatedAt}
              onConflict={() => setConflicted(true)}
              conflicted={conflicted}
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
            num={num}
          />
        )}
      </div>

    </div>
  );
}

