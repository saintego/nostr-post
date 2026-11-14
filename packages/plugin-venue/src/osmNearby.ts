/**
 * A venue on OpenStreetMap near a known point (a Google Maps link's point, the spot of a post's
 * address), by its name compared our way: case, accents, spaces and punctuation ignored, and one
 * name may contain the other ("Speakerbox" is OSM's "Speaker Box", "Blue Monkey Bar Saigon" its
 * "Blue Monkey Bar"). Nominatim's text search matches words, so it misses those: here the named
 * places around the point come from Overpass and are compared one by one; the match is then read
 * from Nominatim with its address. No DOM dependencies.
 */

import { lookupNominatimByOsmId, type NominatimResult } from './core';
import { venueNameKey } from './wikiEntity';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
/** How far around the point places are listed (m) */
const AROUND_METRES = 200;

/** A named place Overpass lists */
interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Whether two venue names are the same place's: equal or one containing the other, ignoring case,
 * accents, spaces and punctuation (at least 3 letters each)
 */
export const sameVenueName = (a: string, b: string): boolean => {
  const left = venueNameKey(a);
  const right = venueNameKey(b);
  return left.length >= 3 && right.length >= 3 && (left.includes(right) || right.includes(left));
};

/** The names a place goes by on OpenStreetMap */
const namesOf = (tags: Record<string, string> = {}): string[] =>
  ['name', 'name:en', 'alt_name', 'official_name', 'short_name', 'old_name', 'brand']
    .flatMap((key) => (tags[key] ?? '').split(';'))
    .map((n) => n.trim())
    .filter(Boolean);

const squaredDistance = (e: OverpassElement, lat: number, lon: number): number => {
  const point = e.center ?? (e.lat !== undefined && e.lon !== undefined ? e : undefined);
  return point?.lat !== undefined && point.lon !== undefined
    ? (point.lat - lat) ** 2 + (point.lon - lon) ** 2
    : Number.POSITIVE_INFINITY;
};

/** The named places around a point (nearest first); empty when Overpass doesn't answer */
export async function namedPlacesNear(
  lat: number,
  lon: number,
  { metres = AROUND_METRES, fetchFn = fetch }: { metres?: number; fetchFn?: typeof fetch } = {}
): Promise<OverpassElement[]> {
  const query = `[out:json][timeout:10];nwr(around:${metres},${lat},${lon})[name];out center tags 100;`;
  try {
    const response = await fetchFn(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return [];
    const { elements = [] } = (await response.json()) as { elements?: OverpassElement[] };
    return elements.sort((a, b) => squaredDistance(a, lat, lon) - squaredDistance(b, lat, lon));
  } catch {
    return [];
  }
}

/**
 * The OpenStreetMap place near the point that has the venue's name (nearest first), with its
 * address from Nominatim; undefined when there's none (or OSM doesn't answer)
 */
export async function osmPlaceNear(
  name: string,
  point: { lat: number; lon: number },
  { fetchFn }: { fetchFn?: typeof fetch } = {}
): Promise<NominatimResult | undefined> {
  const wanted = name.split(',')[0]?.trim() ?? '';
  if (!wanted) return undefined;
  const places = await namedPlacesNear(point.lat, point.lon, { fetchFn });
  const match = places.find((p) => namesOf(p.tags).some((n) => sameVenueName(n, wanted)));
  if (!match) return undefined;
  return (await lookupNominatimByOsmId(match.type, match.id).catch(() => null)) ?? undefined;
}
