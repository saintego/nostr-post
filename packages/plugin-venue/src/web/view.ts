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

import { eventActionsFor } from '@nostr-post/plugins/entities';
import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { type EntityManifestRef, getEntityManifest, resolveEntityManifest } from '@nostr-post/wiki';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { googleMapsPlaceUrl, osmUrl, pageAddress, type VenueData } from '../core';
import { googleEmbedUrl } from '../googleEmbed';
import { googleMapsCidUrl } from '../googleLink';
import { loadVenueFromPage, needsPage } from '../venuePage';
import { canHaveVenuePage } from '../wikiEntity';
import { findVenuePage } from '../wikiSync';
import { DEFAULT_VENUE_VIEW_MESSAGES, type VenueViewMessages } from './venueMessages';

// Ensure <np-geo-view> and <nostr-wiki-view> are defined
import '@nostr-post/plugin-geo/web';
import '@nostr-post/wiki/web';

@customElement('np-venue-view')
export class NpVenueView extends NpElement {
  static override styles = [
    ...npStyles,
    css`
    :host {
      display: block;
    }

    .venue-name {
      font-weight: 600;
      font-size: var(--np-text-md);
      color: var(--np-color-success);
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.125rem;
    }

    .venue-action {
      margin-left: auto;
      font-weight: 400;
    }

    .venue-wiki {
      margin-top: 0.5rem;
      font-size: var(--np-text-md);
    }

    .venue-wiki summary {
      cursor: pointer;
      color: var(--np-color-success);
      font-weight: 500;
      margin-bottom: 0.375rem;
    }

    .google-card {
      width: 100%;
      height: 18rem;
      border: 0;
      border-radius: var(--np-radius-sm);
    }

    .venue-links {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.125rem;
    }

    .venue-link {
      font-size: var(--np-text-sm);
      color: var(--np-color-primary);
      text-decoration: none;
    }

    .venue-link:hover {
      text-decoration: underline;
    }

    .osm-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: var(--np-text-sm);
      color: var(--np-color-on-success-container);
      background: var(--np-color-success-container);
      padding: 0.125rem 0.5rem;
      border-radius: var(--np-radius-full);
    }

  `,
  ];

  @property({ type: Object })
  value: VenueData | string | null = null;

  @property({ type: Object })
  field: PostField | null = null;

  /** Overrides for the user-facing text */
  @property({ attribute: false })
  messages?: Partial<VenueViewMessages>;

  @state() private wikiOpen = false;
  /**
   * The page of a venue the post doesn't link, looked up by its ids when the row is opened:
   * 'looking', then the page or null (none)
   */
  @state() private _foundPage?: { pubkey: string; dTag: string } | null | 'looking';

  private get m(): VenueViewMessages {
    return { ...DEFAULT_VENUE_VIEW_MESSAGES, ...this.messages };
  }

  /** The place of a link-only venue, loaded from its venue page */
  @state() private _fromPage?: VenueData;
  private _loadingFor?: unknown;

  override willUpdate(changed: Map<string, unknown>): void {
    if (!changed.has('value')) return;
    this._fromPage = undefined;
    this._foundPage = undefined;
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
      ${
        v.name
          ? html`<div class="venue-name">
              📍 ${v.name}
              ${this._renderActions(v)}
            </div>`
          : nothing
      }
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
      ${this._renderGoogleCard(v)}
    `;
  }

  /** Google's place card (Maps Embed API, the app's key); the iframe loads only when opened */
  @state() private _googleOpen = false;

  private _renderGoogleCard(v: VenueData) {
    const url = googleEmbedUrl(v);
    if (!url) return nothing;
    return html`
      <details class="venue-wiki" @toggle=${(e: Event) => {
        this._googleOpen = (e.target as HTMLDetailsElement).open;
      }}>
        <summary>${this.m.googleCard}</summary>
        ${
          this._googleOpen
            ? html`<iframe class="google-card" src=${url} title=${this.m.googleCard} loading="lazy"
                referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`
            : nothing
        }
      </details>
    `;
  }

  /**
   * Plugins' controls for the venue's entity type (`@nostr-post/plugins/entities`), like
   * <nostr-wiki-view> shows them, e.g. Save to lists when the type has `wikiConfig.lists`
   */
  private _renderActions(v: VenueData) {
    if (!v.wikiEntity) return nothing;
    const ref = this.field?.metadata?.wikiEntity as EntityManifestRef | undefined;
    const manifest = getEntityManifest(ref);
    if (!manifest && ref) {
      void resolveEntityManifest(ref).then((found) => found && this.requestUpdate());
    }
    if (!manifest) return nothing;
    return eventActionsFor(manifest).map((action) => {
      const tag = unsafeStatic(action.tagName);
      return staticHtml`<${tag}
        class="venue-action"
        .target=${pageAddress(v)}
        .manifest=${manifest}
      ></${tag}>`;
    });
  }

  /**
   * Whether the venue may have a page: the post links one, or the field's venues get pages
   * (`metadata.wikiEntity`) and this one has ids to find it by
   */
  private _mayHavePage(v: VenueData): boolean {
    if (v.wikiEntity) return true;
    return !!this.field?.metadata?.wikiEntity && canHaveVenuePage(v);
  }

  /** Opened: the linked page, else the venue's page looked up by its ids (once) */
  private _onWikiToggle(open: boolean, v: VenueData): void {
    this.wikiOpen = open;
    if (!open || v.wikiEntity || this._foundPage !== undefined) return;
    this._foundPage = 'looking';
    void findVenuePage(v).then((page) => {
      if (this.value === v || this._fromPage === v) this._foundPage = page ?? null;
    });
  }

  /** The venue's wiki page, loaded only when opened (feeds show many posts) */
  private renderWikiPage(v: VenueData) {
    if (!this._mayHavePage(v)) return nothing;
    const ref = this.field?.metadata?.wikiEntity as EntityManifestRef | undefined;
    const known = getEntityManifest(ref);
    // A published manifest's address: fetch it once; unknown manifests show the article text
    if (!known && ref && this.wikiOpen) {
      void resolveEntityManifest(ref).then((manifest) => manifest && this.requestUpdate());
    }
    const found = this._foundPage;
    const page = v.wikiEntity ?? (found && found !== 'looking' ? found : undefined);
    const body = page
      ? html`<nostr-wiki-view .manifest=${known} .entityId=${page.dTag}></nostr-wiki-view>`
      : html`<p class="np-hint">${found === 'looking' ? this.m.wikiPageLooking : this.m.wikiPageNone}</p>`;
    return html`
      <details
        class="venue-wiki"
        @toggle=${(e: Event) => this._onWikiToggle((e.target as HTMLDetailsElement).open, v)}
      >
        <summary>${this.m.wikiPage}</summary>
        ${this.wikiOpen ? body : nothing}
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
