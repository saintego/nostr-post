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

  it('ignores `a` tags of other kinds', () => {
    expect(
      resolve([
        ['g', 'u2xj5t'],
        ['a', '30078:pk:nostr-post:manifest'],
      ]).wikiEntity
    ).toBeUndefined();
  });
});
