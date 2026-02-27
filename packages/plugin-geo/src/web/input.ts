/**
 * @nostr-post/plugin-geo - <np-geo-input>
 *
 * Interactive map-based location picker using Leaflet (OpenStreetMap).
 * Features:
 *   - Click on map to place/move marker
 *   - Search box with Nominatim geocoding
 *   - Lat/lon inputs that sync with the map
 *   - "Use my location" button (Geolocation API)
 *
 * Accepts .value ({ lat, lon } | null) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: { lat, lon } } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import L from 'leaflet';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { GeoCoordinates, GeoPluginConfig } from '../core';

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
  static styles = css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Search row */
    .search-row {
      display: flex;
      gap: 0.5rem;
    }

    .search-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .btn {
      padding: 0.5rem 0.75rem;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .btn-primary {
      background: #6366f1;
      color: white;
    }

    .btn-primary:hover {
      background: #4f46e5;
    }

    .btn-primary:disabled {
      background: #a5b4fc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    /* Search results dropdown */
    .search-results {
      position: relative;
    }

    .results-list {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      max-height: 200px;
      overflow-y: auto;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .result-item {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font-size: 0.8125rem;
      border-bottom: 1px solid #f3f4f6;
      line-height: 1.4;
    }

    .result-item:last-child {
      border-bottom: none;
    }

    .result-item:hover {
      background: #f0f0ff;
    }

    /* Map */
    .map-wrapper {
      border-radius: 8px;
      border: 1px solid #d1d5db;
      overflow: hidden;
      height: 300px;
      position: relative;
    }

    .map-wrapper .map-inner {
      height: 100%;
      width: 100%;
    }

    /* Actions row */
    .actions-row {
      display: flex;
      gap: 0.5rem;
    }

    /* Coordinate inputs */
    .coords-row {
      display: flex;
      gap: 1rem;
    }

    .coord-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .coord-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .coord-input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      font-family: monospace;
      outline: none;
      transition: border-color 0.15s;
      width: 100%;
      box-sizing: border-box;
    }

    .coord-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .hint {
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
    }
  `;

  @property({ type: Object })
  value: GeoCoordinates | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  @state() private searchQuery = '';
  @state() private searching = false;
  @state() private searchResults: NominatimResult[] = [];

  private map?: L.Map;
  private marker?: L.Marker;
  private _mapInitialized = false;

  private get config(): GeoPluginConfig {
    return (this.field?.metadata as GeoPluginConfig) || {};
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
    // If value changed externally, update marker
    if (changed.has('value') && this.map && this.value) {
      this.updateMarker(this.value.lat, this.value.lon, false);
    }
  }

  private initMap() {
    const mapEl = this.shadowRoot?.querySelector('.map-inner') as HTMLElement | null;
    if (!mapEl) return;

    this._mapInitialized = true;

    const defaultLat = this.value?.lat ?? 48.8566;
    const defaultLon = this.value?.lon ?? 2.3522;
    const zoom = this.config.defaultZoom ?? (this.value ? 13 : 3);

    this.map = L.map(mapEl, {
      attributionControl: true,
      zoomControl: true,
    }).setView([defaultLat, defaultLon], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Place initial marker if value exists
    if (this.value) {
      this.marker = L.marker([this.value.lat, this.value.lon]).addTo(this.map);
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
    const rounded: GeoCoordinates = {
      lat: Math.round(lat * 100000) / 100000,
      lon: Math.round(lon * 100000) / 100000,
    };

    this.updateMarker(rounded.lat, rounded.lon);

    this.value = rounded;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: rounded },
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
        <div class="search-row">
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
              .value=${this.value?.lat != null ? String(this.value.lat) : ''}
              @change=${(e: Event) => {
                const lat = Number.parseFloat((e.target as HTMLInputElement).value);
                if (!Number.isNaN(lat)) {
                  this.setCoords(lat, this.value?.lon ?? 0);
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
              .value=${this.value?.lon != null ? String(this.value.lon) : ''}
              @change=${(e: Event) => {
                const lon = Number.parseFloat((e.target as HTMLInputElement).value);
                if (!Number.isNaN(lon)) {
                  this.setCoords(this.value?.lat ?? 0, lon);
                }
              }}
            />
          </div>
        </div>

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
