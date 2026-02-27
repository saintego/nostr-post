/**
 * @nostr-post/plugin-media - <np-media-view>
 *
 * Read-only media gallery. Renders images inline, videos with controls,
 * and falls back to a link for unrecognized URLs.
 *
 * Accepts .value (string | string[]) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { isImageUrl, isVideoUrl, toArray } from '../core';

@customElement('np-media-view')
export class NpMediaView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .media-view {
      border-radius: 8px;
      overflow: hidden;
      background: #f9fafb;
    }
    img {
      display: block;
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 8px;
    }
    video {
      display: block;
      max-width: 100%;
      max-height: 400px;
      border-radius: 8px;
    }
    .media-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      color: #6366f1;
      text-decoration: none;
      font-size: 0.875rem;
      word-break: break-all;
    }
    .media-link:hover {
      text-decoration: underline;
    }
    .media-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .empty {
      font-size: 0.875rem;
      color: #9ca3af;
    }
  `;

  @property({ type: Array })
  value: string | string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    const urls = toArray(this.value);

    if (urls.length === 0) {
      return html`<span class="empty">No media</span>`;
    }

    return html`
      <div class="gallery">${urls.map((url) => this.renderItem(url))}</div>
    `;
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
          <img src=${url} alt="Media" />
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
