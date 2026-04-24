import type { NostrPostManifest } from '@nostr-post/core/types';
import { STANDARD_KIND1_POST_MANIFEST } from '@nostr-post/core/types';

export const EXAMPLE_MANIFESTS: Record<string, NostrPostManifest> = {
  simple: {
    ...STANDARD_KIND1_POST_MANIFEST,
    id: 'kind1-simple-post',
    fields: STANDARD_KIND1_POST_MANIFEST.fields.map((field) =>
      field.id === 'tags' ? { ...field, defaultValue: ['test', 'nostr-post'] } : field
    ),
  },

  'geo-review': {
    id: 'geo-review-v1',
    version: '1.0.0',
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
        attachTo: 'review',
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
        attachTo: 'review',
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
    publishFormats: [
      {
        id: 'kind1-note',
        label: 'Kind 1 note',
        description: 'Publish a regular public note that works in any Nostr client.',
        kinds: [1],
        default: true,
        userSelectable: true,
      },
      {
        id: 'nip78-review',
        label: 'NIP-78 review',
        description: 'Publish only structured venue review data for richer clients and filtering.',
        kinds: [30078],
        userSelectable: true,
      },
      {
        id: 'hybrid-review',
        label: 'Kind 1 + NIP-78',
        description: 'Publish both a public note and a structured companion review event.',
        kinds: [1, 30078],
        userSelectable: true,
      },
    ],
    fields: [
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapBehavior: 'all-active',
        mapTo: [
          { kind: 1, target: 'content' },
          { kind: 30078, target: 'content', path: 'review' },
        ],
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
        mapBehavior: 'all-active',
        mapTo: [
          { kind: 1, target: 'tag', tagName: 'rating' },
          { kind: 30078, target: 'content', path: 'ratings.overall' },
        ],
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
        mapBehavior: 'all-active',
        mapTo: [
          { kind: 1, target: 'tag', tagName: 'g' },
          { kind: 30078, target: 'content', path: 'venue' },
        ],
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
        mapBehavior: 'all-active',
        mapTo: [
          { kind: 1, target: 'tag', tagName: 'r' },
          { kind: 30078, target: 'content', path: 'media.photos' },
        ],
        attachTo: 'review',
        metadata: {
          label: 'Photos',
          accept: ['image/*'],
          maxFiles: 5,
        },
      },
      {
        id: 'refs',
        type: 'string',
        uiPlugin: 'reference',
        attachTo: 'review',
        mapBehavior: 'all-active',
        mapTo: [
          { kind: 1, target: 'tag', tagName: 'r' },
          { kind: 30078, target: 'content', path: 'references' },
        ],
        visibility: { view: 'hidden' },
        metadata: {
          label: 'Links',
          expandable: true,
        },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        attachTo: 'review',
        mapBehavior: 'all-active',
        mapTo: [
          { kind: 1, target: 'tag', tagName: 't' },
          { kind: 30078, target: 'content', path: 'hashtags' },
        ],
        metadata: {
          label: 'Tags',
          suggestions: ['restaurant', 'cafe', 'bar', 'park', 'museum', 'hotel'],
        },
      },
    ],
    metadata: {
      name: 'Venue Review',
      description:
        'Review a venue as a public Kind 1 note, a structured NIP-78 review, or both using one form.',
      tags: ['venue', 'review', 'kind1', 'nip78'],
    },
  },

  article: {
    id: 'article-v1',
    version: '1.0.0',
    publishFormats: [
      {
        id: 'nip23-article',
        label: 'NIP-23 Article',
        kinds: [30023],
        default: true,
        userSelectable: true,
      },
    ],
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
    publishFormats: [
      {
        id: 'nip23-article',
        label: 'NIP-23 Article',
        kinds: [30023],
        default: true,
        userSelectable: true,
      },
    ],
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

  'cafe-review': {
    id: 'cafe-review-v1',
    version: '1.0.0',
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
        attachTo: 'review',
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

  'movie-review': {
    id: 'movie-review-v1',
    version: '1.0.0',
    fields: [
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: {
          label: 'Review',
          placeholder: 'Share your thoughts about this movie...',
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
          max: 10,
        },
      },
      {
        id: 'title',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'title' },
        required: true,
        metadata: {
          label: 'Movie Title',
          placeholder: 'e.g. The Matrix',
        },
      },
      {
        id: 'isan',
        type: 'string',
        uiPlugin: 'identifier',
        mapTo: { kind: 1, target: 'tag', tagName: 'i' },
        metadata: {
          label: 'ISAN',
          placeholder: '0000-0000-2CEA-0000-O-0000-0000-2',
          prefix: 'isan',
        },
      },
      {
        id: 'genres',
        type: 'string',
        uiPlugin: 'hashtag',
        attachTo: 'review',
        mapTo: { kind: 1, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Genres',
          suggestions: [
            'drama',
            'action',
            'sci-fi',
            'comedy',
            'thriller',
            'romance',
            'horror',
            'documentary',
          ],
        },
      },
      {
        id: 'media',
        type: 'string',
        uiPlugin: 'media',
        attachTo: 'review',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        metadata: {
          label: 'Media',
          accept: ['image/*'],
          maxFiles: 2,
          expandable: true,
        },
      },
    ],
    metadata: {
      name: 'Movie Review (IMDb-style)',
      description:
        'Movie review with 10-star rating, ISAN identifier (NIP-73), genres, and optional poster/screenshot',
      tags: ['movie', 'review', 'film', 'cinema'],
    },
  },

  'product-review': {
    id: 'product-review-v1',
    version: '1.0.0',
    fields: [
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: {
          label: 'Review',
          placeholder: 'Share your experience with this product...',
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
        },
      },
      {
        id: 'productName',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'title' },
        required: true,
        metadata: {
          label: 'Product Name',
          placeholder: 'e.g. Sony WH-1000XM5 Headphones',
        },
      },
      {
        id: 'gtin',
        type: 'string',
        uiPlugin: 'identifier',
        mapTo: { kind: 1, target: 'tag', tagName: 'i' },
        metadata: {
          label: 'GTIN (NIP-73 i tag)',
          placeholder: '09506000134352',
          prefix: 'gtin',
        },
      },
      {
        id: 'ean',
        type: 'string',
        uiPlugin: 'identifier',
        mapTo: { kind: 1, target: 'tag', tagName: 'i' },
        metadata: {
          label: 'EAN (NIP-73 i tag)',
          placeholder: '4006381333931',
          prefix: 'ean',
        },
      },
      {
        id: 'upc',
        type: 'string',
        uiPlugin: 'identifier',
        mapTo: { kind: 1, target: 'tag', tagName: 'i' },
        metadata: {
          label: 'UPC (NIP-73 i tag)',
          placeholder: '036000291452',
          prefix: 'upc',
        },
      },
      {
        id: 'asin',
        type: 'string',
        uiPlugin: 'identifier',
        mapTo: { kind: 1, target: 'tag', tagName: 'i' },
        metadata: {
          label: 'ASIN (NIP-73 i tag)',
          placeholder: 'B08N5WRWNW',
          prefix: 'asin',
        },
      },
      {
        id: 'media',
        type: 'string',
        uiPlugin: 'media',
        attachTo: 'review',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        metadata: {
          label: 'Product Photos',
          accept: ['image/*'],
          maxFiles: 6,
          expandable: true,
        },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        attachTo: 'review',
        mapTo: { kind: 1, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Tags',
          suggestions: ['quality', 'value', 'durable', 'eco-friendly', 'shipping', 'packaging'],
        },
      },
    ],
    metadata: {
      name: 'Product Review (Amazon-style)',
      description:
        'Product review with 5-star rating and multiple NIP-73 product identifiers (gtin/ean/upc/asin) as i tags',
      tags: ['product', 'review', 'shopping', 'retail'],
    },
  },

  'beer-review': {
    id: 'beer-review-v1',
    version: '1.0.0',
    fields: [
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: {
          label: 'Tasting Notes',
          placeholder: 'Describe the aroma, taste, mouthfeel, and overall impression...',
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
          min: 0.25,
          step: 0.25,
          showNumber: true,
        },
      },
      {
        id: 'name',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'name' },
        required: true,
        metadata: {
          label: 'Beer Name',
          placeholder: 'e.g. Hoppy IPA',
        },
      },
      {
        id: 'brewery',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'brewery' },
        required: true,
        metadata: {
          label: 'Brewery',
          placeholder: 'Brewery or distributor name',
        },
      },
      {
        id: 'style',
        type: 'string',
        uiPlugin: 'hashtag',
        mapTo: { kind: 1, target: 'tag', tagName: 'style' },
        metadata: {
          label: 'Beer Style',
          suggestions: [
            'IPA',
            'Lager',
            'Pilsner',
            'Stout',
            'Porter',
            'Sour',
            'Wheat',
            'Amber',
            'Pale Ale',
            'Saison',
          ],
        },
      },
      {
        id: 'abv',
        type: 'number',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'abv' },
        metadata: {
          step: 0.1,
          label: 'ABV %',
          placeholder: 'Alcohol by volume',
        },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        attachTo: 'review',
        mapTo: { kind: 1, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Tags',
          suggestions: [
            'hoppy',
            'crisp',
            'smooth',
            'bitter',
            'sweet',
            'fruity',
            'crafted',
            'seasonal',
          ],
        },
      },
      {
        id: 'media',
        type: 'string',
        uiPlugin: 'media',
        attachTo: 'review',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        metadata: {
          label: 'Beer Photo',
          accept: ['image/*'],
          maxFiles: 2,
          expandable: true,
        },
      },
    ],
    metadata: {
      name: 'Beer Review (Untappd-style)',
      description:
        'Beer tasting review with 5-star rating, brewery, style, ABV, tasting notes, and beer photo',
      tags: ['beer', 'review', 'craft', 'tasting'],
    },
  },

  // Demonstrates multiple inheritance: extends kind1-simple-post (basic content and default tags) and
  // venue-review-v1 (venue, location, rating, photos) — both published to relays.
  // The child overrides the content field and adds coffee-specific fields on top.
  'coffee-in-cafe': {
    id: 'coffee-in-cafe',
    version: '1.0.0',
    extends: [
      '30078:6a19c89b2694b307aae6dc40256264071a47bdad89d8ddae6d1ab7139a94015d:nostr-post:kind1-simple-post',
      '30078:6a19c89b2694b307aae6dc40256264071a47bdad89d8ddae6d1ab7139a94015d:nostr-post:venue-review-v1',
    ],
    fields: [
      // Override the inherited 'content' field so resolveManifest replaces it instead of adding a duplicate
      {
        id: 'content',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: {
          label: 'Review',
          placeholder: 'How was the coffee and the cafe?',
        },
      },
      // Coffee-specific fields not in either parent
      {
        id: 'origin',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'origin' },
        metadata: { label: 'Coffee Origin', placeholder: 'e.g. Ethiopia Yirgacheffe' },
      },
      {
        id: 'roast',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'roast' },
        metadata: { label: 'Roast Level', placeholder: 'e.g. Light / Medium / Dark' },
      },
      {
        id: 'brew',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'brew' },
        metadata: { label: 'Brew Method', placeholder: 'e.g. V60, Aeropress, Espresso' },
      },
    ],
    metadata: {
      name: 'Coffee-in-Cafe Review',
      description:
        'Review both the coffee and the cafe in one form. Extends kind1-simple-post + venue-review-v1 (both published) and adds coffee-specific fields via multiple inheritance.',
      tags: ['coffee', 'cafe', 'review'],
    },
  },
};
