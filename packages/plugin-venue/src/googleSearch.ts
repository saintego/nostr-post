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
  type VenueData,
  nominatimAddress,
  reverseNominatim,
  searchNominatim,
} from './core';
import type { GoogleMapsLink } from './googleLink';
import type { VenueLevel } from './levels';

/** OSM places matching the link: its name near its point */
export async function searchGoogleLink(
  link: GoogleMapsLink,
  levels: VenueLevel[]
): Promise<NominatimResult[]> {
  if (!link.name || link.lat === undefined || link.lon === undefined) return [];
  return searchNominatim(link.name, levels, { lat: link.lat, lon: link.lon });
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
