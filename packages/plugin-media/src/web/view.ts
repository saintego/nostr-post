/**
 * @nostr-post/plugin-media - <np-media-view>
 *
 * Read-only media gallery. Renders images inline, videos with controls,
 * and falls back to a link for unrecognized URLs. One photo shows large (e.g. an event's
 * image); a photo opens in <np-lightbox>, with the field's other photos and videos.
 *
 * Accepts .value (string | string[]), .field (PostField) and .author (the post's pubkey). An
 * image from a Blossom server that fails to load is tried on the author's other servers (their
 * kind 10063 list) and the field's `blossomServers`, by its hash.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { isImageUrl, isVideoUrl, type MediaPluginConfig, toArray } from '../core';
import { mediaFileOf } from '../mediaFiles';
import '@nostr-post/ui/web/lightbox';
import type { LightboxSlide, NpLightbox } from '@nostr-post/ui/web/lightbox';
import { otherServersOf } from './otherServers';
import { viewStyles } from './viewStyles';

@customElement('np-media-view')
export class NpMediaView extends NpElement {
  static override styles = [...npStyles, viewStyles];

  @property({ type: Array })
  value: string | string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  /** The post's author: their Blossom servers are tried when an image fails */
  @property({ type: String })
  author?: string;

  /** The URL shown for an image that failed, by its original URL */
  @state() _shown = new Map<string, string>();
  /** Other servers' URLs still to try, by original URL */
  _alternatives = new Map<string, string[]>();
  @query('np-lightbox') _lightbox?: NpLightbox;

  /** The photos and videos, for the lightbox */
  get _slides(): LightboxSlide[] {
    return toArray(this.value).flatMap((url): LightboxSlide[] => {
      if (isVideoUrl(url)) return [{ url, media: 'video' }];
      if (!isImageUrl(url)) return [];
      return [{ url: this._shown.get(url) ?? url, media: 'image', alt: mediaFileOf(url).alt }];
    });
  }

  _openSlide(url: string): void {
    const index = toArray(this.value)
      .filter((u) => isVideoUrl(u) || isImageUrl(u))
      .indexOf(url);
    void this._lightbox?.open(Math.max(index, 0));
  }

  async _tryElsewhere(url: string): Promise<void> {
    if (!this._alternatives.has(url)) {
      const servers = (this.field?.metadata as MediaPluginConfig | undefined)?.blossomServers;
      this._alternatives.set(url, await otherServersOf(url, this.author, servers));
    }
    const next = this._alternatives.get(url)?.shift();
    if (next) this._shown = new Map(this._shown).set(url, next);
  }

  render() {
    const urls = toArray(this.value);

    if (urls.length === 0) {
      return html`<span class="empty">No media</span>`;
    }

    return html`<div class="gallery ${urls.length === 1 ? 'single' : ''}">
        ${urls.map((url) => this.renderItem(url))}
      </div>
      <np-lightbox exportparts="dialog, button" .slides=${this._slides}></np-lightbox>`;
  }

  private renderItem(url: string) {
    if (isVideoUrl(url)) {
      return html`
        <div class="media-view">
          <video src=${url} controls preload="metadata"></video>
        </div>
      `;
    }

    if (isImageUrl(url)) {
      return html`
        <div class="media-view">
          <button type="button" class="open" part="button" @click=${() => this._openSlide(url)}>
            <img
              src=${this._shown.get(url) ?? url}
              alt=${mediaFileOf(url).alt ?? 'Media'}
              @error=${() => void this._tryElsewhere(url)}
            />
          </button>
        </div>
      `;
    }

    return html`
      <a class="media-link" href=${url} target="_blank" rel="noopener">
        <span class="media-icon">🔗</span>
        ${url}
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-view': NpMediaView;
  }
}
