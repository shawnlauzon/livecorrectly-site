'use client';

import React from 'react';
import type { SlashCommandItem } from '@react-email/editor/ui';
import { CONTENT_BLOCKS_CATEGORY } from './content-block-trigger';

/**
 * Slash command entry (Content blocks group) for inserting the newsletter library block.
 *
 * Inserts a ContentBlockNode, which saves as the block token; replaceLibraryBlock()
 * swaps it for the styled block (with the reader's link) at send time and
 * strips it from the web version.
 */
export const NEWSLETTER_LIBRARY: SlashCommandItem = {
  title: 'Newsletter library',
  description: 'Callout linking the reader to their personalized newsletter library',
  searchTerms: ['newsletter', 'library', 'archive', 'past issues', 'content block', 'block'],
  icon: <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>{'[ ]'}</span>,
  category: CONTENT_BLOCKS_CATEGORY,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({ type: 'contentBlock' })
      .run();
  },
};
