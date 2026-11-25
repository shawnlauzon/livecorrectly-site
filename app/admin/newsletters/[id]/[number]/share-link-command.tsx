'use client';

import React from 'react';
import type { JSONContent } from '@tiptap/core';
import type { SlashCommandItem } from '@react-email/editor/ui';
import { SHARE_COPY, SHARE_URL_VAR } from '@/lib/newsletter/share';
import { CONTENT_BLOCKS_CATEGORY } from './content-block-trigger';

/**
 * The share words as a link whose address is `{{share_url}}`. It's ordinary
 * linked text, so the words can be edited; replaceShareUrl() fills in the
 * address at send time.
 */
export function shareLinkContent(): JSONContent {
  return {
    type: 'text',
    text: SHARE_COPY.link,
    marks: [{ type: 'link', attrs: { href: `{{${SHARE_URL_VAR}}}` } }],
  };
}

/** Slash command entry (Content blocks group) for inserting a share link. */
export const SHARE_LINK: SlashCommandItem = {
  title: 'Share link',
  description: 'Link that lets the reader email this issue to a friend',
  searchTerms: ['share', 'forward', 'friend', 'refer', 'send', 'content block', 'block'],
  icon: <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>{'[ ]'}</span>,
  category: CONTENT_BLOCKS_CATEGORY,
  command: ({ editor, range }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent(shareLinkContent())
      .run();
  },
};
