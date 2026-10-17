import type { ManifestList, NostrPostManifest } from '@nostr-post/core/types';
import { listField } from '@nostr-post/plugin-list';

/**
 * Lists the examples' entity types offer (`lists`). A list's d-tag is
 * `nostr-post:<listType>:<id>` (`nostr-post:venue:visited`); Favourites has a fixed `dTag`,
 * so venues and beers go to one list.
 */
const FAVOURITES: ManifestList = {
  id: 'favourites',
  label: 'Favourites',
  dTag: 'nostr-post:favourites',
};

export const VENUE_LISTS: ManifestList[] = [
  { id: 'want-to-go', label: 'Want to go' },
  { id: 'visited', label: 'Visited' },
  FAVOURITES,
];

export const BEER_LISTS: ManifestList[] = [
  { id: 'want-to-try', label: 'Want to try' },
  { id: 'liked', label: 'Liked' },
  FAVOURITES,
];

/** Save a place to lists without writing a review: a hooks-only publish format */
export const SAVE_PLACE_MANIFEST: NostrPostManifest = {
  id: 'save-place-v1',
  version: '1.0.0',
  // No event of its own: the venue field creates or links the venue's page, the list field
  // saves it
  publishFormats: [{ id: 'save', label: 'Save only', kinds: [], default: true }],
  fields: [
    {
      id: 'venue',
      type: 'geo',
      uiPlugin: 'venue',
      mapTo: { kind: 1, target: 'tag', tagName: 'g' },
      required: true,
      metadata: {
        label: 'Place',
        description: 'Search OpenStreetMap for the place; its wiki page is created or linked',
        precision: 6,
        providers: ['osm'],
        wikiEntity: 'venue-entity-v1',
      },
    },
    listField({ saveField: 'venue', label: 'Save to lists', required: true }),
  ],
  metadata: {
    name: 'Save a place',
    description: 'Find a place and save it to your lists, e.g. Want to go; no post is published',
    tags: ['lists', 'venue'],
  },
};
