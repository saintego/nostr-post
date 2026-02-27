import type { NostrPostManifest } from '@nostr-post/core/types';
import { DEFAULT_KIND1_MANIFEST } from '@nostr-post/core/types';

export const EXAMPLE_MANIFESTS: Record<string, NostrPostManifest> = {
  simple: {
    id: 'kind1-note',
    version: '1.0.0',
    requiredKinds: [1],
    fields: [
      {
        id: 'content',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        mapTo: { kind: 1, target: 'tag', tagName: 't' },
        defaultValue: ['test', 'nostr-post'],
        metadata: {
          label: 'Tags',
        },
      },
    ],
  },

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
        mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        required: true,
        metadata: {
          label: 'Location',
          precision: 6,
        },
      },
      {
        id: 'photos',
        type: 'string',
        uiPlugin: 'media',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        metadata: {
          label: 'Photos',
          accept: ['image/*'],
          maxFiles: 5,
        },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        mapTo: { kind: 1, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Tags',
          suggestions: ['restaurant', 'cafe', 'bar', 'park', 'museum', 'hotel'],
        },
      },
    ],
    metadata: {
      name: 'Location Review',
      description: 'Review a place with star rating, map location, photos, and hashtags',
    },
  },

  'venue-review': {
    id: 'venue-review-v1',
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
          placeholder: 'What did you think of this venue?',
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
        id: 'venue',
        type: 'geo',
        uiPlugin: 'venue',
        mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        required: true,
        metadata: {
          label: 'Venue',
          precision: 6,
          providers: ['osm'],
        },
      },
      {
        id: 'photos',
        type: 'string',
        uiPlugin: 'media',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        metadata: {
          label: 'Photos',
          accept: ['image/*'],
          maxFiles: 5,
        },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        mapTo: { kind: 1, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Tags',
          suggestions: ['restaurant', 'cafe', 'bar', 'park', 'museum', 'hotel'],
        },
      },
    ],
    metadata: {
      name: 'Venue Review',
      description: 'Review a specific venue with OSM linking, star rating, photos, and hashtags',
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
        mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        metadata: {
          label: 'Location',
          precision: 6,
        },
      },
    ],
    metadata: {
      name: 'Photo Post',
      description: 'Share a photo with caption and optional location',
    },
  },

  'cafe-review': {
    id: 'cafe-review-v1',
    version: '1.0.0',
    requiredKinds: [1, 30078],
    fields: [
      // Kind 1: the main review text (visible to all Nostr clients)
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: {
          label: 'Review',
          placeholder: 'Share your cafe experience...',
        },
      },
      {
        id: 'cafeName',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'venue' },
        required: true,
        metadata: {
          label: 'Cafe Name',
          placeholder: 'Name of the cafe',
        },
      },
      {
        id: 'overallRating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 1, target: 'tag', tagName: 'rating' },
        required: true,
        metadata: {
          label: 'Overall Rating',
          max: 5,
        },
      },
      {
        id: 'location',
        type: 'geo',
        uiPlugin: 'geo',
        mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        metadata: {
          label: 'Location',
          precision: 7,
        },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        mapTo: { kind: 1, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Tags',
          suggestions: ['cafe', 'coffee', 'coworking', 'wifi', 'food'],
        },
      },
      // Kind 30078: structured aspect ratings (for advanced search/filtering)
      {
        id: 'wifiRating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 30078, target: 'content', path: 'ratings.wifi' },
        metadata: {
          label: 'WiFi Quality',
          max: 5,
        },
      },
      {
        id: 'laptopFriendly',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: {
          kind: 30078,
          target: 'content',
          path: 'ratings.laptopFriendly',
        },
        metadata: {
          label: 'Laptop Friendly',
          max: 5,
        },
      },
      {
        id: 'coffeeQuality',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 30078, target: 'content', path: 'ratings.coffee' },
        metadata: {
          label: 'Coffee Quality',
          max: 5,
        },
      },
      {
        id: 'foodQuality',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 30078, target: 'content', path: 'ratings.food' },
        metadata: {
          label: 'Food Quality',
          max: 5,
        },
      },
      {
        id: 'vibeRating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 30078, target: 'content', path: 'ratings.vibe' },
        metadata: {
          label: 'Vibe & Atmosphere',
          max: 5,
        },
      },
      {
        id: 'noiseLevel',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 30078, target: 'content', path: 'ratings.quietness' },
        metadata: {
          label: 'Quietness',
          max: 5,
        },
      },
    ],
    metadata: {
      name: 'Cafe Review',
      description:
        'Multi-event cafe review: main review as Kind 1 (visible everywhere) + detailed aspect ratings in NIP-78 (wifi, laptop-friendly, coffee, food, vibe) for advanced discovery',
      tags: ['cafe', 'review', 'coworking'],
    },
  },
};
