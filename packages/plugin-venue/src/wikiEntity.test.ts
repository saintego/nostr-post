import type { PostField } from '@nostr-post/plugins/types';
import { describe, expect, it } from 'vitest';
import { osm, venue, venueManifest } from './fixtures.testHelpers';
import { geohashTags } from './levels';
import { lacksGoogleLink } from './venueLinks';
import {
  canHaveVenuePage,
  entitySyncAction,
  isSameVenueByName,
  mergeOsmFields,
  slugBody,
  syncedOsmVersion,
  syncsVenuePage,
  venueDTag,
  venueEntityTags,
  venueNameKey,
  venuePageKey,
  venueQualifierSuggestions,
  venueToEntityData,
} from './wikiEntity';

const entity = (tags: string[][]) =>
  ({ id: 'e', pubkey: 'pk', sig: 's', kind: 30818, created_at: 1, content: '', tags }) as never;

describe('venueToEntityData', () => {
  it('fills fields from OSM tags and the picked venue', () => {
    expect(venueToEntityData(venue, osm(5), venueManifest)).toEqual({
      name: 'Café Louvre',
      category: 'cafe',
      street: 'Národní 22',
      city: 'Prague',
      website: 'https://cafelouvre.cz',
    });
  });

  it('uses the first present alternative and falls back to the venue name', () => {
    const data = venueToEntityData(
      venue,
      osm(5, { name: '', amenity: '', shop: 'books' }),
      venueManifest
    );
    expect(data.category).toBe('books');
    expect(data.name).toBe('Café Louvre');
    expect(venueToEntityData(venue, null, venueManifest).name).toBe('Café Louvre');
  });
});

describe('mergeOsmFields', () => {
  it('replaces only OSM-sourced fields and keeps community ones', () => {
    const current = { name: 'Old', website: 'https://old', description: 'Community text' };
    const merged = mergeOsmFields(
      current,
      { name: 'Café Louvre', website: 'https://new' },
      venueManifest
    );
    expect(merged).toEqual({
      name: 'Café Louvre',
      website: 'https://new',
      description: 'Community text',
    });
  });
});

describe('hub tags', () => {
  it('has identifiers, geohash prefixes, location and the OSM source with version', () => {
    const tags = venueEntityTags(venue, osm(5));
    expect(tags).toContainEqual(['i', 'osm:node:123']);
    expect(tags).toContainEqual(['g', 'u2fkbn']);
    expect(tags).toContainEqual(['g', 'u2']);
    expect(tags).toContainEqual([
      'source',
      'OpenStreetMap',
      'https://www.openstreetmap.org/copyright',
      'node/123/v5',
    ]);
    expect(geohashTags('abc')).toEqual([
      ['g', 'abc'],
      ['g', 'ab'],
    ]);
  });
});

describe('entitySyncAction', () => {
  const synced = (v: number) =>
    entity([
      ['d', 'x'],
      ['source', 'OpenStreetMap', 'u', `node/123/v${v}`],
    ]);

  it('creates a missing entity', () => {
    expect(entitySyncAction(undefined, osm(5)).kind).toBe('create');
  });

  it('updates only when OSM changed since the synced version', () => {
    expect(syncedOsmVersion(synced(3))).toBe(3);
    expect(entitySyncAction(synced(3), osm(5)).kind).toBe('update');
    expect(entitySyncAction(synced(5), osm(5)).kind).toBe('none');
    expect(entitySyncAction(entity([['d', 'x']]), osm(5)).kind).toBe('update');
    expect(entitySyncAction(synced(3), null).kind).toBe('none');
  });
});

describe('venueQualifierSuggestions', () => {
  it('offers the street, district and postcode without duplicates', () => {
    expect(
      venueQualifierSuggestions({
        ...venue,
        address: { street: 'Národní', district: 'Old Town', postcode: '110 00', city: 'Prague' },
      })
    ).toEqual(['Národní', 'Old Town', '110 00']);
    expect(venueQualifierSuggestions({ ...venue, address: undefined })).toEqual([]);
  });
});

describe('editable slug', () => {
  const affixes = { prefix: '', suffix: '-venue' };

  it('edits only the part before the type suffix', () => {
    expect(slugBody('café-louvre-prague-venue', affixes)).toBe('café-louvre-prague');
    expect(slugBody('other', affixes)).toBe('other');
  });

  it('normalizes the edited slug and keeps the type suffix', () => {
    const data = { name: 'Café Louvre', city: 'Prague' };
    expect(venueDTag(venueManifest, data)).toBe('café-louvre-prague-venue');
    expect(venueDTag(venueManifest, data, 'Louvre Národní 22')).toBe('louvre-národní-22-venue');
    expect(venueDTag(venueManifest, data, 'louvre-venue')).toBe('louvre-venue');
    expect(venueDTag(venueManifest, data, '  ')).toBe('café-louvre-prague-venue');
  });
});

describe('isSameVenueByName', () => {
  // A hub page from another source in `venue`'s cell (its lat/lon; its geohash is a cell away)
  const page = (title: string, geohash = 'u2fkbh', id = 'gplace:abc') =>
    entity([
      ['title', title],
      ['i', id],
      ['g', geohash],
      ['g', geohash.slice(0, 5)],
    ]);

  it('ignores case, accents, spaces and the qualifier', () => {
    expect(venueNameKey('Speaker box')).toBe(venueNameKey('Speakerbox'));
    expect(isSameVenueByName(page('cafe louvre (Prague)'), venue)).toBe(true);
  });

  it('needs the same name, nearby, on a venue hub', () => {
    expect(isSameVenueByName(page('Café Slavia'), venue)).toBe(false);
    // Another cell, kilometers away
    expect(isSameVenueByName(page('Café Louvre', 'u2fm00'), venue)).toBe(false);
    // Not a venue hub: no place ID
    expect(isSameVenueByName(page('Café Louvre', 'u2fkbh', 'iso3166:CZ'), venue)).toBe(false);
  });
});

describe("a venue OpenStreetMap and Google don't have", () => {
  const pinned = {
    geohash: 'w3gvsb',
    lat: 10.8133,
    lon: 106.7377,
    name: 'Blue Monkey Bar Saigon, Nguyen Van Huong, Ho Chi Minh City',
  };

  it('can have a page by its name and a precise point', () => {
    expect(canHaveVenuePage(pinned)).toBe(true);
    expect(canHaveVenuePage({ ...pinned, geohash: 'w3gv' })).toBe(false);
    expect(canHaveVenuePage({ ...pinned, name: '' })).toBe(false);
    expect(venuePageKey(pinned)).toBe('Blue Monkey Bar Saigon@w3gvsb');
    expect(venuePageKey({ ...pinned, osmType: 'node', osmId: '42' })).toBe('osm:node:42');
  });

  it('marks its page with its point as id (NIP-73 geo:), found again by its name there', () => {
    const tags = venueEntityTags(pinned, null);
    expect(tags).toContainEqual(['i', 'geo:w3gvsb']);
    expect(venueEntityTags({ ...pinned, osmType: 'node', osmId: '42' }, null)).not.toContainEqual([
      'i',
      'geo:w3gvsb',
    ]);
    const page = {
      kind: 30818,
      pubkey: 'pk',
      created_at: 1,
      content: '',
      tags: [
        ['d', 'blue-monkey-bar-saigon-venue'],
        ['title', 'Blue Monkey Bar Saigon (venue)'],
        ...tags,
      ],
    };
    expect(isSameVenueByName(page as never, pinned)).toBe(true);
  });

  it('gets a page only when the author chooses it (OSM venues by default)', () => {
    const field: PostField = {
      id: 'location',
      type: 'geo',
      uiPlugin: 'venue',
      mapTo: { kind: 1, target: 'tag' },
    };
    expect(syncsVenuePage(pinned, field)).toBe(false);
    expect(syncsVenuePage({ ...pinned, syncWiki: true }, field)).toBe(true);
    expect(syncsVenuePage({ ...pinned, osmType: 'node', osmId: '42' }, field)).toBe(true);
    expect(syncsVenuePage(pinned, { ...field, metadata: { requirePage: true } })).toBe(true);
  });

  it('can take a Google Maps link on its page', () => {
    expect(lacksGoogleLink(pinned)).toBe(true);
    expect(lacksGoogleLink({ ...pinned, googleCid: '1' })).toBe(false);
  });
});
