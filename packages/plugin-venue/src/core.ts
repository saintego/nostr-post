/**
 * @nostr-post/plugin-venue - Core
 *
 * Venue/place plugin that links events to specific locations from
 * OpenStreetMap (Nominatim) and optionally Google Places.
 *
 * Produces multiple Nostr tags from a single field:
 *   - ["g", geohash]      → NIP-52 geohash (+ prefix tags for relay filtering)
 *   - ["i", "osm:..."]    → NIP-73 external content ID for OSM venue
 *   - ["i", "gplace:..."] → NIP-73 external content ID for Google Places
 *   - ["location", "..."] → Human-readable address (NIP-52 convention)
 *
 * No DOM dependencies — safe for SSR/Node.
 */

import { decodeGeohash, encodeGeohash } from '@nostr-post/plugin-geo';
import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

// ── Types ───────────────────────────────────────────────────────────

export interface VenuePluginConfig {
  /** Geohash precision (4-8 chars). Default 6 (~610 m). */
  precision?: number;
  /** Default map zoom level when no value is set. */
  defaultZoom?: number;
  /** Search providers to enable. Default: ['osm'] */
  providers?: ('osm' | 'google')[];
  /** Google Maps Places API key. Required when 'google' is in providers. */
  googleApiKey?: string;
}

/**
 * Structured venue data passed between input ↔ core ↔ view.
 * The input component produces this; the view component consumes it.
 */
export interface VenueData {
  /** Geohash of the venue's coordinates */
  geohash: string;
  /** Latitude (decoded from geohash or from search result) */
  lat: number;
  /** Longitude (decoded from geohash or from search result) */
  lon: number;
  /** Human-readable display name / address */
  name?: string;
  /** OpenStreetMap entity reference: "node:12345" | "way:12345" | "relation:12345" */
  osmId?: string;
  /** OSM entity type for URL building */
  osmType?: 'node' | 'way' | 'relation';
  /** Google Places ID */
  googlePlaceId?: string;
}

/**
 * Nominatim search result from OpenStreetMap.
 */
export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  place_id: number;
  licence: string;
  class: string;
  type: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Build the NIP-73 `i` tag value for an OSM entity. */
export const osmIdentifier = (osmType: string, osmId: string | number): string =>
  `osm:${osmType}:${osmId}`;

/** Build the NIP-73 `i` tag value for a Google Place. */
export const googlePlaceIdentifier = (placeId: string): string => `gplace:${placeId}`;

/** Build an OSM URL from type + id. */
export const osmUrl = (osmType: string, osmId: string | number): string =>
  `https://www.openstreetmap.org/${osmType}/${osmId}`;

/** Build a Google Maps URL from a place ID. */
export const googleMapsPlaceUrl = (placeId: string): string =>
  `https://www.google.com/maps/place/?q=place_id:${placeId}`;

/** Build a Google Maps URL from coordinates. */
export const googleMapsUrl = (lat: number, lon: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

/**
 * Search OSM Nominatim for venues matching a query string.
 * Free API, no key required. Rate-limit: max 1 request/second.
 */
export const searchNominatim = async (query: string): Promise<NominatimResult[]> => {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '8');

  const resp = await fetch(url.toString(), {
    headers: { 'User-Agent': 'nostr-post/0.1' },
  });

  if (!resp.ok) throw new Error(`Nominatim search failed: ${resp.status}`);
  return resp.json() as Promise<NominatimResult[]>;
};

/**
 * Lookup a specific OSM entity by type and ID.
 * Used to validate and resolve prefilled OSM data.
 */
export const lookupNominatimByOsmId = async (
  osmType: 'node' | 'way' | 'relation',
  osmId: string | number
): Promise<NominatimResult | null> => {
  const osmTypePrefix = osmType.charAt(0).toUpperCase(); // N, W, R
  const url = new URL('https://nominatim.openstreetmap.org/lookup');
  url.searchParams.set('osm_ids', `${osmTypePrefix}${osmId}`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  const resp = await fetch(url.toString(), {
    headers: { 'User-Agent': 'nostr-post/0.1' },
  });

  if (!resp.ok) throw new Error(`Nominatim lookup failed: ${resp.status}`);
  const results = (await resp.json()) as NominatimResult[];
  return results[0] ?? null;
};

/**
 * Convert a Nominatim result to VenueData.
 */
export const nominatimToVenue = (result: NominatimResult, precision = 6): VenueData => {
  const lat = Number.parseFloat(result.lat);
  const lon = Number.parseFloat(result.lon);
  return {
    geohash: encodeGeohash(lat, lon, precision),
    lat,
    lon,
    name: result.display_name,
    osmId: String(result.osm_id),
    osmType: result.osm_type,
  };
};

/** BASE32 alphabet for geohash validation (same as plugin-geo). */
const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Validate that a string is a valid geohash. */
const isValidGeohash = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (const ch of value) {
    if (!GEOHASH_BASE32.includes(ch)) return false;
  }
  return true;
};

// ── Plugin definition ───────────────────────────────────────────────

export const venuePlugin: NostrUIPlugin = {
  id: 'venue',
  type: 'geo',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (!value || typeof value !== 'object') {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Venue must be a valid venue object with at least a geohash',
          code: 'INVALID_VENUE',
        },
      };
    }

    const venue = value as VenueData;
    if (!isValidGeohash(venue.geohash)) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Venue must have a valid geohash location',
          code: 'INVALID_VENUE_GEOHASH',
        },
      };
    }

    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string => {
    if (!value || typeof value !== 'object') return 'Unknown venue';
    const venue = value as VenueData;
    if (venue.name) return `📍 ${venue.name}`;
    return `📍 ${venue.lat.toFixed(5)}, ${venue.lon.toFixed(5)}`;
  },

  /**
   * Serialize venue data to a geohash string for the primary "g" tag.
   * The extra tags (i, location) are handled by extraTags().
   */
  serializeValue: (value: unknown): string => {
    if (!value || typeof value !== 'object') return '';
    const venue = value as VenueData;
    return venue.geohash;
  },

  /**
   * Deserialize a geohash string back to minimal VenueData.
   * Full venue data (with name/osmId) is only available via resolveFromTags.
   */
  deserializeValue: (raw: string): unknown => {
    if (!isValidGeohash(raw)) return raw;
    const { lat, lon } = decodeGeohash(raw);
    return { geohash: raw, lat, lon } as VenueData;
  },

  /**
   * Produce extra tags beyond the primary "g" geohash tag.
   * Called by the coordinator during event creation.
   */
  extraTags: (value: unknown, _field: PostField): [string, ...string[]][] => {
    if (!value || typeof value !== 'object') return [];
    const venue = value as VenueData;
    const tags: [string, ...string[]][] = [];

    // NIP-73: OSM venue identity
    if (venue.osmType && venue.osmId) {
      tags.push(['i', osmIdentifier(venue.osmType, venue.osmId)]);
    }

    // NIP-73: Google Places identity
    if (venue.googlePlaceId) {
      tags.push(['i', googlePlaceIdentifier(venue.googlePlaceId)]);
    }

    // NIP-52: Human-readable location name
    if (venue.name) {
      tags.push(['location', venue.name]);
    }

    return tags;
  },

  /**
   * Reconstruct VenueData from all event tags (for view rendering).
   * Reads "g", "i" (osm/gplace), and "location" tags.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parser handles multiple interoperable tag formats
  resolveFromTags: (tags: string[][], _field: PostField): unknown => {
    // Find the most precise geohash (longest "g" tag value)
    let geohash = '';
    for (const tag of tags) {
      if (tag[0] === 'g' && tag[1] && tag[1].length > geohash.length) {
        geohash = tag[1];
      }
    }

    if (!geohash) return null;

    const { lat, lon } = decodeGeohash(geohash);
    const venue: VenueData = { geohash, lat, lon };

    // Extract NIP-73 identifiers
    for (const tag of tags) {
      if (tag[0] !== 'i' || !tag[1]) continue;

      if (tag[1].startsWith('osm:')) {
        // Format: "osm:node:12345" or "osm:way:12345" or "osm:relation:12345"
        const parts = tag[1].split(':');
        if (parts.length >= 3) {
          venue.osmType = parts[1] as VenueData['osmType'];
          venue.osmId = parts.slice(2).join(':');
        }
      } else if (tag[1].startsWith('gplace:')) {
        venue.googlePlaceId = tag[1].slice('gplace:'.length);
      }
    }

    // Extract human-readable location
    const locationTag = tags.find((t) => t[0] === 'location' && t[1]);
    if (locationTag) {
      venue.name = locationTag[1];
    }

    return venue;
  },
};

// Re-export geo utilities for convenience
export { encodeGeohash, decodeGeohash } from '@nostr-post/plugin-geo';
