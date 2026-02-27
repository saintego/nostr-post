/**
 * @nostr-post/plugin-geo - <np-geo-view>
 *
 * Read-only location display with map links (OSM + Google Maps).
 * Accepts .value (geohash string) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { decodeGeohash } from '../core';

@customElement('np-geo-view')
export class NpGeoView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .geo-view {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      flex-wrap: wrap;
    }

    .pin {
      font-size: 1.125rem;
    }

    .geohash {
      font-family: monospace;
      font-size: 0.875rem;
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
      margin-left: 0.25rem;
    }

    .map-link {
      font-size: 0.8125rem;
      color: #6366f1;
      text-decoration: none;
    }

    .map-link:hover {
      text-decoration: underline;
    }
  `;

  @property({ type: String })
  value: string | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    if (!this.value || typeof this.value !== 'string') {
      return html`<span>No location</span>`;
    }

    const { lat, lon } = decodeGeohash(this.value);

    return html`
      <div class="geo-view">
        <span class="pin">📍</span>
        <span class="geohash">${this.value}</span>
        <span class="coords">(${lat.toFixed(5)}, ${lon.toFixed(5)})</span>
        <span class="links">
          <a
            class="map-link"
            href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}"
            target="_blank"
            rel="noopener"
            >OSM ↗</a
          >
          <a
            class="map-link"
            href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}"
            target="_blank"
            rel="noopener"
            >Google Maps ↗</a
          >
        </span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-geo-view': NpGeoView;
  }
}
