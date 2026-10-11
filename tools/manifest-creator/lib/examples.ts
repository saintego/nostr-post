import type { NostrPostManifest } from '@nostr-post/core/types';
import { STANDARD_KIND1_POST_MANIFEST } from '@nostr-post/core/types';
import type { WikiManifest } from '@nostr-post/wiki';
import bjcpStyleManifest from './manifests/beerStyleBjcp2021.json';

export const EXAMPLE_MANIFESTS: Record<string, NostrPostManifest | WikiManifest> = {
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

  // The BJCP style list as a base manifest (lib/manifests/beerStyleBjcp2021.json).
  // The beer entity extends it by id; other apps by its address once it's published.
  'beer-style-bjcp-2021': bjcpStyleManifest as NostrPostManifest,

  // ── NIP-54 Wiki Entity (kind:30818) ──────────────────────────────────────

  'wiki-brewery-entity': {
    id: 'brewery-entity-v1',
    version: '1.0.0',
    wikiConfig: {
      titleTemplate: '{name} (Brewery)',
      dTagTemplate: '{name}-(brewery)',
    },
    fields: [
      {
        id: 'name',
        type: 'string',
        uiPlugin: 'text',
        required: true,
        mapTo: { kind: 30818, target: 'table' },
        metadata: { label: 'Brewery Name', placeholder: 'e.g. Russian River Brewing' },
      },
      {
        id: 'type',
        type: 'enum',
        uiPlugin: 'select',
        options: [
          {
            value: 'microbrewery',
            label: 'Microbrewery',
            description: 'Small brewery, most beer sold off-site',
          },
          {
            value: 'brewpub',
            label: 'Brewpub',
            description: 'Restaurant-brewery, most beer sold on-site',
          },
          {
            value: 'taproom-brewery',
            label: 'Taproom brewery',
            description: 'Most beer sold in its own taproom',
          },
          {
            value: 'regional-brewery',
            label: 'Regional brewery',
            description: 'Larger independent brewery',
          },
          {
            value: 'large-brewery',
            label: 'Large brewery',
            description: 'Industrial-scale brewery',
          },
          {
            value: 'contract-brewery',
            label: 'Contract / flying brewery',
            description: "Brews its beer on other breweries' equipment",
          },
        ],
        mapTo: { kind: 30818, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Type',
          description: 'Kind of brewery, after the Brewers Association market segments',
        },
      },
      {
        id: 'country',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Country',
          description: 'Where the brewery is based',
          placeholder: 'United States',
        },
      },
      {
        id: 'city',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: { label: 'City', placeholder: 'Santa Rosa, CA' },
      },
      {
        id: 'external_ids',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'tag', tagName: 'i' },
        metadata: {
          label: 'External IDs',
          description:
            'The brewery on other sites, as namespace:id (e.g. untappd:brewery:3264), so other apps can match it',
          placeholder: 'untappd:brewery:3264',
        },
      },
      {
        id: 'description',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 30818, target: 'content' },
        metadata: { label: 'About', placeholder: 'A short history of the brewery…' },
      },
    ],
    metadata: {
      name: 'Brewery Entity (NIP-54 wiki)',
      description: 'Collaborative wiki entity for a brewery — kind:30818.',
    },
  },

  'wiki-beer-entity': {
    id: 'beer-entity-v1',
    version: '1.0.0',
    // The style field comes from the BJCP base manifest
    extends: 'beer-style-bjcp-2021',
    wikiConfig: {
      titleTemplate: '{title} (Beer)',
      dTagTemplate: '{title}-(beer)',
    },
    fields: [
      {
        id: 'title',
        type: 'string',
        uiPlugin: 'text',
        required: true,
        mapTo: { kind: 30818, target: 'table' },
        metadata: { label: 'Beer Name', placeholder: 'e.g. Pliny the Elder' },
      },
      {
        id: 'brewery',
        type: 'ref',
        uiPlugin: 'wiki-entity-picker',
        mapTo: { kind: 30818, target: 'tag', tagName: 'a' },
        metadata: {
          label: 'Brewery',
          description: 'The brewery that makes it: pick its wiki page or create one',
          entityManifest: 'brewery-entity-v1',
          emitExtraTags: false,
        },
      },
      {
        id: 'abv',
        type: 'number',
        uiPlugin: 'number',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          step: 0.1,
          label: 'ABV %',
          description: 'Alcohol by volume',
          placeholder: '8.0',
        },
      },
      {
        id: 'ibu',
        type: 'number',
        uiPlugin: 'number',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'IBU',
          description: 'International Bitterness Units',
          placeholder: '100',
        },
      },
      {
        id: 'external_ids',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'tag', tagName: 'i' },
        metadata: {
          label: 'External IDs',
          description:
            'The beer on other sites, as namespace:id (e.g. untappd:beer:4892), so other apps can match it',
          placeholder: 'untappd:beer:4892',
        },
      },
      {
        id: 'description',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 30818, target: 'content' },
        metadata: {
          label: 'Description',
          placeholder: 'Collaborative description of this beer…',
        },
      },
    ],
    metadata: {
      name: 'Beer Entity (NIP-54 wiki)',
      description:
        'Collaborative wiki entity for a beer — kind:30818. Multiple pubkeys can contribute.',
    },
  },

  'wiki-beer-review': {
    id: 'beer-review-v1',
    version: '1.0.0',
    publishFormats: [
      { id: 'note', label: 'Note', kinds: [1], default: true },
      { id: 'app-data', label: 'App Data', kinds: [30078] },
    ],
    fields: [
      {
        id: 'beer',
        type: 'ref',
        uiPlugin: 'wiki-entity-picker',
        required: true,
        mapTo: [
          { kind: 1, target: 'tag', tagName: 'a' },
          { kind: 30078, target: 'tag', tagName: 'a' },
        ],
        metadata: {
          label: 'Beer',
          entityManifest: 'beer-entity-v1',
        },
      },
      {
        id: 'rating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: [
          { kind: 1, target: 'tag', tagName: 'rating' },
          { kind: 30078, target: 'tag', tagName: 'rating' },
        ],
        metadata: {
          label: 'Rating',
          description: 'Your overall impression',
          max: 5,
          showNumber: true,
        },
      },
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: [
          { kind: 1, target: 'content' },
          { kind: 30078, target: 'content' },
        ],
        required: true,
        metadata: { label: 'Review', placeholder: 'Your tasting notes...' },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'hashtag',
        attachTo: 'review',
        mapTo: [
          { kind: 1, target: 'tag', tagName: 't' },
          { kind: 30078, target: 'tag', tagName: 't' },
        ],
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
        mapTo: [
          { kind: 1, target: 'tag', tagName: 'r' },
          { kind: 30078, target: 'tag', tagName: 'r' },
        ],
        metadata: {
          label: 'Beer Photo',
          accept: ['image/*'],
          maxFiles: 2,
          expandable: true,
        },
      },
    ],
    metadata: {
      name: 'Beer Review',
      description:
        'Review a beer entity — links to the wiki entity via `a` tag and copies all `i` tags for cross-platform lookup.',
    },
  },

  // ── Venue hub (NIP-54 kind:30818), filled from OpenStreetMap ─────────────
  // `metadata.sources.osm` names the OSM tag(s) a field comes from (`a|b`: first
  // present; `@name`, `@street`, `@city` from the picked venue). Fields without a
  // source (description) are community-written and never overwritten by OSM.
  'wiki-venue-entity': {
    id: 'venue-entity-v1',
    version: '1.0.0',
    wikiConfig: {
      titleTemplate: '{name} ({city})',
      dTagTemplate: '{name}-{city}-(venue)',
      // Derived when shown, not stored: BTC Map lists the places OSM marks as accepting bitcoin
      links: [
        {
          label: 'BTC Map',
          url: 'https://btcmap.org/merchant/{i:osm}',
          when: { field: 'bitcoin', equals: 'yes' },
        },
      ],
    },
    fields: [
      {
        id: 'name',
        type: 'string',
        uiPlugin: 'text',
        required: true,
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Name',
          description: 'From OpenStreetMap (name)',
          sources: { osm: '@name' },
        },
      },
      {
        id: 'category',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'tag', tagName: 't' },
        metadata: {
          label: 'Category',
          description:
            'Kind of place, from OpenStreetMap (amenity, shop, craft, tourism or leisure)',
          sources: { osm: 'amenity|shop|craft|tourism|leisure' },
        },
      },
      {
        id: 'street',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Street',
          description: 'Street and house number, from OpenStreetMap',
          sources: { osm: '@street' },
        },
      },
      {
        id: 'city',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: { label: 'City', description: 'From OpenStreetMap', sources: { osm: '@city' } },
      },
      {
        id: 'opening_hours',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Opening hours',
          description: 'In OpenStreetMap opening_hours syntax',
          sources: { osm: 'opening_hours' },
        },
      },
      {
        id: 'website',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Website',
          description: 'From OpenStreetMap',
          sources: { osm: 'website|contact:website' },
        },
      },
      {
        id: 'phone',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Phone',
          description: 'From OpenStreetMap',
          sources: { osm: 'phone|contact:phone' },
        },
      },
      // Bitcoin payments, as mapped on OSM for BTC Map (wikiConfig.links adds the BTC Map link)
      {
        id: 'bitcoin',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Bitcoin accepted',
          description:
            'yes/no: the place accepts bitcoin, from OpenStreetMap currency:XBT (the data BTC Map shows)',
          sources: { osm: 'currency:XBT|payment:bitcoin' },
        },
      },
      {
        id: 'lightning',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Lightning',
          description: 'yes/no: Lightning payments, from OpenStreetMap payment:lightning',
          sources: { osm: 'payment:lightning' },
        },
      },
      {
        id: 'lightning_contactless',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Contactless Lightning',
          description:
            'yes/no: tap-to-pay Lightning cards (e.g. Bolt Card), from OpenStreetMap payment:lightning_contactless',
          sources: { osm: 'payment:lightning_contactless' },
        },
      },
      {
        id: 'onchain',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'On-chain',
          description: 'yes/no: on-chain bitcoin payments, from OpenStreetMap payment:onchain',
          sources: { osm: 'payment:onchain' },
        },
      },
      {
        id: 'bitcoin_checked',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30818, target: 'table' },
        metadata: {
          label: 'Bitcoin payments checked on',
          description: 'When someone last confirmed the bitcoin payment data on OpenStreetMap',
          sources: { osm: 'check_date:currency:XBT|survey:date|check_date' },
        },
      },
      {
        id: 'description',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 30818, target: 'content' },
        metadata: {
          label: 'About',
          description: 'Written by the community; never overwritten from OpenStreetMap',
          placeholder: 'What the community knows about this place…',
        },
      },
    ],
    metadata: {
      name: 'Venue Entity (NIP-54 wiki)',
      description:
        'Venue hub — kind:30818, filled from OpenStreetMap when a venue review is published; reviews link to it.',
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
          description:
            'Search OpenStreetMap for the place; its wiki page is created or updated when you publish',
          precision: 6,
          providers: ['osm'],
          // Create/update the venue's wiki page (the venue hub) from OSM and link it
          wikiEntity: 'venue-entity-v1',
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

  // Demonstrates single-parent inheritance: extends venue-review-v1 (venue, location,
  // rating, photos, kind1/nip78 publish formats) and overrides the review field with a
  // coffee-specific label, then adds coffee-specific fields on top.
  'coffee-in-cafe': {
    id: 'coffee-in-cafe',
    version: '1.0.0',
    extends:
      '30078:6a19c89b2694b307aae6dc40256264071a47bdad89d8ddae6d1ab7139a94015d:nostr-post:venue-review-v1',
    fields: [
      // Override the inherited 'review' field (venue-review-v1 uses id: 'review')
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
          placeholder: 'How was the coffee and the cafe?',
        },
      },
      // Coffee-specific fields not in the parent
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
        'Review both the coffee and the cafe in one form. Extends venue-review-v1 (venue, location, rating, photos, kind1+nip78 publishing) and adds coffee-specific fields.',
      tags: ['coffee', 'cafe', 'review'],
    },
  },
};
