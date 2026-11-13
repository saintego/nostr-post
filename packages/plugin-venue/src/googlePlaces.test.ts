import { describe, expect, it, vi } from 'vitest';
import {
  googlePlaceIdForVenue,
  lookUpShortLink,
  nearestGooglePlace,
  placeLink,
  searchGooglePlaces,
} from './googlePlaces';

const answer = (places: unknown[], ok = true) =>
  vi.fn(
    async () =>
      ({
        ok,
        status: ok ? 200 : 403,
        json: async () => (ok ? { places } : { error: { message: 'API key not valid' } }),
      }) as unknown as Response
  );

const bar = {
  id: 'ChIJbar',
  displayName: { text: 'Blue Monkey Bar' },
  formattedAddress: '199M Nguyễn Văn Hưởng',
  location: { latitude: 10.8042, longitude: 106.7376 },
};

describe('searchGooglePlaces', () => {
  it('asks Text Search with the key and a field mask, near a point', async () => {
    const fetchFn = answer([bar]);
    const found = await searchGooglePlaces('Blue Monkey Bar', 'KEY', {
      near: { lat: 10.8, lon: 106.7 },
      fetchFn,
    });
    expect(found).toEqual({
      success: true,
      data: [
        {
          id: 'ChIJbar',
          name: 'Blue Monkey Bar',
          address: '199M Nguyễn Văn Hưởng',
          lat: 10.8042,
          lon: 106.7376,
        },
      ],
    });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(init.headers).toMatchObject({
      'X-Goog-Api-Key': 'KEY',
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      textQuery: 'Blue Monkey Bar',
      locationBias: { circle: { center: { latitude: 10.8, longitude: 106.7 } } },
    });
  });

  it("fails with Google's message", async () => {
    const found = await searchGooglePlaces('x', 'BAD', { fetchFn: answer([], false) });
    expect(found.success).toBe(false);
    if (!found.success) expect(found.error.message).toBe('API key not valid');
  });
});

describe('lookUpShortLink', () => {
  const link = { short: true, name: 'Blue Monkey Bar', address: '199M Nguyễn Văn Hưởng' };

  it('needs a name, then the key (asked only then)', async () => {
    const getKey = vi.fn(async () => 'KEY');
    expect(await lookUpShortLink({ short: true }, { getKey })).toEqual({ status: 'needs-name' });
    expect(getKey).not.toHaveBeenCalled();
    expect(await lookUpShortLink(link, { getKey: async () => undefined })).toEqual({
      status: 'no-key',
    });
  });

  it("searches the share text's name and address", async () => {
    const fetchFn = answer([bar]);
    const found = await lookUpShortLink(link, { getKey: async () => 'KEY', fetchFn });
    expect(found.status).toBe('found');
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).textQuery).toBe('Blue Monkey Bar, 199M Nguyễn Văn Hưởng');
    expect(await lookUpShortLink(link, { getKey: async () => 'KEY', fetchFn: answer([]) })).toEqual(
      {
        status: 'not-found',
      }
    );
  });

  it("keeps the author's name and Google's id; Google's point only to search", () => {
    const place = { id: 'ChIJbar', name: 'Blue Monkey Bar Saigon (Google)', lat: 10.8, lon: 106.7 };
    expect(placeLink(link, place)).toEqual({
      name: 'Blue Monkey Bar',
      lat: 10.8,
      lon: 106.7,
      placeId: 'ChIJbar',
    });
  });
});

describe('a venue from OpenStreetMap', () => {
  it('takes the nearest place within 300 m', () => {
    const far = { id: 'far', lat: 10.9, lon: 106.7376 };
    const near = { id: 'near', lat: 10.8043, lon: 106.7377 };
    expect(nearestGooglePlace([far, near], 10.8042, 106.7376)?.id).toBe('near');
    expect(nearestGooglePlace([far], 10.8042, 106.7376)).toBeUndefined();
  });

  it('gets its place id by name and address near its point', async () => {
    const fetchFn = answer([bar]);
    const venue = {
      geohash: 'w3gvk',
      lat: 10.8041,
      lon: 106.7375,
      name: 'Blue Monkey Bar, Nguyễn Văn Hưởng, Thủ Đức',
      address: { street: 'Nguyễn Văn Hưởng', houseNumber: '199M', city: 'Thủ Đức' },
    };
    expect(await googlePlaceIdForVenue(venue, { getKey: async () => 'KEY', fetchFn })).toBe(
      'ChIJbar'
    );
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).textQuery).toBe(
      'Blue Monkey Bar, Nguyễn Văn Hưởng 199M, Thủ Đức'
    );
    expect(await googlePlaceIdForVenue(venue, { getKey: async () => undefined, fetchFn })).toBe(
      undefined
    );
  });
});
