/**
 * @nostr-post/web - <nostr-post-feed> Web Component
 *
 * Displays a list of Nostr events
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { type FetchFilter, fetchEvents, fetchManifestByATag } from '@nostr-post/signer';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { NostrPostElement, baseStyles } from './base-component';
import {
  handleCommentPublished as handleCommentPublishedDetail,
  isReplyComposerOpen,
  renderReplies,
} from './feedComments';
import { publishReaction, summarizeReactionsWithAuthors } from './feedReactions';
import {
  DEFAULT_COMMENT_MANIFEST,
  DEFAULT_REACTION_OPTIONS,
  type ReplyTarget,
  buildReplyTarget,
  buildThreads,
} from './feedStandard';
import { feedStyle } from './feedStyle';
import type { SignedEvent } from './signer';
import { type NostrProfile, displayNameForPubkey, loadProfilesForEvents } from './userProfile';
import './composer';
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
  static styles = [baseStyles, feedStyle];

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

  /** Optional manifest reference (a-tag) to resolve and use for all rendered views */
  @property({ type: String, attribute: 'manifest-ref' })
  manifestRef?: string;

  @property({ type: Boolean })
  showKind?: boolean;

  @property({ type: Boolean })
  showTags?: boolean;

  @property({ type: Boolean, attribute: 'comments-enabled' })
  commentsEnabled?: boolean;

  @property({ type: Boolean, attribute: 'reactions-enabled' })
  reactionsEnabled?: boolean;

  @property({ type: Object, attribute: false })
  commentManifest?: NostrPostManifest;

  @property({ type: Array, attribute: false })
  reactionOptions?: string[];

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

  @state()
  private interactionEvents: SignedEvent[] = [];

  @state()
  private activeReplyTarget?: ReplyTarget;

  @state()
  private reactionPendingKey?: string;

  @state()
  private statusMessage?: string;

  @state()
  private statusTone: 'info' | 'error' = 'info';

  @state()
  private profileMap: Record<string, NostrProfile> = {};

  /** Tag filters: e.g. { '#i': ['osm:node:123'] } */
  @property({ type: Object })
  tagFilters?: Record<string, string[]>;

  @property({ type: Array, attribute: 'exclude-fields' })
  excludeFields?: string[];

  /** Optional explicit list of REQ filters; if set, this is forwarded as-is. */
  @property({ type: Array })
  filters?: FetchFilter[];

  constructor() {
    super();
    this.kinds = [1];
    this.limit = 20;
    this.showKind = false;
    this.showTags = false;
    this.commentsEnabled = true;
    this.reactionsEnabled = true;
    this.commentManifest = DEFAULT_COMMENT_MANIFEST;
    this.reactionOptions = [...DEFAULT_REACTION_OPTIONS];
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
      changedProperties.has('filters') ||
      changedProperties.has('commentsEnabled') ||
      changedProperties.has('reactionsEnabled')
    ) {
      if (this.shouldLoad()) {
        this.loadEvents();
      }
    }

    if (changedProperties.has('manifestRef')) {
      void this._resolveManifestRef();
    }
  }

  private async _resolveManifestRef() {
    // Do not override explicit manifest
    if (this.manifest) return;
    if (!this.manifestRef) return;

    try {
      const stored = await fetchManifestByATag(this.manifestRef, this.relays);
      if (stored) {
        this.manifest = stored.manifest;
      }
    } catch (err) {
      // ignore
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
      this.isLoading = false;
      this.interactionEvents = [];
      await this.loadInteractions(events);
      this.profileMap = await loadProfilesForEvents(
        [...this.events, ...this.interactionEvents],
        this.profileMap,
        this.relays
      );
    } catch (error) {
      console.error('Failed to load events:', error);
      this.events = [];
      this.interactionEvents = [];
    } finally {
      this.isLoading = false;
    }
  }

  private displayName(pubkey: string): string {
    return displayNameForPubkey(this.profileMap, pubkey);
  }

  private async loadInteractions(events: SignedEvent[]) {
    const rootIds = events.map((event) => event.id);
    if (rootIds.length === 0) return;

    const filters: FetchFilter[] = [];
    const interactionLimit = Math.max(rootIds.length * 10, 50);

    if (this.commentsEnabled) {
      filters.push({ kinds: [1], '#e': rootIds, limit: interactionLimit });
    }

    if (this.reactionsEnabled) {
      filters.push({ kinds: [7], '#e': rootIds, limit: interactionLimit });
    }

    if (filters.length === 0) return;

    try {
      this.interactionEvents = await fetchEvents(filters, this.relays);
    } catch (error) {
      console.warn('Failed to load interaction events:', error);
      this.interactionEvents = [];
    }
  }

  private showStatus(message: string, tone: 'info' | 'error' = 'info') {
    this.statusMessage = message;
    this.statusTone = tone;
  }

  private async publishReaction(event: SignedEvent, reaction: string) {
    const reactionKey = `${event.id}:${reaction}`;
    this.reactionPendingKey = reactionKey;
    this.showStatus(`Publishing ${reaction} reaction...`);

    try {
      const result = await publishReaction({
        event,
        reaction,
        relays: this.relays,
        interactionEvents: this.interactionEvents,
        profileMap: this.profileMap,
      });

      this.interactionEvents = result.interactionEvents;
      this.profileMap = result.profileMap;
      this.dispatchCustomEvent('nostr-post-interaction-published', result.signedEvent);
      this.showStatus(`Published ${reaction} reaction.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish reaction.';
      this.showError(message);
      this.showStatus(message, 'error');
    } finally {
      this.reactionPendingKey = undefined;
    }
  }

  private openReplyComposer(event: SignedEvent, rootEvent?: SignedEvent) {
    this.activeReplyTarget = buildReplyTarget(event, rootEvent);
  }

  private handleCommentPublished(event: Event) {
    void handleCommentPublishedDetail({
      detail: (event as CustomEvent).detail,
      interactionEvents: this.interactionEvents,
      profileMap: this.profileMap,
      relays: this.relays,
    }).then(({ publishedEvents, interactionEvents, profileMap }) => {
      if (publishedEvents.length === 0) return;

      this.interactionEvents = interactionEvents;
      this.profileMap = profileMap;
      this.activeReplyTarget = undefined;
      this.dispatchCustomEvent('nostr-post-interaction-published', publishedEvents);
      this.showStatus(`Published ${publishedEvents.length} comment event(s).`);
    });
  }

  private renderEventActions(event: SignedEvent, rootEvent?: SignedEvent) {
    return html`
      <div class="event-actions">
        ${
          this.commentsEnabled
            ? html`
              <button
                class="action-button"
                type="button"
                @click=${() => this.openReplyComposer(event, rootEvent)}
              >
                Comment
              </button>
            `
            : ''
        }
        ${
          this.reactionsEnabled
            ? this.reactionOptions?.map(
                (reaction) => html`
                <button
                  class="reaction-button"
                  type="button"
                  ?disabled=${this.reactionPendingKey === `${event.id}:${reaction}`}
                  @click=${() => this.publishReaction(event, reaction)}
                >
                  ${reaction}
                </button>
              `
              )
            : ''
        }
      </div>
    `;
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

    const threads = buildThreads(this.events, this.interactionEvents);

    return html`
      <div class="feed">
        ${
          this.statusMessage
            ? html`<div class="status ${this.statusTone}">${this.statusMessage}</div>`
            : ''
        }
        ${threads.map((thread) => {
          const reactionSummaryWithAuthors = summarizeReactionsWithAuthors(
            thread.reactions,
            (pubkey) => this.displayName(pubkey)
          );
          const isReplyComposerVisible = isReplyComposerOpen(
            this.activeReplyTarget,
            thread.root.id
          );

          return html`
            <div class="event-item">
              <nostr-post-view
                .event=${thread.root}
                .manifest=${this.manifest}
                .excludeFields=${this.excludeFields}
                ?showKind=${this.showKind}
                ?showTags=${this.showTags}
              ></nostr-post-view>
              ${
                reactionSummaryWithAuthors.length > 0
                  ? html`
                    <div class="reaction-summary">
                      ${reactionSummaryWithAuthors.map(
                        ({ reaction, count, authors }) => html`
                          <span class="reaction-chip" title=${authors.join(', ')}>
                            ${reaction} ${count}
                            ${
                              authors.length > 0
                                ? html`<span class="reaction-authors"> ${authors.join(', ')}</span>`
                                : ''
                            }
                          </span>
                        `
                      )}
                    </div>
                  `
                  : ''
              }
              ${this.renderEventActions(thread.root, thread.root)}
              ${
                isReplyComposerVisible
                  ? html`
                    <div class="reply-composer">
                      <nostr-post-composer
                        auto-publish
                        .manifest=${this.commentManifest}
                        .excludeFields=${this.excludeFields}
                        .replyToEventId=${this.activeReplyTarget?.replyToEventId}
                        .replyToPubkey=${this.activeReplyTarget?.replyToPubkey}
                        .rootEventId=${this.activeReplyTarget?.rootEventId}
                        .rootPubkey=${this.activeReplyTarget?.rootPubkey}
                        @nostr-post-published=${this.handleCommentPublished}
                      ></nostr-post-composer>
                    </div>
                  `
                  : ''
              }
              ${renderReplies(
                thread.root,
                thread.replies,
                this.commentManifest,
                this.excludeFields,
                (event, rootEvent) => this.renderEventActions(event, rootEvent)
              )}
            </div>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-feed': NostrPostFeed;
  }
}
