/**
 * @nostr-post/web - <nostr-post-feed> Web Component
 *
 * Displays a list of Nostr events
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { type FetchFilter, fetchEvents } from '@nostr-post/signer';
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

  @property({ type: Array })
  ids?: string[];

  @property({ type: Number })
  since?: number;

  @property({ type: Number })
  until?: number;

  @property({ type: String })
  search?: string;

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

  /**
   * Comma-separated tag filters, e.g. "#i:osm:node:123,#g:u09tvw"
   * Useful for plain HTML attribute usage.
   */
  @property({ type: String, attribute: 'filter-tags' })
  filterTags?: string;

  @state()
  private events: SignedEvent[] = [];

  @state()
  private isLoading = false;

  /** Tag filters: e.g. { '#i': ['osm:node:123'] } */
  @property({ type: Object })
  tagFilters?: Record<string, string[]>;

  /** Optional explicit list of REQ filters; if set, this is forwarded as-is. */
  @property({ type: Array })
  filters?: FetchFilter[];

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
      changedProperties.has('ids') ||
      changedProperties.has('limit') ||
      changedProperties.has('since') ||
      changedProperties.has('until') ||
      changedProperties.has('search') ||
      changedProperties.has('relays') ||
      changedProperties.has('filterTags') ||
      changedProperties.has('tagFilters') ||
      changedProperties.has('filters')
    ) {
      if (this.shouldLoad()) {
        this.loadEvents();
      }
    }
  }

  private shouldLoad(): boolean {
    // Only load if we have at least one meaningful filter set
    return !!(
      (this.authors && this.authors.length > 0) ||
      (this.kinds && this.kinds.length > 0) ||
      (this.ids && this.ids.length > 0) ||
      this.since !== undefined ||
      this.until !== undefined ||
      (this.search && this.search.trim().length > 0) ||
      (this.filterTags && this.filterTags.trim().length > 0) ||
      (this.tagFilters && Object.keys(this.tagFilters).length > 0) ||
      (this.filters && this.filters.length > 0)
    );
  }

  private parseFilterTags(input?: string): Record<string, string[]> {
    if (!input) return {};

    const parsed: Record<string, string[]> = {};
    const entries = input
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const entry of entries) {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex <= 0) continue;

      const rawTag = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!rawTag || !value) continue;

      const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;
      if (!parsed[tag]) parsed[tag] = [];
      parsed[tag].push(value);
    }

    return parsed;
  }

  private buildFetchFilter(): FetchFilter {
    const filter: FetchFilter = {
      ids: this.ids,
      authors: this.authors,
      kinds: this.kinds,
      search: this.search,
      limit: this.limit,
      since: this.since,
      until: this.until,
    };

    const fromAttribute = this.parseFilterTags(this.filterTags);
    const mergedTagFilters: Record<string, string[]> = {
      ...fromAttribute,
      ...(this.tagFilters ?? {}),
    };

    for (const [tag, values] of Object.entries(mergedTagFilters)) {
      if (!tag.startsWith('#') || values.length === 0) continue;
      filter[tag as `#${string}`] = values;
    }

    return filter;
  }

  private buildFetchFilters(): FetchFilter | FetchFilter[] {
    if (this.filters && this.filters.length > 0) {
      return this.filters;
    }
    return this.buildFetchFilter();
  }

  private async loadEvents() {
    this.isLoading = true;
    try {
      const events = await fetchEvents(this.buildFetchFilters(), this.relays);
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
