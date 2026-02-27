/**
 * @nostr-post/web - <nostr-post-feed> Web Component
 *
 * Displays a list of Nostr events
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchEvents } from '@nostr-post/signer';
import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { NostrPostElement, baseStyles } from './base-component';
import type { SignedEvent } from './signer';
import './view';

/**
 * Feed Web Component for displaying a list of Nostr events
 *
 * @example
 * ```html
 * <nostr-post-feed
 *   authors='["npub1..."]'
 *   kinds='[1]'
 *   limit="20"
 * ></nostr-post-feed>
 * ```
 */
@customElement('nostr-post-feed')
export class NostrPostFeed extends NostrPostElement {
  static styles = [
    baseStyles,
    css`
      .feed {
        font-family:
          system-ui,
          -apple-system,
          sans-serif;
      }

      .loading,
      .empty {
        text-align: center;
        padding: 2rem;
        color: var(--nl-text-secondary, #6b7280);
      }

      :host-context(.dark) .loading,
      :host-context(.dark) .empty {
        color: #9ca3af;
      }

      .event-item {
        margin-bottom: 0.75rem;
      }
    `,
  ];

  @property({ type: Array })
  authors?: string[];

  @property({ type: Array })
  kinds?: number[];

  @property({ type: Number })
  limit?: number;

  @property({ type: Array })
  relays?: string[];

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ type: Boolean })
  showKind?: boolean;

  @property({ type: Boolean })
  showTags?: boolean;

  @state()
  private events: SignedEvent[] = [];

  @state()
  private isLoading = false;

  constructor() {
    super();
    this.kinds = [1];
    this.limit = 20;
    this.showKind = false;
    this.showTags = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    // Wait for initial render, then check if we should load
    await this.updateComplete;
    if (this.shouldLoad()) {
      this.loadEvents();
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has('authors') ||
      changedProperties.has('kinds') ||
      changedProperties.has('limit') ||
      changedProperties.has('relays')
    ) {
      if (this.shouldLoad()) {
        this.loadEvents();
      }
    }
  }

  private shouldLoad(): boolean {
    // Only load if we have at least one filter set
    return !!(
      (this.authors && this.authors.length > 0) ||
      (this.kinds && this.kinds.length > 0) ||
      this.limit !== undefined
    );
  }

  private async loadEvents() {
    this.isLoading = true;
    try {
      const events = await fetchEvents(
        {
          authors: this.authors,
          kinds: this.kinds,
          limit: this.limit,
        },
        this.relays
      );
      this.events = events;
    } catch (error) {
      console.error('Failed to load events:', error);
      this.events = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Public method to refresh the feed
   * Useful for reloading after publishing new events
   */
  public async refresh(): Promise<void> {
    if (this.shouldLoad()) {
      await this.loadEvents();
    }
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="feed">
          <div class="loading">Loading...</div>
        </div>
      `;
    }

    if (this.events.length === 0) {
      return html`
        <div class="feed">
          <div class="empty">No posts yet</div>
        </div>
      `;
    }

    return html`
      <div class="feed">
        ${this.events.map(
          (event) => html`
            <div class="event-item">
              <nostr-post-view
                .event=${event}
                .manifest=${this.manifest}
                ?showKind=${this.showKind}
                ?showTags=${this.showTags}
              ></nostr-post-view>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-feed': NostrPostFeed;
  }
}
