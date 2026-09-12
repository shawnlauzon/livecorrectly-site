'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { EmailEditor, type EmailEditorRef } from '@react-email/editor';
import type { Content } from '@tiptap/core';
import '@react-email/editor/themes/default.css';
import styles from './editor.module.css';
import adminStyles from '../../admin.module.css';

interface NewsletterData {
  number: number;
  subject: string;
  preview: string;
  slug: string | null;
  description: string;
  image: string | null;
  postscripts: string[];
  bodyJson: unknown | null;
  bodyHtml: string | null;
  bodyMarkdown: string;
}

function getPassword(): string | null {
  return sessionStorage.getItem('adminPassword');
}

function EditorPanel({
  content,
  editorKey,
  num,
  subject,
  preview,
  slug,
  description,
  image,
  postscripts,
  setDirty,
}: {
  content: Content;
  editorKey: number;
  num: number;
  subject: string;
  preview: string;
  slug: string;
  description: string;
  image: string;
  postscripts: string[];
  setDirty: (d: boolean) => void;
}) {
  const editorRef = useRef<EmailEditorRef>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
          image: image || null,
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
        <EmailEditor
          key={editorKey}
          ref={editorRef}
          content={content}
          theme="basic"
          onUpdate={() => setDirty(true)}
        />
      </div>
    </>
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

  // Metadata fields
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [postscripts, setPostscripts] = useState<string[]>([]);

  // Import markdown modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMarkdown, setImportMarkdown] = useState('');

  // Editor content — set once after load or import
  const [editorContent, setEditorContent] = useState<Content | null>(null);
  const [editorKey, setEditorKey] = useState(0);

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
      setImage(json.image ?? '');
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

  const handleImportMarkdown = () => {
    if (!importMarkdown.trim()) return;
    const html = basicMarkdownToHtml(importMarkdown);
    setEditorContent(html);
    setEditorKey(k => k + 1);
    setShowImportModal(false);
    setImportMarkdown('');
    setDirty(true);
  };

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
        <button
          onClick={() => {
            setImportMarkdown(data?.bodyMarkdown ?? '');
            setShowImportModal(true);
          }}
          className={styles.importButton}
        >
          Import from Markdown
        </button>
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
          <label className={styles.fieldLabel}>
            Image filename
            <input
              type="text"
              value={image}
              onChange={(e) => { setImage(e.target.value); setDirty(true); }}
              className={styles.fieldInput}
              placeholder="hero.jpg"
            />
          </label>
        </div>
      </div>

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
          image={image}
          postscripts={postscripts}
          setDirty={setDirty}
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

      {/* Import Markdown Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Import from Markdown</h3>
            <p className={styles.modalDescription}>
              Paste markdown below. It will be converted to the visual editor format.
              The existing markdown content is pre-filled.
            </p>
            <textarea
              value={importMarkdown}
              onChange={(e) => setImportMarkdown(e.target.value)}
              className={styles.markdownTextarea}
              rows={20}
              placeholder="Paste markdown here..."
            />
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowImportModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleImportMarkdown}
                className={styles.saveButton}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Basic markdown to HTML conversion for editor import.
 */
function basicMarkdownToHtml(md: string): string {
  let html = md;

  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^\*\*\*$/gm, '<hr>');

  html = html.replace(/^(?:- (.+)\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^- /, '');
      return `<li>${content}</li>`;
    }).join('');
    return `<ul>${items}</ul>`;
  });

  html = html.replace(/^(?:\d+\. (.+)\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      const content = line.replace(/^\d+\.\s/, '');
      return `<li>${content}</li>`;
    }).join('');
    return `<ol>${items}</ol>`;
  });

  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  const lines = html.split('\n');
  const result: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      inBlock = false;
      continue;
    }
    if (/^<(h[1-6]|ul|ol|li|blockquote|hr|div|table|p)/.test(trimmed)) {
      result.push(trimmed);
      inBlock = false;
    } else if (!inBlock && !trimmed.startsWith('<')) {
      result.push(`<p>${trimmed}</p>`);
    } else {
      result.push(trimmed);
    }
  }

  return result.join('\n');
}
