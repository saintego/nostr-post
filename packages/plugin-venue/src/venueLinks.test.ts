import { describe, expect, it } from 'vitest';
import type { VenueData } from './core';
import { missingVenueLink, parseOsmUrl, venueLinkChange } from './venueLinks';

const venue = (extra: Partial<VenueData>): VenueData => ({
  geohash: 'u2fk',
  lat: 50,
  lon: 14,
  ...extra,
});

const GOOGLE_LINK =
  'https://www.google.com/maps/place/U+Fleku/@50.0788,14.4168,17z/data=!4m6!3m5!1s0x470b94e9d0f0c0b1:0x2a1b3c4d5e6f7a8b!8m2!3d50.0788!4d14.4168';

describe('venue links', () => {
  it('offers the map the venue lacks', () => {
    expect(missingVenueLink(venue({ osmType: 'node', osmId: '1' }))).toBe('google');
    expect(missingVenueLink(venue({ googleCid: '42' }))).toBe('osm');
    expect(
      missingVenueLink(venue({ osmType: 'node', osmId: '1', googleCid: '42' }))
    ).toBeUndefined();
  });

  it('reads OpenStreetMap links', () => {
    expect(parseOsmUrl('https://www.openstreetmap.org/way/123#map=19/50/14')).toEqual({
      osmType: 'way',
      osmId: '123',
    });
    expect(parseOsmUrl('node/7')).toEqual({ osmType: 'node', osmId: '7' });
    expect(parseOsmUrl('https://example.com/node/7')).toBeUndefined();
  });

  it('turns a pasted link into the venue change, or says why it can’t', () => {
    expect(venueLinkChange('google', GOOGLE_LINK)).toEqual({
      change: { googleCid: BigInt('0x2a1b3c4d5e6f7a8b').toString() },
    });
    expect(venueLinkChange('google', 'https://maps.app.goo.gl/abc')).toEqual({ problem: 'short' });
    expect(venueLinkChange('google', 'https://www.openstreetmap.org/node/1')).toEqual({
      problem: 'invalid',
    });
    expect(venueLinkChange('google', ' ')).toEqual({ change: { googleCid: undefined } });
    expect(venueLinkChange('osm', 'https://osm.org/relation/5')).toEqual({
      change: { osmType: 'relation', osmId: '5' },
    });
    expect(venueLinkChange('osm', '')).toEqual({
      change: { osmType: undefined, osmId: undefined },
    });
  });
});
