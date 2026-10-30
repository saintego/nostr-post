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
  wikiConfig: { titleTemplate: '{title} (musician)', dTagTemplate: '{title}-(musician)' },
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

/** The gig's own wording of calendar event fields */
const GIG_FIELD_METADATA: Record<string, PostField['metadata']> = {
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
      // The artists' pages as `a` tags: an artist's page can list its gigs
      mapTo: [
        { kind: 31922, target: 'tag', tagName: 'a' },
        { kind: 31923, target: 'tag', tagName: 'a' },
      ],
      metadata: {
        label: 'Performers',
        description: 'The artists or bands playing',
        entityManifest: ARTIST_MANIFEST,
        multiple: true,
      },
    },
  ],
  metadata: { name: 'Gig', description: 'A concert or party: when, where, who plays' },
};
