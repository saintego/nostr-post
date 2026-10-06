import { describe, expect, it } from 'vitest';
import { externalIdLink } from './externalIds';

describe('externalIdLink', () => {
  it('links OSM elements, Google places and URLs', () => {
    expect(externalIdLink('osm:node:9740899349')).toEqual({
      url: 'https://www.openstreetmap.org/node/9740899349',
      provider: 'OpenStreetMap',
    });
    expect(externalIdLink('gplace:ChIJ123')?.provider).toBe('Google Maps');
    expect(externalIdLink('https://paralelnapolis.sk/x')?.provider).toBe('paralelnapolis.sk');
  });

  it('has no link for unknown kinds', () => {
    expect(externalIdLink('untappd:beer:4892')).toBeUndefined();
  });
});
