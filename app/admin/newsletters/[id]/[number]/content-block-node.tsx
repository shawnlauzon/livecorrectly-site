'use client';

import React from 'react';
import { EmailNode } from '@react-email/editor/core';
import { LIBRARY_BLOCK_TOKEN } from '@/lib/newsletter/library-block';

/**
 * ContentBlockNode — block-level atom for the newsletter library block.
 * Renders as a chip in the editor (styled like variable chips via CSS) and
 * serializes to `<p>[[newsletter-library]]</p>`, which replaceLibraryBlock()
 * swaps for the styled block at send time and strips from the web version.
 */
export const ContentBlockNode = EmailNode.create({
  name: 'contentBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    // Outrank StarterKit's generic div node, which would otherwise claim the element on paste
    return [{ tag: 'div[data-content-block]', priority: 1000 }];
  },

  renderHTML() {
    return ['div', { 'data-content-block': 'newsletter-library' }, ['span', {}, LIBRARY_BLOCK_TOKEN]];
  },

  renderText() {
    return LIBRARY_BLOCK_TOKEN;
  },

  renderToReactEmail() {
    return <p>{LIBRARY_BLOCK_TOKEN}</p>;
  },
});
