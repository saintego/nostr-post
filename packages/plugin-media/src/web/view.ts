/**
 * @nostr-post/plugin-media - <np-media-view>
 *
 * Read-only media display. Renders images inline, videos with controls,
 * and falls back to a link for unrecognized URLs.
 *
 * Accepts .value (URL string) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('np-media-view')
export class NpMediaView extends LitElement {
  static styles = css`
    :host {
      display: block;
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

  @property({ type: String })
  value = '';

  @property({ type: Object })
  field: PostField | null = null;

  @state() private loadFailed = false;

  private get isImage(): boolean {
    if (!this.value) return false;
    return (
      /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(this.value) ||
      this.value.includes('nostr.build')
    );
  }

  private get isVideo(): boolean {
    if (!this.value) return false;
    return /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(this.value);
  }

  render() {
    if (!this.value) {
      return html`<span class="empty">No media</span>`;
    }

    if (this.isVideo) {
      return html`
        <div class="media-view">
          <video src=${this.value} controls preload="metadata"></video>
        </div>
      `;
    }

    if (this.isImage && !this.loadFailed) {
      return html`
        <div class="media-view">
          <img
            src=${this.value}
            alt="Media"
            @error=${() => {
              this.loadFailed = true;
            }}
          />
        </div>
      `;
    }

    // Fallback: show as link
    return html`
      <a class="media-link" href=${this.value} target="_blank" rel="noopener">
        <span class="media-icon">🔗</span>
        ${this.value}
      </a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-view': NpMediaView;
  }
}
