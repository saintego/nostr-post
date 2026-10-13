/**
 * <np-venue-list>: a venue field with `metadata.multiple` (e.g. a brewery's
 * taprooms). Lists the picked venues, each removable, and adds more through
 * the single-venue input's OSM search. Emits the list as `np-value-changed`.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import type { VenueData } from '../core';
import { venueInputStyles } from './inputStyles';

/** A venue's identity, so the same place isn't listed twice */
const venueKey = (v: VenueData): string =>
  v.osmId ? `${v.osmType}:${v.osmId}` : (v.wikiEntity?.dTag ?? v.geohash);

/** The place's own name, not OSM's full address */
const shortName = (v: VenueData): string =>
  v.name?.split(',')[0]?.trim() || v.wikiEntity?.dTag || v.geohash;

@customElement('np-venue-list')
export class NpVenueList extends LitElement {
  static override styles = [
    venueInputStyles,
    css`
      /* One venue per row: its name, and × to remove it at the end */
      .venue-entry {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.375rem;
      }
      .venue-entry .clear-btn {
        align-self: center;
        font-size: 1.125rem;
        line-height: 1;
        text-decoration: none;
      }
    `,
  ];

  @property({ attribute: false }) value: VenueData[] = [];
  @property({ attribute: false }) field: PostField | null = null;

  private _emit(value: VenueData[]): void {
    this.value = value;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  /** A place picked in the search: add it (map clicks without a place are ignored) */
  private _onPicked(e: CustomEvent): void {
    e.stopPropagation();
    const venue = e.detail.value as VenueData | null;
    if (!venue?.osmId) return;
    const others = this.value.filter((v) => venueKey(v) !== venueKey(venue));
    this._emit([...others, venue]);
  }

  override render() {
    // The search input edits one venue at a time
    const single = this.field && {
      ...this.field,
      metadata: { ...this.field.metadata, multiple: false },
    };
    return html`
      ${this.value.map(
        (venue, index) => html`
          <div class="venue-card venue-entry">
            <span class="venue-name">📍 ${shortName(venue)}</span>
            <button
              type="button"
              class="clear-btn"
              aria-label="Remove"
              @click=${() => this._emit(this.value.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        `
      )}
      <np-venue-input
        .value=${live(null)}
        .field=${single}
        @np-value-changed=${(e: CustomEvent) => this._onPicked(e)}
      ></np-venue-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-list': NpVenueList;
  }
}
