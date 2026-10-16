/**
 * @nostr-post/core - Geohash values in posts
 *
 * Validates geohashes and turns one into the `g` tags of every prefix, so relays
 * can find a post by a coarser area (NIP-52 style prefix queries).
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
