/**
 * <np-venue-entity-create>: the wiki-entity picker's "+ Create" form for venue
 * pages (entity manifests whose fields come from OpenStreetMap). The user picks
 * an OSM place; its wiki page is created from OSM, or found and linked, by the
 * venue hub (syncVenueEntity), as when a review is published.
 * Dispatches `wiki-entity-created` with `{ dTag, pubkey, displayName }`.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { PostField } from '@nostr-post/plugins/types';
import type { CreatedEntity } from '@nostr-post/wiki';
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type NominatimResult, type VenueData, nominatimToVenue, searchNominatim } from '../core';
import { venueInputStyles } from './inputStyles';
import { DEFAULT_VENUE_CREATE_MESSAGES, type VenueCreateMessages } from './venueMessages';
import './wikiPublish';

/** A venue field whose wiki page is the given manifest's type */
const venueField = (manifest: NostrPostManifest): PostField => ({
  id: 'venue',
  type: 'geo',
  uiPlugin: 'venue',
  mapTo: { kind: 30818, target: 'tag', tagName: 'g' },
  metadata: { wikiEntity: manifest },
});

/** The page a linking `a` tag names: `30818:<pubkey>:<d-tag>` */
const createdFrom = (tags: string[][], venue: VenueData): CreatedEntity | undefined => {
  const match = tags.find((t) => t[0] === 'a')?.[1]?.match(/^30818:([^:]+):(.+)$/);
  return match
    ? {
        pubkey: match[1] as string,
        dTag: match[2] as string,
        // The place's own name, not OSM's full address ("U Fleků, Křemencova, …")
        displayName: venue.name?.split(',')[0]?.trim() || undefined,
      }
    : undefined;
};

@customElement('np-venue-entity-create')
export class NpVenueEntityCreate extends LitElement {
  static override styles = venueInputStyles;

  @property({ attribute: false }) manifest?: NostrPostManifest;
  /** What the user typed in the picker */
  @property({ attribute: false }) query = '';
  @property({ attribute: false }) relays?: string[];
  @property({ attribute: false }) messages?: Partial<VenueCreateMessages>;

  @state() private _results?: NominatimResult[];
  @state() private _venue?: VenueData;
  @state() private _busy = false;
  @state() private _error?: string;

  private get _m(): VenueCreateMessages {
    return { ...DEFAULT_VENUE_CREATE_MESSAGES, ...this.messages };
  }

  private async _search(): Promise<void> {
    this._busy = true;
    this._error = undefined;
    try {
      this._results = await searchNominatim(this.query, ['place']);
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._busy = false;
    }
  }

  private async _create(): Promise<void> {
    if (!this._venue || !this.manifest) return;
    this._busy = true;
    this._error = undefined;
    try {
      const { syncVenueEntity } = await import('../wikiSync');
      const created = createdFrom(
        await syncVenueEntity(this._venue, venueField(this.manifest)),
        this._venue
      );
      if (!created) throw new Error(this._m.nothingLinked);
      this.dispatchEvent(
        new CustomEvent<CreatedEntity>('wiki-entity-created', {
          detail: created,
          bubbles: true,
          composed: true,
        })
      );
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    } finally {
      this._busy = false;
    }
  }

  override render() {
    const m = this._m;
    if (this._venue && this.manifest) {
      return html`
        <div class="venue-name">📍 ${this._venue.name}</div>
        <np-venue-wiki-publish
          .value=${this._venue}
          .field=${venueField(this.manifest)}
          @np-value-changed=${(e: CustomEvent) => {
            this._venue = e.detail.value;
          }}
        ></np-venue-wiki-publish>
        ${this._error ? html`<div class="error-message">${this._error}</div>` : nothing}
        <button class="btn" type="button" ?disabled=${this._busy} @click=${() => this._create()}>
          ${this._busy ? m.creating : m.create}
        </button>
      `;
    }
    return html`
      <p>${m.intro}</p>
      <div class="search-row">
        <input
          class="search-input"
          type="text"
          placeholder=${m.searchPlaceholder}
          .value=${this.query}
          @input=${(e: InputEvent) => {
            this.query = (e.target as HTMLInputElement).value;
          }}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._search()}
        />
        <button class="btn" type="button" ?disabled=${this._busy} @click=${() => this._search()}>
          ${this._busy ? m.searching : m.search}
        </button>
      </div>
      ${this._error ? html`<div class="error-message">${this._error}</div>` : nothing}
      ${this._results?.length === 0 ? html`<div class="loading">${m.noResults}</div>` : nothing}
      ${
        this._results?.length
          ? html`<div class="results">
              ${this._results.map(
                (r) => html`
                  <div class="result-item" @click=${() => {
                    this._venue = nominatimToVenue(r);
                  }}>
                    ${r.display_name}
                    <div class="result-type">${r.class}/${r.type} · ${r.osm_type}:${r.osm_id}</div>
                  </div>
                `
              )}
            </div>`
          : nothing
      }
    `;
  }

  override firstUpdated(): void {
    if (this.query.trim().length >= 3) void this._search();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-entity-create': NpVenueEntityCreate;
  }
}
