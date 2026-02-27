/**
 * @nostr-post/plugin-geo - Core
 *
 * Geographic location plugin using geohash encoding (NIP-52 compatible).
 * No DOM dependencies — safe for SSR/Node.
 *
 * Geohash precision guide:
 *   4 chars ≈ ±20 km  (city level, privacy-friendly)
 *   5 chars ≈ ±2.4 km (neighbourhood)
 *   6 chars ≈ ±610 m  (street level)
 *   7 chars ≈ ±76 m   (building level)
 *   8 chars ≈ ±19 m   (precise)
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

// ── Geohash encode/decode ───────────────────────────────────────────

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface GeoPluginConfig {
  /** Geohash precision (4-8 chars). Default 6 (~610 m). */
  precision?: number;
  /** Default map zoom level when no value is set. */
  defaultZoom?: number;
  /** Enable Nominatim search box. */
  allowSearch?: boolean;
}

export interface GeoCoordinates {
  lat: number;
  lon: number;
}

/** Encode lat/lon to a geohash string. */
export const encodeGeohash = (lat: number, lon: number, precision = 6): string => {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isLon = true;
  let bit = 0;
  let ch = 0;
  let hash = '';

  while (hash.length < precision) {
    if (isLon) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        ch |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isLon = !isLon;
    bit++;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
};

/** Decode a geohash string to lat/lon (centre of bounding box). */
export const decodeGeohash = (hash: string): GeoCoordinates => {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isLon = true;

  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) continue;
    for (let bit = 4; bit >= 0; bit--) {
      if (isLon) {
        const mid = (lonMin + lonMax) / 2;
        if (idx & (1 << bit)) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & (1 << bit)) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isLon = !isLon;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
  };
};

/** Check that every character is in the geohash base32 alphabet. */
const isValidGeohash = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (const ch of value) {
    if (!BASE32.includes(ch)) return false;
  }
  return true;
};

// ── Plugin definition ───────────────────────────────────────────────

export const geoPlugin: NostrUIPlugin = {
  id: 'geo',
  type: 'geo',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (!isValidGeohash(value)) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Location must be a valid geohash string',
          code: 'INVALID_GEOHASH',
        },
      };
    }
    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string => {
    if (typeof value !== 'string' || value.length === 0) return 'Unknown location';
    const { lat, lon } = decodeGeohash(value);
    return `📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  },

  /** Geohash string passes through as-is */
  serializeValue: (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  },

  /** Geohash string comes back as-is */
  deserializeValue: (raw: string): unknown => {
    return raw;
  },
};
