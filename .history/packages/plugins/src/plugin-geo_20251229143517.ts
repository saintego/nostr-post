/**
 * @nostr-post/plugins - Geo location plugin
 *
 * A plugin for geographic coordinates (latitude/longitude)
 */

import type {
  NostrUIPlugin,
  PostField,
  Result,
  ValidationError,
} from '../../core/src/types';

export interface GeoPluginConfig {
  defaultZoom?: number;
  allowSearch?: boolean;
}

export interface GeoCoordinates {
  lat: number;
  lon: number;
  alt?: number; // Altitude in meters
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
          message: 'Coordinates must be an object',
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
};
