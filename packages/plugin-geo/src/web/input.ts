/**
 * @nostr-post/plugin-geo - <np-geo-input>
 *
 * Interactive map-based location picker using Leaflet (OpenStreetMap).
 * Features:
 *   - Click on map to place/move marker
 *   - Search box with Nominatim geocoding
 *   - Geohash + lat/lon display that syncs with the map
 *   - "Use my location" button (Geolocation API)
 *
 * Accepts .value (geohash string | null) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: geohash_string } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import L from 'leaflet';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type GeoCoordinates, type GeoPluginConfig, decodeGeohash, encodeGeohash } from '../core';
import { geoInputStyles } from './inputStyles';

// Fix Leaflet default marker icons (broken by bundlers)
// biome-ignore lint/performance/noDelete: Leaflet internals require delete
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@customElement('np-geo-input')
export class NpGeoInput extends LitElement {
  static override styles = geoInputStyles;

  /** Geohash string (external value) */
  @property({ type: String })
  value: string | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  /**
   * A geohash to look at while there's no value: the map zooms to it without a
   * marker, so the point is still the user's to set (e.g. a pasted link's place)
   */
  @property({ attribute: false })
  focusPoint: string | null = null;

  /** When true, hides the built-in search bar (useful when wrapped by another component) */
  @property({ type: Boolean })
  hideSearch = false;

  /** Decoded coordinates for internal map display */
  @state() private coords: GeoCoordinates | null = null;

  @state() private searchQuery = '';
  @state() private searching = false;
  @state() private searchResults: NominatimResult[] = [];

  private map?: L.Map;
  private marker?: L.Marker;
  private _mapInitialized = false;

  private get config(): GeoPluginConfig {
    return (this.field?.metadata as GeoPluginConfig) || {};
  }

  private get precision(): number {
    return this.config.precision ?? 6;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.marker = undefined;
      this._mapInitialized = false;
    }
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    super.updated(changed);
    // Initialize map after first render
    if (!this._mapInitialized) {
      this.initMap();
    }
    if (changed.has('focusPoint') && this.map && this.focusPoint && !this.value) {
      const { lat, lon } = decodeGeohash(this.focusPoint);
      this.map.setView([lat, lon], 18);
    }
    // If value changed externally, decode and update marker
    if (changed.has('value') && this.map && this.value) {
      this.coords = decodeGeohash(this.value);
      this.updateMarker(this.coords.lat, this.coords.lon, false);
    }
  }

  private initMap() {
    const mapEl = this.shadowRoot?.querySelector('.map-inner') as HTMLElement | null;
    if (!mapEl) return;

    this._mapInitialized = true;

    // Decode geohash for initial position
    if (this.value) {
      this.coords = decodeGeohash(this.value);
    }
    // No value: the focus point (street level, no marker), else a world view
    const focus = !this.coords && this.focusPoint ? decodeGeohash(this.focusPoint) : null;
    const defaultLat = this.coords?.lat ?? focus?.lat ?? 48.8566;
    const defaultLon = this.coords?.lon ?? focus?.lon ?? 2.3522;
    const zoom = focus ? 18 : (this.config.defaultZoom ?? (this.coords ? 13 : 3));

    this.map = L.map(mapEl, {
      attributionControl: true,
      zoomControl: true,
    }).setView([defaultLat, defaultLon], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Place initial marker if value exists
    if (this.coords) {
      this.marker = L.marker([this.coords.lat, this.coords.lon]).addTo(this.map);
    }

    // Click to place marker
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.setCoords(e.latlng.lat, e.latlng.lng);
    });

    // Leaflet needs a size recalc after being added to Shadow DOM
    requestAnimationFrame(() => {
      this.map?.invalidateSize();
    });
  }

  private updateMarker(lat: number, lon: number, pan = true) {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
    } else {
      this.marker = L.marker([lat, lon]).addTo(this.map);
    }
    if (pan) {
      this.map.setView([lat, lon], Math.max(this.map.getZoom(), 13));
    }
  }

  private setCoords(lat: number, lon: number) {
    const roundedLat = Math.round(lat * 100000) / 100000;
    const roundedLon = Math.round(lon * 100000) / 100000;

    this.coords = { lat: roundedLat, lon: roundedLon };
    this.updateMarker(roundedLat, roundedLon);

    const geohash = encodeGeohash(roundedLat, roundedLon, this.precision);
    this.value = geohash;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: geohash },
        bubbles: true,
        composed: true,
      })
    );

    // Clear search results after selection
    this.searchResults = [];
  }

  private async handleSearch() {
    const query = this.searchQuery.trim();
    if (!query) return;

    this.searching = true;
    this.searchResults = [];

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'nostr-post-plugin-geo/0.1',
          },
        }
      );

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const results: NominatimResult[] = await resp.json();
      this.searchResults = results;

      // If exactly one result, auto-select it
      if (results.length === 1) {
        this.selectSearchResult(results[0]);
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    } finally {
      this.searching = false;
    }
  }

  private selectSearchResult(result: NominatimResult) {
    this.setCoords(Number.parseFloat(result.lat), Number.parseFloat(result.lon));
    this.searchQuery = result.display_name;
    this.searchResults = [];
  }

  private handleLocateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.setCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div class="container">
        <!-- Search -->
        ${
          this.hideSearch
            ? nothing
            : html`<div class="search-row">
                <input
                  class="search-input"
                  type="text"
                  placeholder="Search for a place..."
                  .value=${this.searchQuery}
                  @input=${(e: Event) => {
                    this.searchQuery = (e.target as HTMLInputElement).value;
                  }}
                  @keypress=${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      this.handleSearch();
                    }
                  }}
                />
                <button
                  class="btn btn-primary"
                  type="button"
                  @click=${this.handleSearch}
                  ?disabled=${this.searching}
                >
                  ${this.searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              <!-- Search results -->
              ${
                this.searchResults.length > 0
                  ? html`
                    <div class="search-results">
                      <ul class="results-list">
                        ${this.searchResults.map(
                          (r) => html`
                            <li
                              class="result-item"
                              @click=${() => this.selectSearchResult(r)}
                            >
                              ${r.display_name}
                            </li>
                          `
                        )}
                      </ul>
                    </div>
                  `
                  : nothing
              }`
        }

        <!-- Map -->
        <div class="map-wrapper">
          <div class="map-inner"></div>
        </div>

        <!-- Actions -->
        <div class="actions-row">
          <button
            class="btn btn-secondary"
            type="button"
            @click=${this.handleLocateMe}
          >
            📍 Use my location
          </button>
        </div>

        <!-- Coordinate inputs -->
        <div class="coords-row">
          <div class="coord-field">
            <label class="coord-label">Latitude</label>
            <input
              class="coord-input"
              type="number"
              step="0.00001"
              min="-90"
              max="90"
              placeholder="48.8566"
              .value=${this.coords?.lat != null ? String(this.coords.lat) : ''}
              @change=${(e: Event) => {
                const lat = Number.parseFloat((e.target as HTMLInputElement).value);
                if (!Number.isNaN(lat)) {
                  this.setCoords(lat, this.coords?.lon ?? 0);
                }
              }}
            />
          </div>
          <div class="coord-field">
            <label class="coord-label">Longitude</label>
            <input
              class="coord-input"
              type="number"
              step="0.00001"
              min="-180"
              max="180"
              placeholder="2.3522"
              .value=${this.coords?.lon != null ? String(this.coords.lon) : ''}
              @change=${(e: Event) => {
                const lon = Number.parseFloat((e.target as HTMLInputElement).value);
                if (!Number.isNaN(lon)) {
                  this.setCoords(this.coords?.lat ?? 0, lon);
                }
              }}
            />
          </div>
        </div>

        ${this.value ? html`<div class="geohash-display">Geohash: ${this.value}</div>` : nothing}

        <div class="hint">Click on the map or search to set location</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-geo-input': NpGeoInput;
  }
}
