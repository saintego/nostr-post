import { describe, expect, it } from 'vitest';
import { type NominatimResult, nominatimToVenue, venuePlugin } from './core';
import { levelPrecision, resultLevel, searchFeatureType, venueLevels } from './levels';

const result = (over: Partial<NominatimResult>): NominatimResult => ({
  lat: '50.0875',
  lon: '14.4213',
  display_name: 'Praha, Česko',
  osm_type: 'relation',
  osm_id: 435514,
  place_id: 1,
  licence: '',
  class: 'boundary',
  type: 'administrative',
  addresstype: 'city',
  address: { city: 'Praha', country: 'Česko', country_code: 'cz' },
  extratags: { wikidata: 'Q1085' },
  ...over,
});

const field = {
  id: 'location',
  type: 'geo' as const,
  uiPlugin: 'venue',
  mapTo: { kind: 30818, target: 'tag' as const, tagName: 'g' },
};

describe('location levels', () => {
  it('reads levels from metadata and Nominatim results', () => {
    expect(venueLevels(undefined)).toEqual(['place']);
    expect(venueLevels(['city', 'bogus'])).toEqual(['city']);
    expect(resultLevel({ addresstype: 'country' })).toBe('country');
    expect(resultLevel({ addresstype: 'town' })).toBe('city');
    expect(resultLevel({ addresstype: 'amenity' })).toBe('place');
    expect(searchFeatureType(['city'])).toBe('settlement');
    expect(searchFeatureType(['country', 'city'])).toBeUndefined();
    expect(levelPrecision('city', 6)).toBe(4);
    expect(levelPrecision('country', 6)).toBe(0);
  });

  it('tags a city with its OSM, Wikidata and country IDs and a coarse area', () => {
    const city = nominatimToVenue(result({}), 6);
    expect(city).toMatchObject({ level: 'city', countryCode: 'CZ', wikidata: 'Q1085' });
    expect(city.geohash).toHaveLength(4);
    expect(venuePlugin.serializeValue?.(city, field)).toBe(city.geohash);
    const tags = venuePlugin.extraTags?.(city, field) ?? [];
    expect(tags).toContainEqual(['i', 'osm:relation:435514']);
    expect(tags).toContainEqual(['i', 'iso3166:CZ']);
    expect(tags).toContainEqual(['i', 'wikidata:Q1085']);
    expect(tags.filter((t) => t[0] === 'g').map((t) => t[1])).toEqual([
      city.geohash.slice(0, 3),
      city.geohash.slice(0, 2),
    ]);
  });

  it('publishes no area for a country, and reads it back from its i tags', () => {
    const country = nominatimToVenue(
      result({
        addresstype: 'country',
        osm_id: 51684,
        display_name: 'Česko',
        address: { country: 'Česko', country_code: 'cz' },
        extratags: { wikidata: 'Q213' },
      }),
      6
    );
    expect(country.level).toBe('country');
    expect(venuePlugin.serializeValue?.(country, field)).toBe('');
    const tags = venuePlugin.extraTags?.(country, field) ?? [];
    expect(tags.some((t) => t[0] === 'g')).toBe(false);
    const read = venuePlugin.resolveFromTags?.(tags, field) as {
      level: string;
      countryCode: string;
    };
    expect(read).toMatchObject({ level: 'country', countryCode: 'CZ', geohash: '' });
  });

  it('a place keeps its full area and gets its country too', () => {
    const pub = nominatimToVenue(
      result({ addresstype: 'amenity', osm_type: 'node', osm_id: 1, extratags: null }),
      6
    );
    expect(pub.level).toBe('place');
    expect(pub.geohash).toHaveLength(6);
    expect(venuePlugin.extraTags?.(pub, field)).toContainEqual(['i', 'iso3166:CZ']);
  });
});
