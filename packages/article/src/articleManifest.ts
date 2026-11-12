/**
 * @nostr-post/article - NIP-23 article manifest (kind 30023)
 *
 * A long-form article as other long-form clients read it: `title`, `summary`, `image`,
 * `published_at` (the first publishing, kept by edits), `t` topics and the Markdown text as the
 * content. The d-tag is generated once and kept, so edits replace the article.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';

/** NIP-23 long-form content */
export const ARTICLE_KIND = 30023;

const target = (tagName?: string) =>
  tagName
    ? { kind: ARTICLE_KIND, target: 'tag' as const, tagName }
    : { kind: ARTICLE_KIND, target: 'content' as const };

export const ARTICLE_MANIFEST: NostrPostManifest = {
  id: 'article-v1',
  version: '1.0.0',
  publishFormats: [
    {
      id: 'article',
      label: 'Article',
      description: 'A long-form article (NIP-23, kind 30023)',
      kinds: [ARTICLE_KIND],
      default: true,
    },
  ],
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: target('title'),
      required: true,
      metadata: { label: 'Title', description: "The article's title" },
    },
    {
      id: 'summary',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: target('summary'),
      metadata: {
        label: 'Summary',
        description: 'A few sentences about the article, shown in lists and link previews',
      },
    },
    {
      id: 'image',
      type: 'string',
      uiPlugin: 'media',
      mapTo: target('image'),
      metadata: {
        label: 'Image',
        description: 'A header image',
        accept: ['image/*'],
        maxFiles: 1,
        expandable: true,
      },
    },
    {
      id: 'body',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: target(),
      required: true,
      metadata: {
        label: 'Text',
        description: 'The article, in Markdown: headings, lists, links, images, quotes',
        minHeight: 320,
      },
    },
    {
      id: 'tags',
      type: 'string',
      uiPlugin: 'hashtag',
      attachTo: 'body',
      mapTo: target('t'),
      metadata: { label: 'Topics', description: 'Topics, so readers find the article' },
    },
    {
      id: 'published',
      type: 'date',
      uiPlugin: 'date',
      mapTo: target('published_at'),
      metadata: {
        label: 'Published',
        description: 'When it was first published; empty: when you publish it. Edits keep it',
        precision: 'time',
        defaultNow: true,
        expandable: true,
      },
    },
  ],
  // The header image under the title, then the text; topics and the date after it
  viewOrder: ['image', 'summary', 'body'],
  metadata: {
    name: 'Article',
    description:
      'A long-form article (NIP-23, kind 30023): interviews, reports, essays, in Markdown, readable in other long-form clients',
  },
};
