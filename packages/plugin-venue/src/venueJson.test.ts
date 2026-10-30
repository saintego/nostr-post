import type { PostField } from '@nostr-post/plugins/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { venuePlugin } from './core';

const field = (metadata: Record<string, unknown> = {}) =>
  ({
    id: 'location',
    type: 'geo',
    uiPlugin: 'venue',
    mapTo: { kind: 31923, target: 'tag', tagName: 'g' },
    metadata,
  }) as PostField;

const JAM = {
  lat: '13.7563',
  lon: '100.5018',
  display_name: 'JAM, Silom, Bangkok, Thailand',
  osm_type: 'node',
  osm_id: 42,
  place_id: 1,
  licence: '',
  class: 'amenity',
  type: 'bar',
  name: 'JAM',
  addresstype: 'amenity',
  address: { city: 'Bangkok', country: 'Thailand', country_code: 'th' },
};

afterEach(() => vi.unstubAllGlobals());

describe('venue in form JSON', () => {
  it('asks for a place as text, or several', () => {
    expect(venuePlugin.jsonSchema?.(field())).toMatchObject({ type: 'string' });
    expect(venuePlugin.jsonSchema?.(field({ multiple: true }))).toMatchObject({
      type: 'array',
      items: { type: 'string' },
    });
    expect(venuePlugin.jsonSchema?.(field({ levels: ['city'] }))).toMatchObject({
      description: expect.stringContaining('city'),
    });
  });

  it('reads the text as the first place OpenStreetMap finds', async () => {
    const fetchMock = vi.fn(async (_url: unknown) => new Response(JSON.stringify([JAM])));
    vi.stubGlobal('fetch', fetchMock);
    const { value } = (await venuePlugin.parseJson?.('JAM, Bangkok', field())) ?? {};
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('q=JAM%2C+Bangkok');
    expect(value).toMatchObject({ osmId: '42', osmType: 'node' });
    expect((value as { geohash: string }).geohash).toMatch(/^w4rq/);
  });

  it('leaves the field empty when nothing is found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('[]'))
    );
    expect(await venuePlugin.parseJson?.('Nowhere at all', field())).toEqual({ value: undefined });
  });
});
