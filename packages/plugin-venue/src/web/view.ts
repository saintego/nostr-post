/**
 * @nostr-post/plugin-venue - <np-venue-view>
 *
 * Read-only venue display. Shows:
 *   - Venue name / address
 *   - Geohash + decoded coordinates
 *   - OSM link (if osmId present)
 *   - Google Maps link (coordinates or place ID)
 *
 * Accepts .value (VenueData object) resolved via resolveFromTags.
 * When no venue data is available, falls back to geohash-only display
 * by embedding <np-geo-view>.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type VenueData, googleMapsPlaceUrl, googleMapsUrl, osmUrl } from '../core';

// Ensure <np-geo-view> is defined for fallback rendering
import '@nostr-post/plugin-geo/web';

@customElement('np-venue-view')
export class NpVenueView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .venue-view {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.5rem 0;
    }

    .venue-name {
      font-weight: 600;
      font-size: 0.9375rem;
      color: #166534;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .venue-details {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: #6b7280;
    }

    .geohash {
      font-family: monospace;
      font-size: 0.8125rem;
      color: #374151;
      background: #f3f4f6;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .coords {
      font-family: monospace;
      font-size: 0.8125rem;
      color: #6b7280;
    }

    .links {
      display: flex;
      gap: 0.75rem;
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
    // No value at all
    if (!this.value) {
      return html`<span>No location</span>`;
    }

    // If value is a plain string (geohash), fallback to geo view
    if (typeof this.value === 'string') {
      return html`<np-geo-view
        .value=${this.value}
        .field=${this.field}
      ></np-geo-view>`;
    }

    const v = this.value as VenueData;

    return html`
      <div class="venue-view">
        ${v.name ? html`<div class="venue-name">📍 ${v.name}</div>` : nothing}

        <div class="venue-details">
          <span class="geohash">${v.geohash}</span>
          <span class="coords">(${v.lat.toFixed(5)}, ${v.lon.toFixed(5)})</span>
          ${
            v.osmType && v.osmId
              ? html`<span class="osm-badge">OSM ${v.osmType}:${v.osmId}</span>`
              : nothing
          }
        </div>

        <div class="links">
          ${
            v.osmType && v.osmId
              ? html`<a
                class="venue-link"
                href="${osmUrl(v.osmType, v.osmId)}"
                target="_blank"
                rel="noopener"
                >View on OSM ↗</a
              >`
              : html`<a
                class="venue-link"
                href="https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lon}#map=15/${v.lat}/${v.lon}"
                target="_blank"
                rel="noopener"
                >OSM ↗</a
              >`
          }
          ${
            v.googlePlaceId
              ? html`<a
                class="venue-link"
                href="${googleMapsPlaceUrl(v.googlePlaceId)}"
                target="_blank"
                rel="noopener"
                >Google Maps ↗</a
              >`
              : html`<a
                class="venue-link"
                href="${googleMapsUrl(v.lat, v.lon)}"
                target="_blank"
                rel="noopener"
                >Google Maps ↗</a
              >`
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-venue-view': NpVenueView;
  }
}
