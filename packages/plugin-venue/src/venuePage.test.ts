import { describe, expect, it } from 'vitest';
import { needsPage, venueFromPage } from './venuePage';

const field = {
  id: 'tasting_at',
  type: 'geo' as const,
  uiPlugin: 'venue',
  mapTo: { kind: 1, target: 'tag' as const, tagName: 'a' },
  metadata: { linkOnly: true },
};

const page = {
  id: 'p',
  pubkey: 'pk',
  sig: 's',
  kind: 30818,
  created_at: 1,
  content: '',
  tags: [
    ['d', 'u-fleků-prague-venue'],
    ['title', 'U Fleků (Prague)'],
    ['i', 'osm:node:123'],
    ['i', 'iso3166:CZ'],
    ['g', 'u2fkbx'],
    ['g', 'u2fkb'],
    ['location', 'U Fleků, Křemencova, Prague'],
  ],
};

describe('venue pages', () => {
  it('knows which values have only their page', () => {
    expect(needsPage({ wikiEntity: { pubkey: 'pk', dTag: 'x' } })).toBe(true);
    expect(needsPage({ geohash: 'u2fk', wikiEntity: { pubkey: 'pk', dTag: 'x' } })).toBe(false);
    expect(needsPage(undefined)).toBe(false);
  });

  it('reads the place from the page: title as name, longest geohash, OSM ID, country', () => {
    expect(venueFromPage(page, field)).toMatchObject({
      name: 'U Fleků (Prague)',
      geohash: 'u2fkbx',
      osmType: 'node',
      osmId: '123',
      countryCode: 'CZ',
      wikiEntity: { pubkey: 'pk', dTag: 'u-fleků-prague-venue' },
    });
  });
});
