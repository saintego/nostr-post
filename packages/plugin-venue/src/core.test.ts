import { describe, expect, it } from 'vitest';
import { type VenueData, venuePlugin } from './core';

const resolve = (tags: string[][]) =>
  venuePlugin.resolveFromTags?.(tags, { id: 'venue' } as never) as VenueData;

describe('venuePlugin.resolveFromTags', () => {
  it('reads the venue and its wiki entity from a post', () => {
    const venue = resolve([
      ['g', 'u2xj5t'],
      ['i', 'osm:node:9740899349'],
      ['location', 'Paralelná Polis, Košice'],
      ['a', '30818:39feb678:paralelná-polis-košice-venue'],
    ]);
    expect(venue.osmId).toBe('9740899349');
    expect(venue.wikiEntity).toEqual({ pubkey: '39feb678', dTag: 'paralelná-polis-košice-venue' });
  });

  it("takes its page from the last wiki `a` tag, after a gig's performers' pages", () => {
    const venue = resolve([
      ['a', '30818:aa:naraka-musician'],
      ['g', 'w4rw0d'],
      ['a', '30818:bb:jam-bangkok-venue'],
    ]);
    expect(venue.wikiEntity).toEqual({ pubkey: 'bb', dTag: 'jam-bangkok-venue' });
  });

  it("names the venue by its own location tag, the last, after a post's free-text place", () => {
    const venue = resolve([
      ['location', 'Room 3, 2nd floor'],
      ['g', 'u2xj5t'],
      ['i', 'osm:node:9740899349'],
      ['location', 'Paralelná Polis, Košice'],
    ]);
    expect(venue.name).toBe('Paralelná Polis, Košice');
  });

  it('ignores `a` tags of other kinds', () => {
    expect(
      resolve([
        ['g', 'u2xj5t'],
        ['a', '30078:pk:nostr-post:manifest'],
      ]).wikiEntity
    ).toBeUndefined();
  });

  it('reads the level from the geohash length and the field levels, for any OSM type', () => {
    const level = (tags: string[][], metadata?: Record<string, unknown>) =>
      (
        venuePlugin.resolveFromTags?.(tags, { id: 'venue', metadata } as never) as
          | VenueData
          | undefined
      )?.level;
    const levels = { levels: ['city', 'place'] };
    // A town OSM models as a node, published at city precision
    expect(
      level(
        [
          ['g', 'u2fk'],
          ['i', 'osm:node:1'],
        ],
        levels
      )
    ).toBe('city');
    expect(
      level(
        [
          ['g', 'u2fkbc'],
          ['i', 'osm:node:2'],
        ],
        levels
      )
    ).toBe('place');
    expect(level([['i', 'iso3166:CZ']], levels)).toBe('country');
    // A field without cities: an exact place, whatever its precision
    expect(
      level([
        ['g', 'u2fk'],
        ['i', 'osm:relation:3'],
      ])
    ).toBe('place');
    expect(level([['g', 'u2fk']], { levels: ['city'] })).toBe('city');
    // Places as coarse as cities can't be told apart: places
    expect(level([['g', 'u2fk']], { ...levels, precision: 4 })).toBe('place');
  });
});

describe("a gig's venue page", () => {
  const field = {
    id: 'location',
    type: 'geo',
    uiPlugin: 'venue',
    mapTo: [{ kind: 31923, target: 'tag' as const, tagName: 'g' }],
    metadata: { wikiEntity: 'not-loaded-venue-type' },
  };
  const performers = [
    ['a', '30818:pk:irihi-入日-musician'],
    ['a', '30818:pk:iro-musician'],
  ];

  it("isn't a performer's page: a gig without a venue page has none", () => {
    const venue = venuePlugin.resolveFromTags?.(
      [['g', 'w3gvsb'], ['location', 'Blue Monkey Bar Saigon'], ...performers],
      field as never
    ) as { wikiEntity?: unknown; name?: string };
    expect(venue.name).toBe('Blue Monkey Bar Saigon');
    expect(venue.wikiEntity).toBeUndefined();
  });

  it('is the page of the venue type among the linked pages', () => {
    const venue = venuePlugin.resolveFromTags?.(
      [['g', 'w3gvsb'], ['a', '30818:pk:blue-monkey-bar-saigon-thu-duc-venue'], ...performers],
      field as never
    ) as { wikiEntity?: unknown };
    expect(venue.wikiEntity).toEqual({
      pubkey: 'pk',
      dTag: 'blue-monkey-bar-saigon-thu-duc-venue',
    });
  });
});
