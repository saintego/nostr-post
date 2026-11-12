/**
 * @nostr-post/core - Geohash values in posts
 *
 * Validates geohashes, encodes a point and decodes one back to the centre of its box, and turns
 * one into the `g` tags of every prefix, so relays can find a post by a coarser area (NIP-52
 * style prefix queries). Precision: 4 chars ≈ ±20 km (city), 5 ≈ ±2.4 km, 6 ≈ ±610 m (street),
 * 7 ≈ ±76 m, 8 ≈ ±19 m.
 */

import type { NostrTag } from './types';

/** Base32 alphabet used by geohash encoding. */
const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Type guard for geohash strings. */
export const isValidGeohash = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (const ch of value) {
    if (!GEOHASH_BASE32.includes(ch)) return false;
  }
  return true;
};

/** The geohash of a value: the value itself, or its `geohash` key (e.g. a venue) */
export const extractGeohash = (value: unknown): string | undefined => {
  if (isValidGeohash(value)) return value;
  if (typeof value === 'object' && value !== null && 'geohash' in value) {
    const geohash = (value as Record<string, unknown>).geohash;
    if (isValidGeohash(geohash)) return geohash;
  }
  return undefined;
};

/** `g` tags of the geohash and each of its prefixes down to 2 characters, longest first */
export const geohashPrefixTags = (geohash: string): NostrTag[] => {
  const tags: NostrTag[] = [];
  for (let len = geohash.length; len >= 2; len--) {
    tags.push(['g', geohash.slice(0, len)]);
  }
  return tags;
};

export interface GeoCoordinates {
  lat: number;
  lon: number;
}

/** Encode lat/lon to a geohash string. */
export const encodeGeohash = (lat: number, lon: number, precision = 6): string => {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isLon = true;
  let bit = 0;
  let ch = 0;
  let hash = '';

  while (hash.length < precision) {
    if (isLon) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        ch |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isLon = !isLon;
    bit++;
    if (bit === 5) {
      hash += GEOHASH_BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
};

/** Decode a geohash string to lat/lon (centre of bounding box). */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: geohash bit-walk algorithm is intentionally imperative
export const decodeGeohash = (hash: string): GeoCoordinates => {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isLon = true;

  for (const c of hash) {
    const idx = GEOHASH_BASE32.indexOf(c);
    if (idx === -1) continue;
    for (let bit = 4; bit >= 0; bit--) {
      if (isLon) {
        const mid = (lonMin + lonMax) / 2;
        if (idx & (1 << bit)) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & (1 << bit)) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isLon = !isLon;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
  };
};
