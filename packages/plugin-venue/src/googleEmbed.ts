/**
 * Google's own place card for a venue, via the Maps Embed API: free and
 * unlimited, with the app's key. Google renders name, address, rating and
 * review count in an iframe; nothing from it is read or stored. The key is the
 * app's (`configureVenuePlugin`), never part of a manifest (manifests are
 * public on Nostr) and never shipped with the plugin.
 */

import type { VenueData } from './core';

export interface VenuePluginSettings {
  /** Google Maps Embed API key of the app (restrict it to the app's domain) */
  googleMapsEmbedKey?: string;
  /**
   * The user's Google Places API key, asked only when it's needed: when a Google Maps short link
   * is pasted (a user gesture, so the app may prompt its signer or the user). Undefined: none.
   * It's used for that search only, never stored, published or logged by nostr-post
   */
  getGooglePlacesKey?: () => Promise<string | undefined>;
}

// Module state: set once by the app
let settings: VenuePluginSettings = {};

/** App-wide venue plugin settings, e.g. the Google Maps Embed API key */
export function configureVenuePlugin(next: VenuePluginSettings): void {
  settings = { ...settings, ...next };
}

/** The Places API key from the app's provider; undefined without one, or when it fails */
export async function googlePlacesKey(): Promise<string | undefined> {
  try {
    return (await settings.getGooglePlacesKey?.())?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The Embed API URL showing the venue's place card, when the app has a key and
 * the venue is known to be on Google (a CID or place ID). By place ID when
 * known, else by name and OSM address (the CID can't be used for embedding)
 */
export function googleEmbedUrl(venue: VenueData): string | undefined {
  const key = settings.googleMapsEmbedKey;
  if (!key || (!venue.googleCid && !venue.googlePlaceId)) return undefined;
  // The place's own name: no OSM address part, no page-title suffix like "(Prague)"
  const name = venue.name
    ?.split(',')[0]
    ?.replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  const street = [venue.address?.street, venue.address?.houseNumber].filter(Boolean).join(' ');
  const q = venue.googlePlaceId
    ? `place_id:${venue.googlePlaceId}`
    : [name, street, venue.address?.city].filter(Boolean).join(', ');
  if (!q) return undefined;
  const url = new URL('https://www.google.com/maps/embed/v1/place');
  url.searchParams.set('key', key);
  url.searchParams.set('q', q);
  return url.toString();
}
