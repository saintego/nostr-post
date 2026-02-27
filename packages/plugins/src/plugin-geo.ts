/**
 * @nostr-post/plugins - Geo location plugin
 *
 * A plugin for geographic coordinates (latitude/longitude)
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from './types';

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

  renderInput: (ctx): HTMLElement => {
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';

    const currentValue =
      typeof ctx.value === 'object' && ctx.value !== null
        ? (ctx.value as GeoCoordinates)
        : { lat: 0, lon: 0 };

    // Latitude input
    const latLabel = document.createElement('label');
    latLabel.style.cssText = 'font-size: 0.875rem; font-weight: 500;';
    latLabel.textContent = 'Latitude';
    container.appendChild(latLabel);

    const latInput = document.createElement('input');
    latInput.type = 'number';
    latInput.min = '-90';
    latInput.max = '90';
    latInput.step = '0.00001';
    latInput.value = String(currentValue.lat);
    latInput.placeholder = 'e.g., 40.7128';
    latInput.style.cssText = `
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    `;
    latInput.addEventListener('input', (e) => {
      const newLat = Number.parseFloat((e.target as HTMLInputElement).value);
      ctx.onChange({ ...currentValue, lat: newLat });
    });
    container.appendChild(latInput);

    // Longitude input
    const lonLabel = document.createElement('label');
    lonLabel.style.cssText = 'font-size: 0.875rem; font-weight: 500;';
    lonLabel.textContent = 'Longitude';
    container.appendChild(lonLabel);

    const lonInput = document.createElement('input');
    lonInput.type = 'number';
    lonInput.min = '-180';
    lonInput.max = '180';
    lonInput.step = '0.00001';
    lonInput.value = String(currentValue.lon);
    lonInput.placeholder = 'e.g., -74.0060';
    lonInput.style.cssText = `
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    `;
    lonInput.addEventListener('input', (e) => {
      const newLon = Number.parseFloat((e.target as HTMLInputElement).value);
      ctx.onChange({ ...currentValue, lon: newLon });
    });
    container.appendChild(lonInput);

    // Display coordinates
    if (currentValue.lat !== 0 || currentValue.lon !== 0) {
      const display = document.createElement('div');
      display.style.cssText = 'font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;';
      display.textContent = `📍 ${currentValue.lat.toFixed(5)}, ${currentValue.lon.toFixed(5)}`;
      container.appendChild(display);
    }

    return container;
  },

  renderView: (value: unknown): HTMLElement => {
    const container = document.createElement('div');

    if (typeof value !== 'object' || value === null) {
      container.textContent = 'Invalid coordinates';
      return container;
    }

    const coords = value as GeoCoordinates;
    const text = document.createElement('div');
    text.style.cssText = 'font-family: monospace; font-size: 0.875rem;';
    text.textContent = `📍 ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}${coords.alt ? ` • ${coords.alt}m` : ''}`;
    container.appendChild(text);

    // Link to maps
    const link = document.createElement('a');
    link.href = `https://maps.google.com/?q=${coords.lat},${coords.lon}`;
    link.textContent = 'View on Google Maps';
    link.target = '_blank';
    link.style.cssText = `
      display: block;
      margin-top: 0.5rem;
      color: #6366f1;
      text-decoration: underline;
      font-size: 0.875rem;
    `;
    container.appendChild(link);

    return container;
  },
};
