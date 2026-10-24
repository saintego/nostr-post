/**
 * A venue found on OpenStreetMap can get its Google Maps link (`i gcid:`), read
 * from the pasted text alone. The other way round, a venue from a Google Maps
 * link is searched on OSM in the venue input (googleSearch.ts).
 */

import type { VenueData } from './core';
import { parseGoogleMapsUrl } from './googleLink';

/** Why a pasted link can't be used: not a Google Maps place link, or a short one */
export type GoogleLinkProblem = 'invalid' | 'short';

/** A venue from OSM without a Google identity */
export const lacksGoogleLink = (venue: VenueData): boolean =>
  !!venue.osmId && !venue.googleCid && !venue.googlePlaceId;

/** What a pasted Google Maps link changes in the venue; empty text removes the link */
export function googleLinkChange(
  text: string
): { change: Partial<VenueData> } | { problem: GoogleLinkProblem } {
  if (!text.trim()) return { change: { googleCid: undefined } };
  const link = parseGoogleMapsUrl(text);
  if (link?.short) return { problem: 'short' };
  return link?.cid ? { change: { googleCid: link.cid } } : { problem: 'invalid' };
}
