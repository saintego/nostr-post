/**
 * @nostr-post/plugin-geo - Core
 *
 * Geographic location plugin: validation, serialization.
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export interface GeoPluginConfig {
  defaultZoom?: number;
  allowSearch?: boolean;
}

export interface GeoCoordinates {
  lat: number;
  lon: number;
}

export const geoPlugin: NostrUIPlugin = {
  id: 'geo',
  type: 'geo',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'object' || value === null) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Coordinates must be an object with lat and lon',
          code: 'INVALID_TYPE',
        },
      };
    }

    const coords = value as GeoCoordinates;

    if (typeof coords.lat !== 'number' || typeof coords.lon !== 'number') {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Latitude and longitude must be numbers',
          code: 'INVALID_COORDS',
        },
      };
    }

    if (coords.lat < -90 || coords.lat > 90) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Latitude must be between -90 and 90',
          code: 'INVALID_LATITUDE',
        },
      };
    }

    if (coords.lon < -180 || coords.lon > 180) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Longitude must be between -180 and 180',
          code: 'INVALID_LONGITUDE',
        },
      };
    }

    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string => {
    if (typeof value !== 'object' || value === null) return 'Unknown location';
    const { lat, lon } = value as GeoCoordinates;
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  },

  serializeValue: (value: unknown): string => {
    if (typeof value !== 'object' || value === null) return '0,0';
    const { lat, lon } = value as GeoCoordinates;
    return `${lat},${lon}`;
  },

  deserializeValue: (raw: string): unknown => {
    const parts = raw.split(',');
    if (parts.length >= 2) {
      const lat = Number.parseFloat(parts[0]);
      const lon = Number.parseFloat(parts[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        return { lat, lon } as GeoCoordinates;
      }
    }
    return null;
  },
};
