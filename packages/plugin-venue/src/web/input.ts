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
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  lookupNominatimByOsmId,
  type NominatimResult,
  nominatimToVenue,
  searchNominatim,
  type VenueData,
  type VenuePluginConfig,
} from '../core';

// Ensure the geo input web component is registered
import '@nostr-post/plugin-geo/web';
import { type GoogleMapsLink, parseGoogleMapsUrl } from '../googleLink';
import { type GooglePlace, lookUpShortLink, placeLink } from '../googlePlaces';
import { googleLinkFocus, searchGoogleLink, venueAtPoint } from '../googleSearch';
import { type VenueLevel, venueLevels } from '../levels';
import { loadVenueFromPage, needsPage } from '../venuePage';
import { renderGooglePlaces, renderShortLinkName } from './googleShortParts';
import { renderOsmResults, renderVenueCard } from './inputParts';
import { venueInputStyles } from './inputStyles';
import { DEFAULT_VENUE_INPUT_MESSAGES, type VenueInputMessages } from './venueMessages';

@customElement('np-venue-input')
export class NpVenueInput extends NpElement {
  static override styles = [...npStyles, venueInputStyles];

  @property({ type: Object })
  value: VenueData | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  /** Only the OSM search, no map or coordinates (the venue list adds venues with it) */
  @property({ attribute: false })
  searchOnly = false;

  /** Overrides of the default English text */
  @property({ attribute: false })
  messages?: Partial<VenueInputMessages>;

  private get m(): VenueInputMessages {
    return { ...DEFAULT_VENUE_INPUT_MESSAGES, ...this.messages };
  }

  private get levels(): VenueLevel[] {
    return venueLevels(this.config.levels);
  }

  @state() private searchQuery = '';
  @state() private searchResults: NominatimResult[] = [];
  @state() private isSearching = false;
  @state() private showResults = false;
  @state() private isResolving = false;
  @state() private resolutionError: string | null = null;
  /** A pasted Google Maps link: its CID goes with the picked place */
  @state() private _googleLink?: GoogleMapsLink;
  @state() private _googleNote?: string;
  /** A pasted short link being looked up: waiting for its name, or for a pick among `_googlePlaces` */
  @state() private _shortLink?: GoogleMapsLink;
  @state() private _googlePlaces: GooglePlace[] = [];

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

    // Editing a link-only venue: only its page is known; load the place from it
    if (changedProperties.has('value') && needsPage(this.value) && this.field) {
      const linked = this.value;
      const loaded = await loadVenueFromPage(linked, this.field);
      if (this.value === linked && loaded.geohash) this.emitValue(loaded);
      return;
    }

    if (changedProperties.has('value') && this.value && !this.config.multiple) {
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

    if (!this.searchQuery.trim()) {
      // A cleared search box drops a pasted Google link too
      this._googleLink = undefined;
      this._googleNote = undefined;
      this._shortLink = undefined;
      this._googlePlaces = [];
    }
    if (this.searchQuery.length < 3) {
      this.searchResults = [];
      this.showResults = false;
      return;
    }

    this.searchTimeout = setTimeout(() => this.doSearch(), 400);
  }

  private async doSearch() {
    if (this.searchQuery.length < 3) return;
    const link = parseGoogleMapsUrl(this.searchQuery);
    if (link) return this._searchGoogleLink(link);
    // Searching by name for a pasted Google link's place: the link goes with the picked place
    if (this._googleLink) this._googleNote = this.m.googleLinkKept;
    this.isSearching = true;
    this.showResults = true;
    try {
      this.searchResults = await searchNominatim(this.searchQuery, this.levels);
    } catch (err) {
      console.error('Nominatim search failed:', err);
      this.searchResults = [];
    } finally {
      this.isSearching = false;
    }
  }

  /** A pasted Google Maps link: the same place on OSM, else a note to set it on the map */
  private async _searchGoogleLink(link: GoogleMapsLink) {
    if (link.short) return this._lookUpShortLink(link);
    this._googleLink = link;
    this.showResults = true;
    this.isSearching = true;
    const { results, spot } = await searchGoogleLink(link, this.levels).catch(() => ({
      results: [],
      spot: false,
    }));
    this.searchResults = results;
    this.isSearching = false;
    if (results.length === 0) this._googleNote = this.m.googleNotOnOsm(link.name);
    else this._googleNote = spot ? undefined : this.m.googleNearby(link.name);
  }

  /**
   * A short link: its place on Google (`lookUpShortLink`, with the app's key), then on OSM like a
   * long link. Without its share text it waits for the place's name
   */
  private async _lookUpShortLink(link: GoogleMapsLink) {
    this._googleLink = undefined;
    this._shortLink = link;
    this._googlePlaces = [];
    this.searchResults = [];
    this._googleNote = link.name ? this.m.googleShortSearching : this.m.googleShortName;
    const found = await lookUpShortLink(link);
    if (this._shortLink !== link) return; // another link or search since
    if (found.status === 'needs-name') return;
    if (found.status === 'found' && found.places.length > 1) {
      this._googlePlaces = found.places;
      this._googleNote = this.m.googleShortPick;
      return;
    }
    this._shortLink = undefined;
    if (found.status === 'found' && found.places[0])
      return this._pickGooglePlace(link, found.places[0]);
    this._googleNote =
      found.status === 'no-key'
        ? this.m.googleShortLink
        : this.m.googleShortNotFound(link.name ?? '');
  }

  /** The picked Google place: searched on OSM around its point, its id kept with the venue */
  private _pickGooglePlace(link: GoogleMapsLink, place: GooglePlace) {
    this._shortLink = undefined;
    this._googlePlaces = [];
    void this._searchGoogleLink(placeLink(link, place));
  }

  /**
   * A pasted share text keeps its lines here (a one-line input drops them): the phone apps put
   * the place's name and address on their own lines above a short link
   */
  private _onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') ?? '';
    const link = text.includes('\n') ? parseGoogleMapsUrl(text) : undefined;
    if (!link?.short) return;
    e.preventDefault();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchQuery = text.replace(/\s*\n\s*/g, ' · ').trim();
    void this._searchGoogleLink(link);
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
    // A pasted link's CID, or the CID of a venue set on the map from one (now found on OSM)
    const fromLink = this.value && !this.value.osmId ? this.value.googleCid : undefined;
    const placeId = this._googleLink?.placeId;
    this.emitValue({
      ...venue,
      googleCid: this._googleLink?.cid ?? fromLink,
      ...(placeId ? { googlePlaceId: placeId } : {}),
    });
    this._googleLink = undefined;
    this._googleNote = undefined;
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
    const link = this._googleLink;
    if (link) {
      // A pasted Google place OSM doesn't have: the author's point, OSM's address there
      this._googleLink = undefined;
      this._googleNote = undefined;
      void venueAtPoint(link, geohash, this.precision).then((venue) => this.emitValue(venue));
      return;
    }
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
    // Several venues (`metadata.multiple`): the list adds them through this input's search
    if (this.config.multiple) {
      return html`<np-venue-list .value=${this.value ?? []} .field=${this.field}></np-venue-list>`;
    }
    if (this.searchOnly) {
      // A pasted Google place OSM doesn't have is set on the map, also in a list
      const map = this._googleLink && this._googleNote ? this._renderMap() : nothing;
      return html`<div class="container">${this.renderVenueSearch()} ${map}</div>`;
    }
    const hasVenueMeta = this.value?.name || this.value?.osmId;

    return html`
      <div class="container">
        ${this.renderVenueSearch()}
        
        ${
          this.isResolving
            ? html`<div class="np-message np-info">🔄 Resolving OSM venue data…</div>`
            : nothing
        }
        
        ${
          this.resolutionError
            ? html`<div class="np-message np-error" part="error">❌ ${this.resolutionError}</div>`
            : nothing
        }
        
        ${hasVenueMeta ? this.renderVenueCard() : nothing}

        ${this._renderMap()}
      </div>
    `;
  }

  /** The map: the venue's point, or zoomed to a pasted Google link's point for the author to click */
  private _renderMap() {
    return html`<np-geo-input
      .value=${this.value?.geohash ?? null}
      .focusPoint=${googleLinkFocus(this._googleLink)}
      .field=${this.field}
      .hideSearch=${true}
      @np-value-changed=${this.onGeoValueChanged}
    ></np-geo-input>`;
  }

  private renderVenueSearch() {
    return html`
      <div class="search-row">
        <input
          class="search-input np-input" part="input"
          type="text"
          placeholder=${this.m.searchPlaceholder(this.levels)}
          .value=${this.searchQuery}
          @input=${this.onSearchInput}
          @paste=${(e: ClipboardEvent) => this._onPaste(e)}
          @keydown=${this.onSearchKeydown}
          @focus=${() => {
            if (this.searchResults.length > 0) this.showResults = true;
          }}
        />
        <button
          class="np-button" part="button"
          @click=${() => this.doSearch()}
          ?disabled=${this.isSearching}
        >
          ${this.isSearching ? this.m.searching : this.m.search}
        </button>
      </div>

      ${this.isSearching ? html`<div class="loading">${this.m.searching}</div>` : nothing}
      ${this._googleNote ? html`<div class="loading">${this._googleNote}</div>` : nothing}
      ${this._renderShortLink()}
      ${
        this.showResults && this.searchResults.length > 0
          ? renderOsmResults(this.searchResults, this.levels, this.m, (r) => this.selectResult(r))
          : nothing
      }
    `;
  }

  /** A short link waiting for its place's name, or for a pick among Google's matches */
  private _renderShortLink() {
    const link = this._shortLink;
    if (!link) return nothing;
    if (!link.name) {
      return renderShortLinkName(this.m, (name) => void this._lookUpShortLink({ ...link, name }));
    }
    return renderGooglePlaces(this._googlePlaces, this.m, (place) =>
      this._pickGooglePlace(link, place)
    );
  }

  private renderVenueCard() {
    return this.value ? renderVenueCard(this.value, this.m, () => this.clearVenue()) : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-input': NpVenueInput;
  }
}
