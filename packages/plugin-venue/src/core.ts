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
import { googleCidIdentifier } from './googleLink';
import {
  type VenueLevel,
  geohashTags,
  levelPrecision,
  resultLevel,
  searchFeatureType,
  venueLevels,
} from './levels';

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
  /** What the field can stand for: `['country', 'city', 'place']`; default exact places */
  levels?: VenueLevel[];
  /**
   * Only link the venue's wiki page (`a` tag, plus its role), without the
   * venue's own tags (`i`, `g`, `location`): for venues in a role, e.g. where a
   * beer was tasted, so several venues in one post don't mix. Needs `wikiEntity`.
   */
  linkOnly?: boolean;
  /** Several venues (the value is a list), e.g. a brewery's taprooms; usually with `linkOnly` */
  multiple?: boolean;
}

const isLinkOnly = (field?: PostField): boolean => field?.metadata?.linkOnly === true;

/** The venue's wiki page address, once the venue hub created or found it */
export const pageAddress = (venue: VenueData): string =>
  venue.wikiEntity ? `30818:${venue.wikiEntity.pubkey}:${venue.wikiEntity.dTag}` : '';

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
  /** Google's CID of the place, from a pasted Google Maps link (`i gcid:<cid>`) */
  googleCid?: string;
  /** Address parts from the search result (city is used for the wiki entity's name) */
  address?: VenueAddress;
  /**
   * Create/update the venue's wiki entity when publishing (fields with
   * `metadata.wikiEntity`). Unset means yes.
   */
  syncWiki?: boolean;
  /**
   * The new wiki page's slug as edited by the user next to the publish button
   * (without the type suffix); unset means the slug generated from the template.
   */
  wikiSlug?: string;
  /** The venue's wiki entity a post links to (from its `a` tag), when reading a post */
  wikiEntity?: { pubkey: string; dTag: string };
  /** Country, city or exact place (see levels.ts); unset means an exact place */
  level?: VenueLevel;
  /** ISO 3166-1 alpha-2 code of the country, e.g. `CZ` */
  countryCode?: string;
  /** Wikidata item of the place, e.g. `Q1085`, when OSM has one */
  wikidata?: string;
}

export interface VenueAddress {
  street?: string;
  houseNumber?: string;
  /** District, quarter or neighbourhood */
  district?: string;
  city?: string;
  postcode?: string;
  country?: string;
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
  /** Present with `addressdetails=1` */
  address?: Record<string, string>;
  /** What the result is: `country`, `city`, `town`, `amenity`, … */
  addresstype?: string;
  /** Present with `extratags=1`, e.g. `wikidata` */
  extratags?: Record<string, string> | null;
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
export const searchNominatim = async (
  query: string,
  levels: VenueLevel[] = ['place'],
  /** Only results in a box around this point (e.g. from a pasted Google Maps link) */
  near?: { lat: number; lon: number },
  /** Half the box's side in degrees; default ~300 m */
  nearDegrees = 0.003
): Promise<NominatimResult[]> => {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('limit', '8');
  const featureType = searchFeatureType(levels);
  if (featureType) url.searchParams.set('featureType', featureType);
  if (near) {
    const d = nearDegrees;
    url.searchParams.set(
      'viewbox',
      `${near.lon - d},${near.lat + d},${near.lon + d},${near.lat - d}`
    );
    url.searchParams.set('bounded', '1');
  }

  const resp = await fetch(url.toString(), {
    headers: { 'User-Agent': 'nostr-post/0.1' },
  });

  if (!resp.ok) throw new Error(`Nominatim search failed: ${resp.status}`);
  const results = (await resp.json()) as NominatimResult[];
  return results.filter((r) => levels.includes(resultLevel(r)));
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
  url.searchParams.set('extratags', '1');

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
  const level = resultLevel(result);
  // A country keeps a 2-character geohash for the map; it isn't published
  const geohashLength = Math.max(levelPrecision(level, precision), 2);
  return {
    geohash: encodeGeohash(lat, lon, geohashLength),
    lat,
    lon,
    name: result.display_name,
    osmId: String(result.osm_id),
    osmType: result.osm_type,
    address: result.address ? nominatimAddress(result.address) : undefined,
    level,
    countryCode: result.address?.country_code?.toUpperCase(),
    wikidata: result.extratags?.wikidata,
  };
};

/** The OSM address at a point (Nominatim reverse lookup), e.g. for a venue OSM doesn't have */
export const reverseNominatim = async (
  lat: number,
  lon: number
): Promise<NominatimResult | null> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');
  const resp = await fetch(url.toString(), { headers: { 'User-Agent': 'nostr-post/0.1' } });
  return resp.ok ? ((await resp.json()) as NominatimResult) : null;
};

/** Address parts from Nominatim's `address` object (city may be a town or village) */
export const nominatimAddress = (a: Record<string, string>): VenueAddress => ({
  street: a.road ?? a.pedestrian,
  houseNumber: a.house_number,
  district: a.suburb ?? a.quarter ?? a.neighbourhood ?? a.city_district,
  city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet,
  postcode: a.postcode,
  country: a.country,
});

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

/**
 * The level of a venue read from tags: no area is a country; a geohash coarser
 * than the field's places (cities are published at most 4 characters long) a
 * city, for any OSM element type (towns are often nodes)
 */
const publishedLevel = (venue: VenueData, field: PostField): VenueLevel => {
  if (!venue.geohash) return 'country';
  const config = (field?.metadata ?? {}) as VenuePluginConfig;
  const levels = venueLevels(config.levels);
  if (!levels.includes('city')) return 'place';
  if (!levels.includes('place')) return 'city';
  const placeLength = levelPrecision('place', config.precision ?? 6);
  const cityLength = levelPrecision('city', placeLength);
  return venue.geohash.length <= cityLength && venue.geohash.length < placeLength
    ? 'city'
    : 'place';
};

// ── Plugin definition ───────────────────────────────────────────────

export const venuePlugin: NostrUIPlugin = {
  id: 'venue',
  type: 'geo',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    // An empty field is fine unless it's required
    const empty =
      value === undefined || value === null || (Array.isArray(value) && value.length === 0);
    if (empty && !field.required) return { success: true, data: undefined };
    // `metadata.multiple`: a list of venues, each checked
    if (Array.isArray(value)) {
      const invalid = value
        .map((v) => venuePlugin.validate?.(v, field))
        .find((r) => r && !r.success);
      return invalid ?? { success: true, data: undefined };
    }
    // A link-only venue read back from a post or page: only its wiki page
    if (isLinkOnly(field) && (value as VenueData | null)?.wikiEntity) {
      return { success: true, data: undefined };
    }
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
    if (Array.isArray(value)) return value.map((v) => venuePlugin.formatValue?.(v)).join(', ');
    if (!value || typeof value !== 'object') return 'Unknown venue';
    const venue = value as VenueData;
    if (venue.name) return `📍 ${venue.name}`;
    // A link-only venue read back: its wiki page
    if (venue.wikiEntity) return `📍 ${venue.wikiEntity.dTag}`;
    if (typeof venue.lat !== 'number') return 'Unknown venue';
    return `📍 ${venue.lat.toFixed(5)}, ${venue.lon.toFixed(5)}`;
  },

  /**
   * Serialize venue data to a geohash string for the primary "g" tag.
   * The extra tags (i, location) are handled by extraTags().
   */
  serializeValue: (value: unknown, field?: PostField): string => {
    if (!value || typeof value !== 'object') return '';
    const venue = value as VenueData;
    if (isLinkOnly(field)) return pageAddress(venue);
    // A country has no published area
    return venue.level === 'country' ? '' : venue.geohash;
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
  extraTags: (value: unknown, field: PostField): [string, ...string[]][] => {
    if (!value || typeof value !== 'object' || isLinkOnly(field)) return [];
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
    // A pasted Google Maps link: its CID (the link is worked out from it when shown)
    if (venue.googleCid) tags.push(['i', googleCidIdentifier(venue.googleCid)]);

    // NIP-73: country (every level) and Wikidata identity
    if (venue.countryCode) tags.push(['i', `iso3166:${venue.countryCode}`]);
    if (venue.wikidata) tags.push(['i', `wikidata:${venue.wikidata}`]);

    // Shorter geohash prefixes, for area queries; the full one is the primary `g` tag
    if (venue.level !== 'country') tags.push(...geohashTags(venue.geohash).slice(1));

    // NIP-52: Human-readable location name
    if (venue.name) {
      tags.push(['location', venue.name]);
    }

    return tags;
  },

  /**
   * With `metadata.wikiEntity` (a wiki entity manifest id), create or update the
   * venue's wiki entity from OSM before the post is published, and link to it.
   * Loaded lazily so plain venue fields don't pull in the wiki code.
   */
  beforePublish: async (value, field) => {
    if (!field.metadata?.wikiEntity || !value || typeof value !== 'object') return [];
    // Only an exact place gets a venue wiki page
    if ((value as VenueData).level && (value as VenueData).level !== 'place') return [];
    const { syncVenueEntity } = await import('./wikiSync');
    return syncVenueEntity(value as VenueData, field);
  },

  /**
   * Reconstruct VenueData from all event tags (for view rendering).
   * Reads "g", "i" (osm/gplace), and "location" tags.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parser handles multiple interoperable tag formats
  resolveFromTags: (tags: string[][], field: PostField): unknown => {
    // Find the most precise geohash (longest "g" tag value)
    let geohash = '';
    for (const tag of tags) {
      if (tag[0] === 'g' && tag[1] && tag[1].length > geohash.length) {
        geohash = tag[1];
      }
    }

    // A country has no `g` tag: its identity is the iso3166/osm `i` tags
    const hasIds = tags.some((t) => t[0] === 'i' && /^(osm|iso3166):/.test(t[1] ?? ''));
    if (!geohash && !hasIds) return null;

    const { lat, lon } = geohash ? decodeGeohash(geohash) : { lat: 0, lon: 0 };
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
      } else if (tag[1].startsWith('gcid:')) {
        venue.googleCid = tag[1].slice('gcid:'.length);
      } else if (tag[1].startsWith('iso3166:')) {
        venue.countryCode = tag[1].slice('iso3166:'.length);
      } else if (tag[1].startsWith('wikidata:')) {
        venue.wikidata = tag[1].slice('wikidata:'.length);
      }
    }

    // Extract human-readable location
    const locationTag = tags.find((t) => t[0] === 'location' && t[1]);
    if (locationTag) {
      venue.name = locationTag[1];
    }

    // The venue's wiki entity (`a` tag "30818:<pubkey>:<d-tag>")
    const [, pubkey, ...dTag] =
      tags.find((t) => t[0] === 'a' && t[1]?.startsWith('30818:'))?.[1]?.split(':') ?? [];
    if (pubkey && dTag.length > 0) venue.wikiEntity = { pubkey, dTag: dTag.join(':') };

    venue.level = publishedLevel(venue, field);
    return venue;
  },
};

// Re-export geo utilities for convenience
export { encodeGeohash, decodeGeohash } from '@nostr-post/plugin-geo';
