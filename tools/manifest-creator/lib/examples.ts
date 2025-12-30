import type { NostrPostManifest } from '@nostr-post/core/types';
import { DEFAULT_KIND1_MANIFEST } from '@nostr-post/core/types';

export const EXAMPLE_MANIFESTS: Record<string, NostrPostManifest> = {
  simple: DEFAULT_KIND1_MANIFEST,

  review: {
    id: 'restaurant-review-v1',
    version: '1.0.0',
    requiredKinds: [1],
    fields: [
      {
        id: 'reviewText',
        type: 'string',
        uiPlugin: 'markdown',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: {
          label: 'Review',
          placeholder: 'Share your experience...',
        },
      },
      {
        id: 'rating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 1, target: 'tag', tagName: 'rating' },
        required: true,
        metadata: {
          label: 'Rating',
        },
      },
      {
        id: 'venueName',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'venue' },
        required: true,
        metadata: {
          label: 'Venue Name',
          placeholder: 'Restaurant or cafe name',
        },
      },
    ],
    metadata: {
      name: 'Restaurant Review',
      description: 'Structured restaurant reviews with ratings',
    },
  },

  article: {
    id: 'article-v1',
    version: '1.0.0',
    requiredKinds: [30023],
    fields: [
      {
        id: 'title',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30023, target: 'tag', tagName: 'title' },
        required: true,
        metadata: {
          label: 'Title',
          placeholder: 'Article title',
        },
      },
      {
        id: 'summary',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 30023, target: 'tag', tagName: 'summary' },
        metadata: {
          label: 'Summary',
          placeholder: 'Brief summary',
        },
      },
      {
        id: 'content',
        type: 'string',
        uiPlugin: 'markdown',
        mapTo: { kind: 30023, target: 'content' },
        required: true,
        metadata: {
          label: 'Content',
          placeholder: 'Write your article...',
        },
      },
    ],
    metadata: {
      name: 'Article (NIP-23)',
      description: 'Long-form content',
    },
  },
};
