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

import { decodeGeohash, isValidGeohash } from '@nostr-post/core/geohash';
import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export interface GeoPluginConfig {
  /** Geohash precision (4-8 chars). Default 6 (~610 m). */
  precision?: number;
  /** Default map zoom level when no value is set. */
  defaultZoom?: number;
  /** Enable Nominatim search box. */
  allowSearch?: boolean;
}

export { decodeGeohash, encodeGeohash, type GeoCoordinates } from '@nostr-post/core/geohash';

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
