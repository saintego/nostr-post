/**
 * The venue input with a pasted Google Maps link: find the same place on
 * OpenStreetMap by the link's name around its point; if OSM doesn't have it,
 * the author sets the place on the map and the venue is built from their point
 * (address from OSM's reverse lookup), the link's name and its CID. Nothing is
 * taken from Google beyond what the pasted link says.
 */

import { decodeGeohash, encodeGeohash } from '@nostr-post/plugin-geo';
import {
  type NominatimResult,
  nominatimAddress,
  reverseNominatim,
  searchNominatim,
  type VenueData,
} from './core';
import type { GoogleMapsLink } from './googleLink';
import type { VenueLevel } from './levels';

/** OSM places the link may be: at its point, or nearby (`spot` false; OSM's point may be off) */
export interface GoogleLinkMatches {
  results: NominatimResult[];
  /** The results are at the link's point (~300 m), not only in its area (~5 km) */
  spot: boolean;
}

/** The area searched when nothing matches at the link's point: ~5 km around it */
const AREA_DEGREES = 0.045;

const distance = (r: NominatimResult, lat: number, lon: number): number =>
  (Number(r.lat) - lat) ** 2 + (Number(r.lon) - lon) ** 2;

/** OSM places matching the link: its name at its point, else in its area, closest first */
export async function searchGoogleLink(
  link: GoogleMapsLink,
  levels: VenueLevel[]
): Promise<GoogleLinkMatches> {
  const { name, lat, lon } = link;
  if (!name || lat === undefined || lon === undefined) return { results: [], spot: false };
  const atSpot = await searchNominatim(name, levels, { lat, lon });
  if (atSpot.length > 0) return { results: atSpot, spot: true };
  const around = await searchNominatim(name, levels, { lat, lon }, AREA_DEGREES);
  return {
    results: [...around].sort((a, b) => distance(a, lat, lon) - distance(b, lat, lon)),
    spot: false,
  };
}

/**
 * Where the map zooms for the author to set the place: the link's point,
 * shown without a marker; only the author's click is stored
 */
export const googleLinkFocus = (link: GoogleMapsLink | undefined): string | null =>
  link?.lat !== undefined && link.lon !== undefined ? encodeGeohash(link.lat, link.lon, 9) : null;

/** A venue OSM doesn't have: the author's point, OSM's address there, the link's name and CID */
export async function venueAtPoint(
  link: GoogleMapsLink,
  geohash: string,
  precision = 6
): Promise<VenueData> {
  const { lat, lon } = decodeGeohash(geohash);
  const here = await reverseNominatim(lat, lon).catch(() => null);
  const address = here?.address ? nominatimAddress(here.address) : undefined;
  const street = [address?.street, address?.houseNumber].filter(Boolean).join(' ');
  return {
    geohash: encodeGeohash(lat, lon, precision),
    lat,
    lon,
    name: [link.name, street, address?.city].filter(Boolean).join(', ') || undefined,
    address,
    level: 'place',
    countryCode: here?.address?.country_code?.toUpperCase(),
    googleCid: link.cid,
  };
}
