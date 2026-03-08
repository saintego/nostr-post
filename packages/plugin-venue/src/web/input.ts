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
  lookupNominatimByOsmId,
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

    .error-message {
      padding: 0.625rem 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      color: #991b1b;
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .resolving {
      padding: 0.625rem 0.75rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      color: #1e40af;
      font-size: 0.8125rem;
      line-height: 1.4;
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
  @state() private isResolving = false;
  @state() private resolutionError: string | null = null;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private resolvedOsmId: string | null = null; // Track resolved OSM IDs to avoid re-resolving

  private get config(): VenuePluginConfig {
    return (this.field?.metadata ?? {}) as VenuePluginConfig;
  }

  private get precision(): number {
    return this.config.precision ?? 6;
  }

  // ── OSM Resolution ─────────────────────────────────────────────

  /**
   * Resolve venue data from OSM ID if geohash is missing.
   * Called automatically when value is set with osmType + osmId but no geohash.
   */
  private async resolveVenueFromOsm(
    osmType: 'node' | 'way' | 'relation',
    osmId: string
  ): Promise<VenueData | null> {
    this.isResolving = true;
    this.resolutionError = null;

    try {
      const result = await lookupNominatimByOsmId(osmType, osmId);
      if (!result) {
        throw new Error(`OSM ${osmType}:${osmId} not found`);
      }
      return nominatimToVenue(result, this.precision);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.resolutionError = `Failed to resolve OSM data: ${message}`;
      console.error('OSM resolution failed:', err);
      return null;
    } finally {
      this.isResolving = false;
    }
  }

  /**
   * Lifecycle: detect when value is set with OSM data but missing geohash.
   * Automatically resolve from OSM API.
   */
  override async updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('value') && this.value) {
      const { osmType, osmId, geohash } = this.value;
      const currentOsmId = osmId ? `${osmType}:${osmId}` : null;

      // If OSM ID is present but geohash is missing → auto-resolve (only once per ID)
      if (osmType && osmId && !geohash && currentOsmId !== this.resolvedOsmId) {
        this.resolvedOsmId = currentOsmId;
        const resolved = await this.resolveVenueFromOsm(osmType, osmId);
        if (resolved) {
          // Merge resolved data with any existing properties
          const mergedValue = { ...this.value, ...resolved };
          // Update internal state
          this.value = mergedValue;
          // Emit the resolved value so parent components get the complete data
          this.dispatchEvent(
            new CustomEvent('np-value-changed', {
              detail: { value: mergedValue },
              bubbles: true,
              composed: true,
            })
          );
          this.requestUpdate(); // Force re-render with complete data
        }
      }
    }
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
    this.resolvedOsmId = null; // Reset resolution tracking since we have complete data
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
      this.resolvedOsmId = null;
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
    this.resolvedOsmId = null;
    this.emitValue({ geohash, lat: 0, lon: 0 });
  }

  // ── Value management ───────────────────────────────────────────

  /**
   * Public validation method.
   * Returns true if value is complete, false if resolution is needed/pending.
   * Throws error if resolution failed.
   */
  public async ensureComplete(): Promise<boolean> {
    if (!this.value) return true;
    if (this.resolutionError) {
      throw new Error(this.resolutionError);
    }
    if (this.isResolving) {
      throw new Error('Venue resolution in progress, please wait');
    }

    const { osmType, osmId, geohash } = this.value;
    if (osmType && osmId && !geohash) {
      // Try to resolve one more time before submit
      const resolved = await this.resolveVenueFromOsm(osmType, osmId);
      if (!resolved) {
        throw new Error(this.resolutionError || `Cannot resolve OSM ${osmType}:${osmId}`);
      }
      this.value = { ...this.value, ...resolved };
      return true;
    }

    return true;
  }

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
    this.resolvedOsmId = null; // Reset resolution tracking
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
        
        ${
          this.isResolving
            ? html`<div class="resolving">🔄 Resolving OSM venue data…</div>`
            : nothing
        }
        
        ${
          this.resolutionError
            ? html`<div class="error-message">❌ ${this.resolutionError}</div>`
            : nothing
        }
        
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
