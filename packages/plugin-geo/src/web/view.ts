/**
 * @nostr-post/plugin-geo - <np-geo-view>
 *
 * Read-only location display with map link.
 * Accepts .value ({ lat, lon } | null) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { GeoCoordinates } from '../core';

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
    }

    .pin {
      font-size: 1.125rem;
    }

    .coords {
      font-family: monospace;
      font-size: 0.875rem;
      color: #374151;
    }

    .map-link {
      font-size: 0.8125rem;
      color: #6366f1;
      text-decoration: none;
      margin-left: 0.5rem;
    }

    .map-link:hover {
      text-decoration: underline;
    }
  `;

  @property({ type: Object })
  value: GeoCoordinates | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    if (!this.value || typeof this.value !== 'object') {
      return html`<span>No location</span>`;
    }

    const { lat, lon } = this.value;

    return html`
      <div class="geo-view">
        <span class="pin">📍</span>
        <span class="coords">${lat.toFixed(5)}, ${lon.toFixed(5)}</span>
        <a
          class="map-link"
          href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}"
          target="_blank"
          rel="noopener"
          >View on map ↗</a
        >
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-geo-view': NpGeoView;
  }
}
