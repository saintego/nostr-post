import { describe, expect, it } from 'vitest';
import type { VenueData } from './core';
import { googleLinkChange, lacksGoogleLink } from './venueLinks';

const venue = (extra: Partial<VenueData>): VenueData => ({
  geohash: 'u2fk',
  lat: 50,
  lon: 14,
  ...extra,
});

const GOOGLE_LINK =
  'https://www.google.com/maps/place/U+Fleku/@50.0788,14.4168,17z/data=!4m6!3m5!1s0x470b94e9d0f0c0b1:0x2a1b3c4d5e6f7a8b!8m2!3d50.0788!4d14.4168';

describe('Google link of an OSM venue', () => {
  it('is offered for a venue from OSM without one', () => {
    expect(lacksGoogleLink(venue({ osmType: 'node', osmId: '1' }))).toBe(true);
    expect(lacksGoogleLink(venue({ googleCid: '42' }))).toBe(false);
    expect(lacksGoogleLink(venue({ osmType: 'node', osmId: '1', googleCid: '42' }))).toBe(false);
  });

  it('turns a pasted link into the venue change, or says why it can’t', () => {
    expect(googleLinkChange(GOOGLE_LINK)).toEqual({
      change: { googleCid: BigInt('0x2a1b3c4d5e6f7a8b').toString() },
    });
    expect(googleLinkChange('https://maps.app.goo.gl/abc')).toEqual({ problem: 'short' });
    expect(googleLinkChange('https://www.openstreetmap.org/node/1')).toEqual({
      problem: 'invalid',
    });
    expect(googleLinkChange(' ')).toEqual({ change: { googleCid: undefined } });
  });
});
