/**
 * @nostr-post/web - <nostr-post-view> Web Component
 *
 * A universal viewer for displaying Nostr events
 */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { UnsignedNostrEvent } from '@nostr-post/core/types';
import { NostrPostElement, baseStyles } from './base-component';

/**
 * View Web Component for displaying Nostr events
 *
 * @example
 * ```html
 * <nostr-post-view></nostr-post-view>
 * <script>
 *   const view = document.querySelector('nostr-post-view');
 *   view.event = myNostrEvent;
 * </script>
 * ```
 */
@customElement('nostr-post-view')
export class NostrPostView extends NostrPostElement {
  static styles = [
    baseStyles,
    css`
      .view {
        padding: 1rem;
        border: 1px solid var(--nostr-post-border, #e5e7eb);
        border-radius: 0.5rem;
        background: var(--nostr-post-bg, white);
      }

      .view-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--nostr-post-border, #e5e7eb);
      }

      .view-pubkey {
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--nostr-post-text-secondary, #6b7280);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .view-timestamp {
        font-size: 0.875rem;
        color: var(--nostr-post-text-secondary, #6b7280);
        margin-left: auto;
      }

      .view-content {
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.6;
        color: var(--nostr-post-text-primary, #111827);
      }

      .view-tags {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--nostr-post-border, #e5e7eb);
      }

      .tag {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        margin: 0.25rem 0.25rem 0.25rem 0;
        background: var(--nostr-post-tag-bg, #f3f4f6);
        border-radius: 0.25rem;
        font-size: 0.875rem;
        color: var(--nostr-post-text-secondary, #6b7280);
      }

      .tag-name {
        font-weight: 600;
        margin-right: 0.25rem;
      }

      .view-kind {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        background: var(--nostr-post-primary, #8b5cf6);
        color: white;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
      }
    `,
  ];

  @property({ type: Object })
  event?: UnsignedNostrEvent;

  @property({ type: Boolean })
  showTags = true;

  @property({ type: Boolean })
  showKind = true;

  /**
   * Format timestamp to readable date
   */
  private formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Truncate pubkey for display
   */
  private truncatePubkey(pubkey: string): string {
    if (!pubkey) return 'Unknown';
    if (pubkey.length <= 16) return pubkey;
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  }

  render() {
    if (!this.event) {
      return html`<div class="error">No event provided. Please set the event property.</div>`;
    }

    const { kind, created_at, tags, content, pubkey } = this.event;

    return html`
      <div class="view">
        <div class="view-header">
          ${this.showKind ? html`<span class="view-kind">Kind ${kind}</span>` : ''}
          <span class="view-pubkey" title=${pubkey}>${this.truncatePubkey(pubkey)}</span>
          <span class="view-timestamp">${this.formatTimestamp(created_at)}</span>
        </div>

        <div class="view-content">${content || html`<em>No content</em>`}</div>

        ${this.showTags && tags.length > 0
          ? html`
              <div class="view-tags">
                ${tags.map(
                  (tag) => html`
                    <span class="tag">
                      <span class="tag-name">${tag[0]}:</span>
                      ${tag.slice(1).join(', ')}
                    </span>
                  `
                )}
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-view': NostrPostView;
  }
}
