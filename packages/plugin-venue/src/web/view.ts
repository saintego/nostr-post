/**
 * @nostr-post/plugin-venue - <np-venue-view>
 *
 * Thin wrapper around <np-geo-view>. Adds:
 *   - Venue name
 *   - OSM entity link (by ID)
 *   - Google Maps link (by place ID)
 *
 * When no venue metadata is present (plain geohash string),
 * delegates entirely to <np-geo-view>.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type VenueData, googleMapsPlaceUrl, osmUrl } from '../core';

// Ensure <np-geo-view> is defined
import '@nostr-post/plugin-geo/web';

@customElement('np-venue-view')
export class NpVenueView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .venue-name {
      font-weight: 600;
      font-size: 0.9375rem;
      color: #166534;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.125rem;
    }

    .venue-links {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.125rem;
    }

    .venue-link {
      font-size: 0.8125rem;
      color: #6366f1;
      text-decoration: none;
    }

    .venue-link:hover {
      text-decoration: underline;
    }

    .osm-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #065f46;
      background: #d1fae5;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
    }
  `;

  @property({ type: Object })
  value: VenueData | string | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    if (!this.value) {
      return html`<span>No location</span>`;
    }

    // Plain geohash string → delegate entirely to geo view
    if (typeof this.value === 'string') {
      return html`<np-geo-view .value=${this.value} .field=${this.field}></np-geo-view>`;
    }

    const v = this.value as VenueData;

    return html`
      ${v.name ? html`<div class="venue-name">📍 ${v.name}</div>` : nothing}
      ${
        v.osmType && v.osmId
          ? html`<span class="osm-badge">OSM ${v.osmType}:${v.osmId}</span>`
          : nothing
      }

      <np-geo-view .value=${v.geohash} .field=${this.field}></np-geo-view>

      ${this.renderVenueLinks(v)}
    `;
  }

  private renderVenueLinks(v: VenueData) {
    const osmType = v.osmType;
    const osmId = v.osmId;
    const googlePlaceId = v.googlePlaceId;
    const hasOsmLink = !!(osmType && osmId);
    const hasGooglePlaceLink = !!googlePlaceId;
    if (!hasOsmLink && !hasGooglePlaceLink) return nothing;

    return html`
      <div class="venue-links">
        ${
          hasOsmLink
            ? html`<a
              class="venue-link"
              href="${osmUrl(osmType, osmId)}"
              target="_blank"
              rel="noopener"
              >View on OSM ↗</a
            >`
            : nothing
        }
        ${
          hasGooglePlaceLink
            ? html`<a
              class="venue-link"
              href="${googleMapsPlaceUrl(googlePlaceId)}"
              target="_blank"
              rel="noopener"
              >Google Maps ↗</a
            >`
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-view': NpVenueView;
  }
}
