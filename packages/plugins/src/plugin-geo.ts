/**
 * @nostr-post/plugins - Geo location plugin
 *
 * Stores location as a geohash string (NIP-52 compatible `g` tag).
 * Lat/lon are decoded from the geohash for display — no separate coordinate storage needed.
 *
 * Geohash precision guide:
 *   4 chars ≈ ±20 km  (city level, privacy-friendly)
 *   5 chars ≈ ±2.4 km (neighbourhood)
 *   6 chars ≈ ±610 m  (street level)
 *   7 chars ≈ ±76 m   (building level)
 *   8 chars ≈ ±19 m   (precise)
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from './types';

// ── Geohash encoder / decoder ───────────────────────────────────────

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface GeoPluginConfig {
  /** Geohash precision (4-8 chars). Default 6 (~610 m). */
  precision?: number;
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
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: geohash bit-walk algorithm is intentionally imperative
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

// ── Plugin definition ───────────────────────────────────────────────

export const geoPlugin: NostrUIPlugin = {
  id: 'geo',
  type: 'geo',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'string' || value.length === 0) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Location must be a geohash string',
          code: 'INVALID_TYPE',
        },
      };
    }

    // Verify every char is in the base32 alphabet
    for (const ch of value as string) {
      if (!BASE32.includes(ch)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Invalid geohash character: "${ch}"`,
            code: 'INVALID_GEOHASH',
          },
        };
      }
    }

    return { success: true, data: undefined };
  },

  /** Serialize: value is already a geohash string, pass through */
  serializeValue: (value: unknown): string => String(value),

  /** Deserialize: geohash string comes back as-is */
  deserializeValue: (raw: string): unknown => raw,

  /** Human-readable representation */
  formatValue: (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const { lat, lon } = decodeGeohash(value);
    return `📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  },

  renderInput: (ctx): HTMLElement => {
    const config = (ctx.field.metadata as GeoPluginConfig) || {};
    const precision = config.precision ?? 6;
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';

    const currentGeohash = typeof ctx.value === 'string' ? (ctx.value as string) : '';
    const currentCoords = currentGeohash ? decodeGeohash(currentGeohash) : null;

    // ── Coordinate inputs (for easy entry) ──

    const coordRow = document.createElement('div');
    coordRow.style.cssText = 'display: flex; gap: 0.5rem;';

    const latInput = document.createElement('input');
    latInput.type = 'number';
    latInput.min = '-90';
    latInput.max = '90';
    latInput.step = '0.00001';
    latInput.value = currentCoords ? String(currentCoords.lat.toFixed(5)) : '';
    latInput.placeholder = 'Latitude';
    latInput.style.cssText = 'flex:1; padding:0.5rem; border:1px solid #d1d5db; border-radius:4px;';

    const lonInput = document.createElement('input');
    lonInput.type = 'number';
    lonInput.min = '-180';
    lonInput.max = '180';
    lonInput.step = '0.00001';
    lonInput.value = currentCoords ? String(currentCoords.lon.toFixed(5)) : '';
    lonInput.placeholder = 'Longitude';
    lonInput.style.cssText = 'flex:1; padding:0.5rem; border:1px solid #d1d5db; border-radius:4px;';

    const geohashInput = document.createElement('input');
    geohashInput.type = 'text';
    geohashInput.value = currentGeohash;

    const display = document.createElement('div');
    display.style.cssText = 'font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;';

    const updateDisplay = (hash: string) => {
      if (hash.length >= 1) {
        const { lat, lon } = decodeGeohash(hash);
        display.innerHTML = `📍 <code>${hash}</code> → ${lat.toFixed(5)}, ${lon.toFixed(5)} <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}" target="_blank" style="color:#6366f1; text-decoration:underline;">OSM</a>`;
      } else {
        display.textContent = '';
      }
    };

    const updateFromCoords = () => {
      const lat = Number.parseFloat(latInput.value);
      const lon = Number.parseFloat(lonInput.value);
      if (
        !Number.isNaN(lat) &&
        !Number.isNaN(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      ) {
        const hash = encodeGeohash(lat, lon, precision);
        geohashInput.value = hash;
        ctx.onChange(hash);
        updateDisplay(hash);
      }
    };

    latInput.addEventListener('input', updateFromCoords);
    lonInput.addEventListener('input', updateFromCoords);
    coordRow.appendChild(latInput);
    coordRow.appendChild(lonInput);
    container.appendChild(coordRow);

    // ── Direct geohash input ──

    const geohashRow = document.createElement('div');
    geohashRow.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

    const geohashLabel = document.createElement('span');
    geohashLabel.textContent = 'Geohash:';
    geohashLabel.style.cssText = 'font-size: 0.8rem; color: #6b7280; white-space: nowrap;';

    geohashInput.placeholder = 'e.g. u4pruy';
    geohashInput.maxLength = 12;
    geohashInput.style.cssText =
      'flex:1; padding:0.5rem; border:1px solid #d1d5db; border-radius:4px; font-family:monospace;';
    geohashInput.addEventListener('input', (e) => {
      const hash = (e.target as HTMLInputElement).value.toLowerCase().trim();
      ctx.onChange(hash);
      if (hash.length >= 1) {
        const decoded = decodeGeohash(hash);
        latInput.value = decoded.lat.toFixed(5);
        lonInput.value = decoded.lon.toFixed(5);
      }
      updateDisplay(hash);
    });
    geohashRow.appendChild(geohashLabel);
    geohashRow.appendChild(geohashInput);
    container.appendChild(geohashRow);

    // ── "Use my location" button ──

    const locBtn = document.createElement('button');
    locBtn.type = 'button';
    locBtn.textContent = '📍 Use my location';
    locBtn.style.cssText = `
      padding: 0.4rem 0.75rem; border: 1px solid #d1d5db; border-radius: 4px;
      background: #f9fafb; cursor: pointer; font-size: 0.85rem; align-self: flex-start;
    `;
    locBtn.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      locBtn.textContent = '⏳ Getting location…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const hash = encodeGeohash(pos.coords.latitude, pos.coords.longitude, precision);
          latInput.value = pos.coords.latitude.toFixed(5);
          lonInput.value = pos.coords.longitude.toFixed(5);
          geohashInput.value = hash;
          ctx.onChange(hash);
          updateDisplay(hash);
          locBtn.textContent = '📍 Use my location';
        },
        () => {
          locBtn.textContent = '📍 Use my location';
        }
      );
    });
    container.appendChild(locBtn);

    // ── Display area ──

    updateDisplay(currentGeohash);
    container.appendChild(display);

    return container;
  },

  renderView: (value: unknown): HTMLElement => {
    const container = document.createElement('div');

    if (typeof value !== 'string' || value.length === 0) {
      container.textContent = 'No location';
      return container;
    }

    const hash = value as string;
    const { lat, lon } = decodeGeohash(hash);

    const text = document.createElement('div');
    text.style.cssText = 'font-family: monospace; font-size: 0.875rem;';
    text.textContent = `📍 ${hash} (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
    container.appendChild(text);

    // Link to OSM
    const osmLink = document.createElement('a');
    osmLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
    osmLink.textContent = 'View on OpenStreetMap';
    osmLink.target = '_blank';
    osmLink.style.cssText = `
      display: inline-block; margin-top: 0.5rem; margin-right: 1rem;
      color: #6366f1; text-decoration: underline; font-size: 0.875rem;
    `;
    container.appendChild(osmLink);

    // Link to Google Maps
    const gLink = document.createElement('a');
    gLink.href = `https://maps.google.com/?q=${lat},${lon}`;
    gLink.textContent = 'Google Maps';
    gLink.target = '_blank';
    gLink.style.cssText = `
      display: inline-block; margin-top: 0.5rem;
      color: #6366f1; text-decoration: underline; font-size: 0.875rem;
    `;
    container.appendChild(gLink);

    return container;
  },
};
