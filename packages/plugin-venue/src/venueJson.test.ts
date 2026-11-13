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
    expect(venuePlugin.jsonSchema?.(field())).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' }, address: { type: ['string', 'null'] } },
      required: ['name'],
    });
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

  it('places a venue OpenStreetMap lacks at its address, under its own name, without an OSM id', async () => {
    const street = {
      ...JAM,
      osm_type: 'way',
      osm_id: 7,
      class: 'highway',
      type: 'residential',
      addresstype: 'road',
      display_name: 'Soi Sukhumvit 26, Khlong Toei, Bangkok, Thailand',
      address: {
        road: 'Soi Sukhumvit 26',
        city: 'Bangkok',
        country: 'Thailand',
        country_code: 'th',
      },
    };
    const district = { ...JAM, addresstype: 'suburb', class: 'boundary', type: 'administrative' };
    const answers = [[], [district], [street]];
    const fetchMock = vi.fn(
      async (_url: unknown) => new Response(JSON.stringify(answers.shift() ?? []))
    );
    vi.stubGlobal('fetch', fetchMock);
    const { value } =
      (await venuePlugin.parseJson?.(
        {
          name: 'Blueprint Livehouse, Bangkok',
          address:
            'Blueprint Livehouse, 120/1 Sukhumvit 26 (Soi Ari), A Square, 2nd Floor, Khlong Toei, Bangkok 10110',
        },
        field()
      )) ?? {};
    const queries = fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('q'));
    expect(queries).toEqual([
      'Blueprint Livehouse, Bangkok',
      '120/1 Sukhumvit 26, A Square, 2nd Floor, Khlong Toei, Bangkok 10110',
      '120/1 Sukhumvit 26, Bangkok 10110',
      // The venue by its name around the address's spot: not there either
      'Blueprint Livehouse',
    ]);
    expect(value).toMatchObject({
      name: 'Blueprint Livehouse, Soi Sukhumvit 26, Bangkok',
      level: 'place',
    });
    expect((value as { osmId?: string }).osmId).toBeUndefined();
  });

  it("finds the venue on OpenStreetMap at its address's spot, under a shorter name", async () => {
    const street = {
      ...JAM,
      lat: '10.8133',
      lon: '106.7377',
      osm_type: 'way',
      osm_id: 7,
      class: 'highway',
      type: 'residential',
      addresstype: 'road',
      name: 'Nguyễn Văn Hưởng',
      display_name: 'Nguyễn Văn Hưởng, Thảo Điền, Thủ Đức, Ho Chi Minh City, Vietnam',
      address: { road: 'Nguyễn Văn Hưởng', city: 'Ho Chi Minh City', country_code: 'vn' },
    };
    const bar = {
      ...JAM,
      lat: '10.8134',
      lon: '106.7376',
      osm_id: 99,
      name: 'Blue Monkey Bar',
      display_name: 'Blue Monkey Bar, Nguyễn Văn Hưởng, Thủ Đức, Ho Chi Minh City, Vietnam',
      address: { road: 'Nguyễn Văn Hưởng', city: 'Ho Chi Minh City', country_code: 'vn' },
    };
    // The name: nothing; the address: the street; near it, the full name: nothing; shorter: the bar
    const answers = [[], [street], [], [bar]];
    const fetchMock = vi.fn(
      async (_url: unknown) => new Response(JSON.stringify(answers.shift() ?? []))
    );
    vi.stubGlobal('fetch', fetchMock);
    const { value } =
      (await venuePlugin.parseJson?.(
        { name: 'Blue Monkey Bar Saigon', address: '199M Nguyễn Văn Hưởng, Ho Chi Minh City' },
        field()
      )) ?? {};
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls.map((u) => u.searchParams.get('q')).slice(2)).toEqual([
      'Blue Monkey Bar Saigon',
      'Blue Monkey Bar',
    ]);
    expect(urls[2]?.searchParams.get('bounded')).toBe('1');
    expect(value).toMatchObject({ osmId: '99', osmType: 'node' });
  });

  it('reads { name } like the text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([JAM])))
    );
    const { value } =
      (await venuePlugin.parseJson?.({ name: 'JAM', address: null }, field())) ?? {};
    expect(value).toMatchObject({ osmId: '42' });
  });
});
