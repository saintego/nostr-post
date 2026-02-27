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
        uiPlugin: 'textarea',
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

  'geo-review': {
    id: 'geo-review-v1',
    version: '1.0.0',
    requiredKinds: [1],
    fields: [
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: {
          label: 'Review',
          placeholder: 'What did you think of this place?',
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
          max: 5,
          showNumber: true,
        },
      },
      {
        id: 'location',
        type: 'geo',
        uiPlugin: 'geo',
        mapTo: { kind: 1, target: 'tag', tagName: 'geo' },
        required: false,
        metadata: {
          label: 'Location',
          defaultZoom: 13,
        },
      },
    ],
    metadata: {
      name: 'Location Review',
      description: 'Review a place with star rating and map location',
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
        uiPlugin: 'textarea',
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

  'blog-post': {
    id: 'blog-post-v1',
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
          placeholder: 'Post title...',
        },
      },
      {
        id: 'image',
        type: 'string',
        uiPlugin: 'media',
        mapTo: { kind: 30023, target: 'tag', tagName: 'image' },
        metadata: {
          label: 'Header Image',
          accept: 'image/*',
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
          placeholder: 'Write your blog post...',
          defaultMode: 'wysiwyg',
          minHeight: 300,
        },
      },
    ],
    metadata: {
      name: 'Blog Post',
      description: 'Long-form blog post with header image and markdown editor',
    },
  },

  'photo-post': {
    id: 'photo-post-v1',
    version: '1.0.0',
    requiredKinds: [1],
    fields: [
      {
        id: 'caption',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        metadata: {
          label: 'Caption',
          placeholder: 'Describe your photo...',
        },
      },
      {
        id: 'photo',
        type: 'string',
        uiPlugin: 'media',
        mapTo: { kind: 1, target: 'tag', tagName: 'url' },
        required: true,
        metadata: {
          label: 'Photo',
          accept: 'image/*',
        },
      },
      {
        id: 'location',
        type: 'geo',
        uiPlugin: 'geo',
        mapTo: { kind: 1, target: 'tag', tagName: 'geo' },
        metadata: {
          label: 'Location',
          defaultZoom: 13,
        },
      },
    ],
    metadata: {
      name: 'Photo Post',
      description: 'Share a photo with caption and optional location',
    },
  },
};
