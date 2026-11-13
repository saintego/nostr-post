/**
 * Google Maps short links (`maps.app.goo.gl/…`, what the phone apps share) resolved with
 * Google Places API (New) Text Search, using a key the host app provides
 * (`configureVenuePlugin({ getGooglePlacesKey })`); nostr-post never stores or asks for it.
 * A browser can't open a short link itself, so the place is searched by the name and
 * address the phone's share text has above the link (or a name the author types).
 *
 * Only the place id is kept (`i gplace:`): Google's terms allow keeping coordinates for at most
 * 30 days, and a Nostr event can't be reliably deleted. Google's point is only used to find the
 * place on OpenStreetMap (or to centre the map for the author); its name and address are only
 * shown for picking. No DOM dependencies.
 */

import type { Result } from '@nostr-post/plugins/types';
import type { VenueData } from './core';
import { googlePlacesKey } from './googleEmbed';
import type { GoogleMapsLink } from './googleLink';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
/** Only what picking and matching need */
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location';
const BIAS_METRES = 2000;
const EARTH_METRES = 6_371_000;

/** A place Google found: shown for picking, never stored except its `id` */
export interface GooglePlace {
  id: string;
  name?: string;
  address?: string;
  lat?: number;
  lon?: number;
}

interface TextSearchResponse {
  places?: {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  }[];
  error?: { message?: string };
}

/** Places matching a text (a name and address), near a point if given */
export async function searchGooglePlaces(
  query: string,
  key: string,
  { near, fetchFn = fetch }: { near?: { lat: number; lon: number }; fetchFn?: typeof fetch } = {}
): Promise<Result<GooglePlace[]>> {
  const body = {
    textQuery: query,
    pageSize: 5,
    ...(near
      ? {
          locationBias: {
            circle: { center: { latitude: near.lat, longitude: near.lon }, radius: BIAS_METRES },
          },
        }
      : {}),
  };
  try {
    const response = await fetchFn(TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as TextSearchResponse;
    if (!response.ok) {
      return { success: false, error: new Error(data.error?.message ?? `HTTP ${response.status}`) };
    }
    const places = (data.places ?? []).flatMap((p): GooglePlace[] =>
      p.id
        ? [
            {
              id: p.id,
              name: p.displayName?.text,
              address: p.formattedAddress,
              lat: p.location?.latitude,
              lon: p.location?.longitude,
            },
          ]
        : []
    );
    return { success: true, data: places };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/** Distance between two points in metres */
const metres = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((bLat - aLat) * rad) / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLon - aLon) * rad) / 2) ** 2;
  return 2 * EARTH_METRES * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** The place nearest to a point, if within `maxMetres` (e.g. the same venue OSM has) */
export const nearestGooglePlace = (
  places: GooglePlace[],
  lat: number,
  lon: number,
  maxMetres = 300
): GooglePlace | undefined => {
  let best: { place: GooglePlace; distance: number } | undefined;
  for (const place of places) {
    if (place.lat === undefined || place.lon === undefined) continue;
    const distance = metres(lat, lon, place.lat, place.lon);
    if (distance <= maxMetres && (!best || distance < best.distance)) best = { place, distance };
  }
  return best?.place;
};

/** What looking up a pasted short link found */
export type ShortLinkLookup =
  | { status: 'needs-name' }
  | { status: 'no-key' }
  | { status: 'not-found'; error?: Error }
  | { status: 'found'; places: GooglePlace[] };

/**
 * A short link's place on Google: searched by its share text's name and address (or a name the
 * author typed, `link.name`). Needs a name and the app's key (`getKey`, asked only now)
 */
export async function lookUpShortLink(
  link: GoogleMapsLink,
  {
    getKey = googlePlacesKey,
    near,
    fetchFn,
  }: {
    getKey?: () => Promise<string | undefined>;
    near?: { lat: number; lon: number };
    fetchFn?: typeof fetch;
  } = {}
): Promise<ShortLinkLookup> {
  const name = link.name?.trim();
  if (!name) return { status: 'needs-name' };
  const key = await getKey();
  if (!key) return { status: 'no-key' };
  const query = [name, link.address].filter(Boolean).join(', ');
  const found = await searchGooglePlaces(query, key, { near, fetchFn });
  if (!found.success) return { status: 'not-found', error: found.error };
  return found.data.length ? { status: 'found', places: found.data } : { status: 'not-found' };
}

/**
 * The link of a picked place, to find it on OpenStreetMap like a long link: the author's name
 * (from their share text or typed, not Google's), Google's point (only to search around, never
 * stored) and its place id
 */
export const placeLink = (link: GoogleMapsLink, place: GooglePlace): GoogleMapsLink => ({
  name: link.name,
  lat: place.lat,
  lon: place.lon,
  placeId: place.id,
});

/**
 * The Google place id of a venue already found on OpenStreetMap, for a pasted short link: its
 * name and address searched near its point, the nearest within 300 m
 */
export async function googlePlaceIdForVenue(
  venue: VenueData,
  {
    getKey = googlePlacesKey,
    fetchFn,
  }: { getKey?: () => Promise<string | undefined>; fetchFn?: typeof fetch } = {}
): Promise<string | undefined> {
  const name = venue.name?.split(',')[0]?.trim();
  if (!name || venue.lat === undefined || venue.lon === undefined) return undefined;
  const key = await getKey();
  if (!key) return undefined;
  const street = [venue.address?.street, venue.address?.houseNumber].filter(Boolean).join(' ');
  const query = [name, street, venue.address?.city].filter(Boolean).join(', ');
  const near = { lat: venue.lat, lon: venue.lon };
  const found = await searchGooglePlaces(query, key, { near, fetchFn });
  return found.success ? nearestGooglePlace(found.data, venue.lat, venue.lon)?.id : undefined;
}
