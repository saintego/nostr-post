import { afterEach, describe, expect, it } from 'vitest';
import { configureVenuePlugin, googleEmbedUrl } from './googleEmbed';

const venue = {
  geohash: 'u2fkbx',
  lat: 50.07,
  lon: 14.41,
  name: 'U Fleků (Prague)',
  address: { street: 'Křemencova', houseNumber: '11', city: 'Prague' },
  googleCid: '123',
};

describe('Google place card', () => {
  afterEach(() => configureVenuePlugin({ googleMapsEmbedKey: undefined }));

  it('needs the app key and a venue known to be on Google', () => {
    expect(googleEmbedUrl(venue)).toBeUndefined();
    configureVenuePlugin({ googleMapsEmbedKey: 'KEY' });
    expect(googleEmbedUrl({ ...venue, googleCid: undefined })).toBeUndefined();
  });

  it('finds the place by name and OSM address, or by place ID', () => {
    configureVenuePlugin({ googleMapsEmbedKey: 'KEY' });
    const url = new URL(googleEmbedUrl(venue) as string);
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/embed/v1/place');
    expect(url.searchParams.get('key')).toBe('KEY');
    expect(url.searchParams.get('q')).toBe('U Fleků, Křemencova 11, Prague');
    expect(
      new URL(googleEmbedUrl({ ...venue, googlePlaceId: 'ChIJ1' }) as string).searchParams.get('q')
    ).toBe('place_id:ChIJ1');
  });
});
