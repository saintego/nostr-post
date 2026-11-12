import { encodeGeohash } from '@nostr-post/core/geohash';
import { describe, expect, it } from 'vitest';
import { guessTimeZone, guessTimeZoneOfTags, zonePlaceOfTags } from './zoneGuess';

describe('guessTimeZone', () => {
  it('gives a one-zone country its zone', () => {
    expect(guessTimeZone({ country: 'de' })).toBe('Europe/Berlin');
    expect(guessTimeZone({ country: 'TH' })).toBe('Asia/Bangkok');
  });

  it("picks the nearest of a country's zones by the point", () => {
    expect(guessTimeZone({ country: 'US', lat: 37.77, lon: -122.42 })).toBe('America/Los_Angeles');
    expect(guessTimeZone({ country: 'US', lat: 40.71, lon: -74.0 })).toBe('America/New_York');
  });

  it("can't tell a country of several zones without a point", () => {
    expect(guessTimeZone({ country: 'US' })).toBeUndefined();
  });

  it('uses the nearest zone city without a country, not when far from all', () => {
    expect(guessTimeZone({ lat: 52.5, lon: 13.4 })).toBe('Europe/Berlin');
    expect(guessTimeZone({ lat: -48, lon: -130 })).toBeUndefined();
    expect(guessTimeZone({})).toBeUndefined();
  });
});

describe('zonePlaceOfTags', () => {
  it("reads the country and the most precise geohash's point", () => {
    const tags = [
      ['g', 'u33'],
      ['g', encodeGeohash(52.4979, 13.4417, 7)],
      ['i', 'iso3166:DE-BE'],
    ];
    const place = zonePlaceOfTags(tags);
    expect(place.country).toBe('DE');
    expect(place.lat).toBeCloseTo(52.498, 2);
    expect(guessTimeZoneOfTags(tags)).toBe('Europe/Berlin');
  });

  it('ignores geohashes too coarse to guess from', () => {
    expect(zonePlaceOfTags([['g', 'u3']])).toEqual({});
  });
});
