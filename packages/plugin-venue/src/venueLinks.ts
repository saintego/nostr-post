/**
 * The other map's link for a venue: a venue found on OpenStreetMap can get its
 * Google Maps link (`i gcid:`), one set on the map from a Google Maps link can
 * get its OpenStreetMap element. Read from the pasted text alone.
 */

import type { VenueData } from './core';
import { parseGoogleMapsUrl } from './googleLink';

export type VenueLinkKind = 'google' | 'osm';

/** Why a pasted link can't be used: not that map's place link, or a short Google link */
export type VenueLinkProblem = 'invalid' | 'short';

/** The link a venue lacks: Google's when it's from OSM, OSM's when it's from Google only */
export function missingVenueLink(venue: VenueData): VenueLinkKind | undefined {
  if (venue.osmId && !venue.googleCid && !venue.googlePlaceId) return 'google';
  if (!venue.osmId && (venue.googleCid || venue.googlePlaceId)) return 'osm';
  return undefined;
}

const OSM_URL = /(?:^|openstreetmap\.org\/|osm\.org\/)(node|way|relation)\/(\d+)/;

/** The element of an OpenStreetMap link (`https://www.openstreetmap.org/node/123`) */
export function parseOsmUrl(
  text: string
): { osmType: 'node' | 'way' | 'relation'; osmId: string } | undefined {
  const match = text.trim().match(OSM_URL);
  if (!match?.[1] || !match[2]) return undefined;
  return { osmType: match[1] as 'node' | 'way' | 'relation', osmId: match[2] };
}

/** What a pasted link changes in the venue; empty text removes the link */
export function venueLinkChange(
  kind: VenueLinkKind,
  text: string
): { change: Partial<VenueData> } | { problem: VenueLinkProblem } {
  const empty = !text.trim();
  if (kind === 'osm') {
    const element = parseOsmUrl(text);
    if (empty || element) return { change: element ?? { osmType: undefined, osmId: undefined } };
    return { problem: 'invalid' };
  }
  if (empty) return { change: { googleCid: undefined } };
  const link = parseGoogleMapsUrl(text);
  if (link?.short) return { problem: 'short' };
  return link?.cid ? { change: { googleCid: link.cid } } : { problem: 'invalid' };
}
