/**
 * The gig app's own data: its artist and gig manifests and genres. App-specific (they stay in the
 * example, AGENTS.md "Packages are the product"); everything else comes from the packages.
 */

import { CALENDAR_EVENT_MANIFEST } from '@nostr-post/calendar';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import type { WikiManifest } from '@nostr-post/wiki';

/** An artist's wiki page (NIP-54): name, genres and media links shown as players */
export const ARTIST_MANIFEST: WikiManifest = {
  id: 'gigs-musician-v1',
  version: '1.0.0',
  wikiConfig: {
    titleTemplate: '{title} (musician)',
    dTagTemplate: '{title}-(musician)',
    // Genres and links as text too: clients showing the page in a feed show its text only
    lead: ['genres', 'media'],
  },
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: 30818, target: 'table' },
      metadata: { label: 'Artist or band', placeholder: 'e.g. Doomsday Ceremony' },
    },
    {
      id: 'genres',
      type: 'string',
      uiPlugin: 'hashtag',
      mapTo: { kind: 30818, target: 'tag', tagName: 't' },
      metadata: {
        label: 'Genres',
        description: 'Their music genres, e.g. punk or techno',
        suggestions: [],
      },
    },
    {
      id: 'media',
      type: 'string',
      uiPlugin: 'embed',
      mapTo: { kind: 30818, target: 'tag', tagName: 'r' },
      metadata: {
        label: 'Listen',
        description:
          'Bandcamp, Spotify, SoundCloud, YouTube (players), Instagram or Facebook profiles, or any link',
        multiple: true,
      },
    },
    {
      id: 'about',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: { kind: 30818, target: 'content' },
      metadata: { label: 'About' },
    },
  ],
  metadata: {
    name: 'Musician',
    description: 'A band, musician or DJ, with links to their music and profiles',
  },
};

export const GENRES = [
  'punk',
  'metal',
  'hardcore',
  'rock',
  'indie',
  'electronic',
  'techno',
  'jazz',
  'hip-hop',
  'folk',
];

/**
 * Venue pages: the venue page type published on Nostr (`venue-entity-v1`, also used by
 * worldtrip.guide), so venues are shared pages, not this app's own
 */
export const VENUE_ENTITY_MANIFEST =
  '30078:6a19c89b2694b307aae6dc40256264071a47bdad89d8ddae6d1ab7139a94015d:nostr-post:venue-entity-v1';

/** The gig's own wording of calendar event fields */
const GIG_FIELD_METADATA: Record<string, PostField['metadata']> = {
  // The venue gets its wiki page (created from OpenStreetMap when missing), linked by the gig
  location: { wikiEntity: VENUE_ENTITY_MANIFEST },
  tags: {
    label: 'Genres',
    description: 'Music genres, e.g. punk or techno',
    suggestions: GENRES,
  },
  // Tagging notifies people: only organizers on Nostr, not the performers (their own field)
  participants: {
    label: 'Organizers',
    description:
      'Organizers or hosts on Nostr, by npub or the name of their Nostr profile; not the performers',
    roles: ['organizer', 'host'],
  },
};

const MEDIA_KINDS = [20, 21, 22];

/**
 * Photos and videos of a gig: a NIP-68 picture (kind 20) or a NIP-71 video (kind 21, or 22 for a
 * short portrait one) linking the gig (`a` tag), shown in its "Photos and videos" section, which
 * offers "Add" with it and fills `event` with the gig's address
 */
export const EVENT_MEDIA_MANIFEST: NostrPostManifest = {
  id: 'event-media-v1',
  version: '1.0.0',
  publishFormats: [
    {
      id: 'picture',
      label: 'Photos',
      description: 'A photo post (NIP-68, kind 20), shown by Nostr photo apps',
      kinds: [20],
      default: true,
      userSelectable: true,
      select: { field: 'media', media: 'image' },
    },
    {
      id: 'video',
      label: 'Video',
      description: 'A video post (NIP-71, kind 21), shown by Nostr video apps',
      kinds: [21],
      userSelectable: true,
      select: { field: 'media', media: 'video' },
    },
    {
      id: 'short-video',
      label: 'Short video',
      description: 'A short portrait video (NIP-71, kind 22), like a story or reel',
      kinds: [22],
      userSelectable: true,
      select: { field: 'media', media: 'video', portrait: true },
    },
  ],
  fields: [
    {
      id: 'media',
      type: 'string',
      uiPlugin: 'media',
      required: true,
      // One `imeta` tag per file (url, type, hash, size, dimensions, description); the files
      // choose the format: photos a picture, a video a video (portrait: a short one)
      mapTo: MEDIA_KINDS.map((kind) => ({ kind, target: 'tag' as const, tagName: 'imeta' })),
      metadata: {
        label: 'Photos or video',
        description: 'Photos of the event (the stage, the crowd, the place), or a video',
        accept: ['image/*', 'video/*'],
        maxFiles: 10,
        maxSize: 100 * 1024 * 1024,
        alt: true,
        allowUrl: false,
      },
    },
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: MEDIA_KINDS.map((kind) => ({ kind, target: 'tag' as const, tagName: 'title' })),
      metadata: { label: 'Title' },
    },
    {
      id: 'caption',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: MEDIA_KINDS.map((kind) => ({ kind, target: 'content' as const })),
      metadata: { label: 'Caption' },
    },
    {
      id: 'event',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      // The page's address (a gig `31922|31923:…`, an artist's page `30818:…`), filled by its "Add"
      mapTo: MEDIA_KINDS.map((kind) => ({ kind, target: 'tag' as const, tagName: 'a' })),
      visibility: { edit: 'hidden', view: 'hidden' },
      metadata: {
        label: 'Event',
        description: 'The gig (or the artist page) the photos or video are of',
      },
    },
    {
      id: 'tags',
      type: 'string',
      uiPlugin: 'hashtag',
      mapTo: MEDIA_KINDS.map((kind) => ({ kind, target: 'tag' as const, tagName: 't' })),
      metadata: { label: 'Tags' },
    },
  ],
  metadata: {
    name: 'Event photos and videos',
    description:
      "Photos (NIP-68, kind 20) or a video (NIP-71, kind 21 or 22) of a calendar event, shown in the event page's gallery",
    tags: ['event', 'photo', 'video', 'nip68', 'nip71'],
  },
};

/** A gig: the calendar event manifest with performers (artist pages) and genre suggestions */
export const GIG_MANIFEST: NostrPostManifest = {
  ...CALENDAR_EVENT_MANIFEST,
  id: 'gigs-gig-v1',
  fields: [
    ...CALENDAR_EVENT_MANIFEST.fields.map((field) => {
      const metadata = GIG_FIELD_METADATA[field.id];
      return metadata ? { ...field, metadata: { ...field.metadata, ...metadata } } : field;
    }),
    {
      id: 'performers',
      type: 'ref',
      uiPlugin: 'wiki-entity-picker',
      // The artists' pages as `a` tags (an artist's page can list its gigs) and as a
      // `Performers: nostr:naddr1…` line per page after the description, links in any client
      mapTo: [
        { kind: 31922, target: 'tag', tagName: 'a' },
        { kind: 31923, target: 'tag', tagName: 'a' },
        { kind: 31922, target: 'content' },
        { kind: 31923, target: 'content' },
      ],
      metadata: {
        label: 'Performers',
        description: 'The artists or bands playing',
        entityManifest: ARTIST_MANIFEST,
        multiple: true,
      },
    },
  ],
  // On a gig's page: the photos and videos of the gig, its comments and posts linking it;
  // "Add" posts photos or a video linking the gig (EVENT_MEDIA_MANIFEST)
  sections: [
    {
      id: 'media',
      label: 'Photos and videos',
      view: 'gallery',
      self: true,
      // One photo for the gig's, the venue's and the artists' galleries: the venue's page is
      // offered ticked, the performers' pages unticked (a crowd shot isn't of a band)
      add: {
        manifest: EVENT_MEDIA_MANIFEST,
        field: 'event',
        also: [{ field: 'location', checked: true }, { field: 'performers' }],
      },
    },
  ],
  metadata: { name: 'Gig', description: 'A concert or party: when, where, who plays' },
};

/**
 * An artist's page: ARTIST_MANIFEST with its upcoming gigs, those that link the page (`a` tag,
 * any version's author) or one of its profile links (`i` tags, so gigs added before the page
 * existed show too), and "Add" a gig with the artist as a performer; and its photos and videos
 * (posts linking the page, e.g. added to a gig with "Also show on" the artist)
 */
export const ARTIST_PAGE_MANIFEST: WikiManifest = {
  ...ARTIST_MANIFEST,
  sections: [
    {
      id: 'gigs',
      label: 'Gigs',
      kinds: [31922, 31923],
      links: true,
      view: 'agenda',
      add: { manifest: GIG_MANIFEST, field: 'performers' },
    },
    {
      id: 'media',
      label: 'Photos and videos',
      view: 'gallery',
      kinds: MEDIA_KINDS,
      add: { manifest: EVENT_MEDIA_MANIFEST, field: 'event' },
    },
  ],
};
