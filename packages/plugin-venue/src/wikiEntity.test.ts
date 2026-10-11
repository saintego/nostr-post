import { describe, expect, it } from 'vitest';
import { osm, venue, venueManifest } from './fixtures.test-helpers';
import {
  entitySyncAction,
  geohashTags,
  mergeOsmFields,
  slugBody,
  syncedOsmVersion,
  venueDTag,
  venueEntityTags,
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
