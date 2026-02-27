/**
 * @nostr-post/plugin-venue - <np-venue-input>
 *
 * Thin wrapper around <np-geo-input> that adds:
 *   - Nominatim venue search (returns OSM ID + display name)
 *   - Venue info card when a result is selected
 *
 * The geo input handles the map, marker, geolocation, and geohash.
 * This component just adds venue identity on top.
 *
 * Value: VenueData object { geohash, lat, lon, name?, osmId?, osmType? }
 * Dispatches 'np-value-changed' with { detail: { value: VenueData } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  type NominatimResult,
  type VenueData,
  type VenuePluginConfig,
  nominatimToVenue,
  osmUrl,
  searchNominatim,
} from '../core';

// Ensure the geo input web component is registered
import '@nostr-post/plugin-geo/web';

@customElement('np-venue-input')
export class NpVenueInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Venue search */
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
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #f9fafb;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .btn:hover {
      background: #f3f4f6;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Results */
    .results {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
      background: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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

    .result-type {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    /* Venue card */
    .venue-card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.625rem 0.75rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
    }

    .venue-name {
      font-weight: 600;
      font-size: 0.9375rem;
      color: #166534;
    }

    .venue-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #6b7280;
    }

    .venue-meta a {
      color: #6366f1;
      text-decoration: none;
    }

    .venue-meta a:hover {
      text-decoration: underline;
    }

    .clear-btn {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 0.8125rem;
      padding: 0;
      text-decoration: underline;
      align-self: flex-start;
    }

    .loading {
      font-size: 0.8125rem;
      color: #6b7280;
      padding: 0.25rem 0;
    }
  `;

  @property({ type: Object })
  value: VenueData | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  @state() private searchQuery = '';
  @state() private searchResults: NominatimResult[] = [];
  @state() private isSearching = false;
  @state() private showResults = false;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  private get config(): VenuePluginConfig {
    return (this.field?.metadata ?? {}) as VenuePluginConfig;
  }

  private get precision(): number {
    return this.config.precision ?? 6;
  }

  // ── Search ─────────────────────────────────────────────────────

  private onSearchInput(e: Event) {
    this.searchQuery = (e.target as HTMLInputElement).value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    if (this.searchQuery.length < 3) {
      this.searchResults = [];
      this.showResults = false;
      return;
    }

    this.searchTimeout = setTimeout(() => this.doSearch(), 400);
  }

  private async doSearch() {
    if (this.searchQuery.length < 3) return;
    this.isSearching = true;
    this.showResults = true;
    try {
      this.searchResults = await searchNominatim(this.searchQuery);
    } catch (err) {
      console.error('Nominatim search failed:', err);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  private onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      this.doSearch();
    }
    if (e.key === 'Escape') this.showResults = false;
  }

  private selectResult(result: NominatimResult) {
    const venue = nominatimToVenue(result, this.precision);
    this.emitValue(venue);
    this.searchQuery = '';
    this.showResults = false;
    this.searchResults = [];
  }

  // ── Geo input bridge ───────────────────────────────────────────

  /**
   * When user interacts with <np-geo-input> (clicks map / uses geolocation),
   * we get a plain geohash string. Wrap it as VenueData, clearing any existing
   * venue metadata since the user moved the pin manually.
   */
  private onGeoValueChanged(e: CustomEvent<{ value: string }>) {
    // Stop the geo input's event — we emit our own with VenueData
    e.stopPropagation();

    const geohash = e.detail.value;
    if (!geohash) {
      this.value = null;
      this.dispatchEvent(
        new CustomEvent('np-value-changed', {
          detail: { value: null },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    // If geohash didn't change, keep existing venue metadata
    if (this.value && this.value.geohash === geohash) return;

    // Map click → new geohash without venue metadata
    this.emitValue({ geohash, lat: 0, lon: 0 });
  }

  // ── Value management ───────────────────────────────────────────

  private emitValue(venue: VenueData) {
    this.value = venue;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: venue },
        bubbles: true,
        composed: true,
      })
    );
  }

  private clearVenue() {
    if (this.value) {
      // Clear only venue metadata, keep the pin
      this.emitValue({
        geohash: this.value.geohash,
        lat: this.value.lat,
        lon: this.value.lon,
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  render() {
    const hasVenueMeta = this.value?.name || this.value?.osmId;

    return html`
      <div class="container">
        ${this.renderVenueSearch()}
        ${hasVenueMeta ? this.renderVenueCard() : nothing}

        <np-geo-input
          .value=${this.value?.geohash ?? null}
          .field=${this.field}
          .hideSearch=${true}
          @np-value-changed=${this.onGeoValueChanged}
        ></np-geo-input>
      </div>
    `;
  }

  private renderVenueSearch() {
    return html`
      <div class="search-row">
        <input
          class="search-input"
          type="text"
          placeholder="Search for a venue (OSM)…"
          .value=${this.searchQuery}
          @input=${this.onSearchInput}
          @keydown=${this.onSearchKeydown}
          @focus=${() => {
            if (this.searchResults.length > 0) this.showResults = true;
          }}
        />
        <button
          class="btn"
          @click=${() => this.doSearch()}
          ?disabled=${this.isSearching}
        >
          ${this.isSearching ? 'Searching…' : '🔍 Search'}
        </button>
      </div>

      ${this.isSearching ? html`<div class="loading">Searching…</div>` : nothing}
      ${
        this.showResults && this.searchResults.length > 0
          ? html`
            <div class="results">
              ${this.searchResults.map(
                (r) => html`
                  <div class="result-item" @click=${() => this.selectResult(r)}>
                    ${r.display_name}
                    <div class="result-type">
                      ${r.class}/${r.type} · ${r.osm_type}:${r.osm_id}
                    </div>
                  </div>
                `
              )}
            </div>
          `
          : nothing
      }
    `;
  }

  private renderVenueCard() {
    if (!this.value) return nothing;
    const v = this.value;

    return html`
      <div class="venue-card">
        ${v.name ? html`<div class="venue-name">📍 ${v.name}</div>` : nothing}
        <div class="venue-meta">
          ${
            v.osmType && v.osmId
              ? html`<a
                href="${osmUrl(v.osmType, v.osmId)}"
                target="_blank"
                rel="noopener"
              >
                OSM ${v.osmType}:${v.osmId} ↗
              </a>`
              : nothing
          }
        </div>
        <button class="clear-btn" @click=${this.clearVenue}>
          Clear venue info
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-input': NpVenueInput;
  }
}
