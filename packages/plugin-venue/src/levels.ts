/**
 * Location levels: a venue field can stand for a country, a city or an exact
 * place (`metadata.levels`). A brewery without a taproom picks its city; one
 * that brews on others' equipment only its country. Only an exact place gets a
 * venue wiki page; every level is tagged with its country (NIP-73
 * `iso3166:CZ`), so "everything in Czechia" is one `#i` query.
 */

export type VenueLevel = 'country' | 'city' | 'place';

/** Nominatim `addresstype` values that are settlements */
const CITY_TYPES = new Set(['city', 'town', 'village', 'municipality', 'hamlet']);

/** The levels a field offers; default: exact places only */
export function venueLevels(levels: unknown): VenueLevel[] {
  if (!Array.isArray(levels)) return ['place'];
  const valid = levels.filter((l): l is VenueLevel => ['country', 'city', 'place'].includes(l));
  return valid.length > 0 ? valid : ['place'];
}

/** The level of a Nominatim result, from its `addresstype` */
export function resultLevel(result: { addresstype?: string }): VenueLevel {
  if (result.addresstype === 'country') return 'country';
  if (result.addresstype && CITY_TYPES.has(result.addresstype)) return 'city';
  return 'place';
}

/** Nominatim's `featureType` filter for these levels, when one covers them */
export function searchFeatureType(levels: VenueLevel[]): string | undefined {
  if (levels.includes('place')) return undefined;
  if (levels.length === 1) return levels[0] === 'country' ? 'country' : 'settlement';
  return undefined;
}

/** Geohash length published for a level: a city's area is coarse, a country has none */
export function levelPrecision(level: VenueLevel | undefined, precision: number): number {
  if (level === 'country') return 0;
  if (level === 'city') return Math.min(precision, 4);
  return precision;
}

/** `g` tags for every geohash prefix (≥ 2 chars), for area search on relays */
export const geohashTags = (geohash: string): [string, string][] =>
  Array.from({ length: Math.max(geohash.length - 1, 0) }, (_, i) => [
    'g',
    geohash.slice(0, geohash.length - i),
  ]);
