import { describe, expect, it } from 'vitest';
import { venuePlugin } from './core';
import { parseGoogleMapsUrl } from './googleLink';
import { venueIdentifiers } from './wikiEntity';

describe('Google Maps links', () => {
  it('reads name, the place point and the CID of a place link', () => {
    const link =
      'https://www.google.com/maps/place/U+Flek%C5%AF/@50.0786,14.4187,17z/data=!4m6!3m5!1s0x470b94ef0d3c2c0b:0x2b8e0c3a9a1b4c7d!8m2!3d50.07895!4d14.41803!16s%2Fm%2F02qxjx';
    expect(parseGoogleMapsUrl(link)).toEqual({
      name: 'U Fleků',
      lat: 50.07895,
      lon: 14.41803,
      cid: BigInt('0x2b8e0c3a9a1b4c7d').toString(),
    });
  });

  it('reads cid links, search links and other Google domains', () => {
    expect(parseGoogleMapsUrl('https://maps.google.com/?cid=3138549126411111111')).toEqual({
      name: undefined,
      cid: '3138549126411111111',
    });
    expect(
      parseGoogleMapsUrl('https://www.google.cz/maps/search/Pivovar+Strahov/@50.08,14.39,15z')
    ).toEqual({
      name: 'Pivovar Strahov',
      lat: 50.08,
      lon: 14.39,
      cid: undefined,
    });
  });

  it('knows short links, and rejects other text', () => {
    expect(parseGoogleMapsUrl('https://maps.app.goo.gl/AbCd123')).toEqual({ short: true });
    expect(parseGoogleMapsUrl('U Fleků Praha')).toBeUndefined();
    expect(parseGoogleMapsUrl('https://www.openstreetmap.org/node/1')).toBeUndefined();
    expect(parseGoogleMapsUrl('https://www.google.com/search?q=beer')).toBeUndefined();
  });

  it('a venue keeps the CID as an i tag, reads it back, and is identified by it', () => {
    const field = {
      id: 'v',
      type: 'geo' as const,
      uiPlugin: 'venue',
      mapTo: { kind: 1, target: 'tag' as const, tagName: 'g' },
    };
    const venue = { geohash: 'u2fkbx', lat: 50.07, lon: 14.41, name: 'U Fleků', googleCid: '123' };
    const tags = venuePlugin.extraTags?.(venue, field) ?? [];
    expect(tags).toContainEqual(['i', 'gcid:123']);
    expect(tags.some((t) => t[0] === 'r')).toBe(false);
    expect(
      (venuePlugin.resolveFromTags?.([['g', 'u2fkbx'], ...tags], field) as { googleCid?: string })
        .googleCid
    ).toBe('123');
    expect(venueIdentifiers(venue)).toEqual(['gcid:123']);
  });
});
