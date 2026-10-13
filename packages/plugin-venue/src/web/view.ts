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
import { type EntityManifestRef, getEntityManifest, resolveEntityManifest } from '@nostr-post/wiki';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type VenueData, googleMapsPlaceUrl, osmUrl } from '../core';
import { googleMapsCidUrl } from '../googleLink';
import { loadVenueFromPage, needsPage } from '../venuePage';
import { DEFAULT_VENUE_VIEW_MESSAGES, type VenueViewMessages } from './venueMessages';

// Ensure <np-geo-view> and <nostr-wiki-view> are defined
import '@nostr-post/plugin-geo/web';
import '@nostr-post/wiki/web';

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

    .venue-wiki {
      margin-top: 0.5rem;
      font-size: 0.85rem;
    }

    .venue-wiki summary {
      cursor: pointer;
      color: #166534;
      font-weight: 500;
      margin-bottom: 0.375rem;
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

  /** Overrides for the user-facing text */
  @property({ attribute: false })
  messages?: Partial<VenueViewMessages>;

  @state() private wikiOpen = false;

  private get m(): VenueViewMessages {
    return { ...DEFAULT_VENUE_VIEW_MESSAGES, ...this.messages };
  }

  /** The place of a link-only venue, loaded from its venue page */
  @state() private _fromPage?: VenueData;
  private _loadingFor?: unknown;

  override willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has('value')) return;
    this._fromPage = undefined;
    const value = this.value;
    if (!needsPage(value) || !this.field || value === this._loadingFor) return;
    this._loadingFor = value;
    void loadVenueFromPage(value, this.field).then((loaded) => {
      if (this.value === value && loaded.geohash) this._fromPage = loaded;
    });
  }

  render() {
    if (!this.value) {
      return html`<span>No location</span>`;
    }

    // Plain geohash string → delegate entirely to geo view
    if (typeof this.value === 'string') {
      return html`<np-geo-view .value=${this.value} .field=${this.field}></np-geo-view>`;
    }

    // A link-only venue: its place comes from its page, once loaded
    const v = this._fromPage ?? (this.value as VenueData);

    return html`
      ${v.name ? html`<div class="venue-name">📍 ${v.name}</div>` : nothing}
      ${
        v.osmType && v.osmId
          ? html`<span class="osm-badge">OSM ${v.osmType}:${v.osmId}</span>`
          : nothing
      }

      ${
        // A country has no published area to show
        v.geohash
          ? html`<np-geo-view .value=${v.geohash} .field=${this.field}></np-geo-view>`
          : nothing
      }

      ${this.renderVenueLinks(v)}
      ${this.renderWikiPage(v)}
    `;
  }

  /** The venue's wiki page, loaded only when opened (feeds show many posts) */
  private renderWikiPage(v: VenueData) {
    if (!v.wikiEntity) return nothing;
    const ref = this.field?.metadata?.wikiEntity as EntityManifestRef | undefined;
    const known = getEntityManifest(ref);
    // A published manifest's address: fetch it once; unknown manifests show the article text
    if (!known && ref && this.wikiOpen) {
      void resolveEntityManifest(ref).then((manifest) => manifest && this.requestUpdate());
    }
    return html`
      <details
        class="venue-wiki"
        @toggle=${(e: Event) => {
          this.wikiOpen = (e.target as HTMLDetailsElement).open;
        }}
      >
        <summary>${this.m.wikiPage}</summary>
        ${
          this.wikiOpen
            ? html`<nostr-wiki-view .manifest=${known} .entityId=${v.wikiEntity.dTag}></nostr-wiki-view>`
            : nothing
        }
      </details>
    `;
  }

  private renderVenueLinks(v: VenueData) {
    const osmType = v.osmType;
    const osmId = v.osmId;
    // A Places ID, else the CID of a pasted Google Maps link
    const googleUrl = v.googlePlaceId
      ? googleMapsPlaceUrl(v.googlePlaceId)
      : v.googleCid && googleMapsCidUrl(v.googleCid);
    const hasOsmLink = !!(osmType && osmId);
    if (!hasOsmLink && !googleUrl) return nothing;

    return html`
      <div class="venue-links">
        ${
          hasOsmLink
            ? html`<a
              class="venue-link"
              href="${osmUrl(osmType, osmId)}"
              target="_blank"
              rel="noopener"
              >${this.m.viewOnOsm}</a
            >`
            : nothing
        }
        ${
          googleUrl
            ? html`<a
              class="venue-link"
              href="${googleUrl}"
              target="_blank"
              rel="noopener"
              >${this.m.googleMaps}</a
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
