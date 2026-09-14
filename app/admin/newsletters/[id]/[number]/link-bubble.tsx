'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PluginKey } from '@tiptap/pm/state';
import { useCurrentEditor } from '@tiptap/react';
import { BubbleMenu, bubbleMenuTriggers, useBubbleMenuContext } from '@react-email/editor/ui';
import styles from './editor.module.css';

const linkBubblePluginKey = new PluginKey('relativeLinkBubbleMenu');
const textBubblePluginKey = new PluginKey('textBubbleMenu');

/**
 * Custom link form that adds a "Relative to chart page" checkbox.
 *
 * Replaces `BubbleMenu.LinkForm` — reads `href` and `data-relative` from the
 * active link mark, and writes both back via `setMark()`.
 */
function LinkFormWithRelative() {
  const { editor, isEditing, setIsEditing } = useBubbleMenuContext();

  const [inputValue, setInputValue] = useState('');
  const [isRelative, setIsRelative] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Sync form state from the active link mark when entering edit mode
  // Uses the derive-during-render pattern to avoid synchronous setState in effects
  const [prevIsEditing, setPrevIsEditing] = useState(false);
  if (isEditing !== prevIsEditing) {
    setPrevIsEditing(isEditing);
    if (isEditing && editor) {
      const attrs = editor.getAttributes('link');
      setInputValue(attrs.href ?? '');
      setIsRelative(attrs['data-relative'] === 'true');
    }
  }

  // Focus the input after a tick so the bubble menu has rendered
  useEffect(() => {
    if (!isEditing) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isEditing]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = inputValue.trim();

    if (!href) {
      // Remove the link
      editor.chain().extendMarkRange('link').unsetLink().run();
      setIsEditing(false);
      return;
    }

    // For non-relative links, auto-prefix https:// if needed
    let finalHref = href;
    if (!isRelative) {
      if (href === '#' || /^(https?:|mailto:|tel:)/i.test(href)) {
        finalHref = href;
      } else if (/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}/i.test(href)) {
        finalHref = `https://${href}`;
      }
    }

    // Validate: relative must start with /
    if (isRelative && !finalHref.startsWith('/')) {
      finalHref = `/${finalHref}`;
    }

    editor
      .chain()
      .extendMarkRange('link')
      .setMark('link', {
        href: finalHref,
        'data-relative': isRelative ? 'true' : null,
      })
      .run();

    setIsEditing(false);
  }, [editor, inputValue, isRelative, setIsEditing]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      applyLink();
    },
    [applyLink],
  );

  const handleUnlink = useCallback(() => {
    if (!editor) return;
    editor.chain().extendMarkRange('link').unsetLink().run();
    setIsEditing(false);
  }, [editor, setIsEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditing(false);
      }
      // Stop propagation to prevent editor shortcuts from firing
      e.stopPropagation();
    },
    [setIsEditing],
  );

  if (!isEditing) return null;

  const displayHref = editor?.getAttributes('link').href;

  return (
    <form
      ref={formRef}
      data-re-link-bm-form=""
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        data-re-link-bm-input=""
        placeholder={isRelative ? '/path-on-chart-page' : 'Paste a link'}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={(e) => e.stopPropagation()}
      />
      <div className={styles.relativeLinkRow}>
        <input
          type="checkbox"
          id="relative-link-checkbox"
          className={styles.relativeLinkCheckbox}
          checked={isRelative}
          onChange={(e) => setIsRelative(e.target.checked)}
        />
        <label htmlFor="relative-link-checkbox" className={styles.relativeLinkLabel}>
          Relative to chart page
        </label>
      </div>
      {displayHref ? (
        <button type="button" data-re-link-bm-unlink="" onClick={handleUnlink}>
          Remove
        </button>
      ) : (
        <button type="submit" data-re-link-bm-apply="">
          Apply
        </button>
      )}
    </form>
  );
}

/**
 * Custom link bubble menu that extends the default with a "relative link"
 * checkbox. Composes the same library primitives as BubbleMenu.LinkDefault
 * but swaps the form.
 */
export function LinkBubble() {
  return (
    <BubbleMenu.Root
      pluginKey={linkBubblePluginKey}
      trigger={bubbleMenuTriggers.nodeWithoutSelection('link')}
      placement="top"
    >
      <BubbleMenu.LinkToolbar>
        <BubbleMenu.LinkEditLink />
        <BubbleMenu.LinkOpenLink />
        <BubbleMenu.LinkUnlink />
      </BubbleMenu.LinkToolbar>
      <LinkFormWithRelative />
    </BubbleMenu.Root>
  );
}

/**
 * Composed text bubble menu with a "Relative to chart page" checkbox in the
 * link selector. Uses refs to avoid stale closures — BubbleMenu.LinkSelector
 * captures callback references internally, so we read the latest `isRelative`
 * and `editor` from refs rather than closure captures.
 */
export function TextBubbleMenu() {
  const { editor } = useCurrentEditor();
  const [isRelative, setIsRelative] = useState(false);

  // Refs to break stale closures in BubbleMenu.LinkSelector callbacks
  const isRelativeRef = useRef(false);
  const editorRef = useRef(editor);
  useEffect(() => {
    isRelativeRef.current = isRelative;
    editorRef.current = editor;
  });

  const validateUrl = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // When "relative" is checked, accept any path
    if (isRelativeRef.current) {
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    }
    // Standard absolute URL handling
    if (trimmed === '#') return '#';
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
    return null;
  }, []);

  const handleLinkApply = useCallback((_href: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    if (isRelativeRef.current) {
      ed.chain()
        .extendMarkRange('link')
        .updateAttributes('link', { 'data-relative': 'true' })
        .run();
    }
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      // When link selector opens, read current link's data-relative attribute
      const ed = editorRef.current;
      if (ed) {
        const attrs = ed.getAttributes('link');
        setIsRelative(attrs['data-relative'] === 'true');
      } else {
        setIsRelative(false);
      }
    }
  }, []);

  return (
    <BubbleMenu.Root
      pluginKey={textBubblePluginKey}
      hideWhenActiveNodes={['button', 'horizontalRule', 'variableNode']}
      hideWhenActiveMarks={['link']}
    >
      <BubbleMenu.NodeSelector />
      <BubbleMenu.LinkSelector
        validateUrl={validateUrl}
        onLinkApply={handleLinkApply}
        onOpenChange={handleOpenChange}
      >
        <div className={styles.relativeLinkRow}>
          <input
            type="checkbox"
            id="text-relative-link-checkbox"
            className={styles.relativeLinkCheckbox}
            checked={isRelative}
            onChange={(e) => setIsRelative(e.target.checked)}
          />
          <label htmlFor="text-relative-link-checkbox" className={styles.relativeLinkLabel}>
            Relative to chart page
          </label>
        </div>
      </BubbleMenu.LinkSelector>
      <BubbleMenu.ItemGroup>
        <BubbleMenu.Bold />
        <BubbleMenu.Italic />
        <BubbleMenu.Underline />
        <BubbleMenu.Strike />
        <BubbleMenu.Code />
        <BubbleMenu.Uppercase />
      </BubbleMenu.ItemGroup>
      <BubbleMenu.ItemGroup>
        <BubbleMenu.AlignLeft />
        <BubbleMenu.AlignCenter />
        <BubbleMenu.AlignRight />
      </BubbleMenu.ItemGroup>
    </BubbleMenu.Root>
  );
}
