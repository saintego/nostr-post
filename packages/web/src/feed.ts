/**
 * @nostr-post/web - <nostr-post-feed> Web Component
 *
 * Displays a list of Nostr events
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { type FetchFilter, fetchEvents, fetchManifestByATag } from '@nostr-post/signer';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles, NostrPostElement } from './baseComponent';
import { renderEventActions } from './feedActions';
import { handleCommentPublished as handleCommentPublishedDetail } from './feedComments';
import {
  buildFeedFilters,
  buildInteractionLoadKey,
  FEED_LOAD_PROPERTIES,
  interactionFilters,
  mergeUniqueEventsById,
} from './feedData';
import { DEFAULT_FEED_MESSAGES, type FeedMessages } from './feedMessages';
import { publishReaction } from './feedReactions';
import { fetchFeedEvents } from './feedRelays';
import {
  buildReplyTarget,
  buildThreads,
  DEFAULT_COMMENT_MANIFEST,
  DEFAULT_REACTION_OPTIONS,
  type ReplyTarget,
} from './feedStandard';
import { feedStyle } from './feedStyle';
import { type FeedLayout, type FeedThreadContext, renderFeedThread } from './feedThread';
import type { SignedEvent } from './signer';
import { displayNameForPubkey, loadProfilesForEvents, type NostrProfile } from './userProfile';
import './composer';
import './view';

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

  /** Relay URLs to read from. Default: the authors' NIP-65 relays (up to 10 authors) plus defaults */
  @property({ type: Array })
  relays?: string[];

  @property({ type: Object })
  manifest?: NostrPostManifest;

  @property({ type: String, attribute: 'manifest-ref' })
  manifestRef?: string;

  @property({ type: Boolean, attribute: 'show-kind' })
  showKind?: boolean;

  /** Show each post's collapsed "All data" section */
  @property({ type: Boolean, attribute: 'show-tags' })
  showTags?: boolean;

  @property({ type: Boolean, attribute: 'comments-enabled' })
  commentsEnabled?: boolean;

  @property({ type: Boolean, attribute: 'reactions-enabled' })
  reactionsEnabled?: boolean;

  @property({ type: Object, attribute: false })
  commentManifest?: NostrPostManifest;

  @property({ type: Array, attribute: false })
  reactionOptions?: string[];

  @property({ type: String, attribute: 'filter-tags' })
  filterTags?: string;

  @state()
  private events: SignedEvent[] = [];

  /** Authors' NIP-65 relays plus defaults, used for reading when `relays` isn't set */
  private authorRelays?: string[];

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

  private interactionLoadKey = '';

  /** Counts loads, so a slower earlier load doesn't overwrite a later one */
  private _loadCount = 0;

  @property({ type: Object })
  tagFilters?: Record<string, string[]>;

  @property({ type: Array, attribute: 'exclude-fields' })
  excludeFields?: string[];

  /** When true, shows an Edit button on addressable events (30000-39999). */
  @property({ type: Boolean })
  editable?: boolean;

  @property({ type: Array })
  filters?: FetchFilter[];

  /**
   * How the posts are laid out, instead of one under another: e.g. @nostr-post/calendar's agenda
   * puts them under day headings. Gets the threads and what renders one (`renderFeedThread`)
   */
  @property({ attribute: false })
  layout?: FeedLayout;

  /**
   * Whose update comments apply to every post besides its author and the editors it names, e.g.
   * the maintainer of a calendar shown
   */
  @property({ type: Array, attribute: false })
  trustedEditors?: string[];

  @property({ type: Object, attribute: false })
  messages?: Partial<FeedMessages>;

  private get _m(): FeedMessages {
    return { ...DEFAULT_FEED_MESSAGES, ...this.messages };
  }

  constructor() {
    super();
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
    if (FEED_LOAD_PROPERTIES.some((name) => changedProperties.has(name)) && this.shouldLoad()) {
      this.loadEvents();
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
    } catch {
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

  /** Relays to read from: explicit `relays`, else the authors' relays (see loadEvents) */
  private get readRelays(): string[] | undefined {
    return this.relays ?? this.authorRelays;
  }

  private scheduleInteractionsAndProfiles(events: SignedEvent[]) {
    const nextKey = buildInteractionLoadKey(events);
    if (!nextKey || nextKey === this.interactionLoadKey) return;

    this.interactionLoadKey = nextKey;
    void this.loadInteractionsAndProfiles(events);
  }

  /** Shows a load's events; the previous events (and their comments) stay until then */
  private _showEvents(load: number, events: SignedEvent[]): boolean {
    if (load !== this._loadCount) return false;
    if (this.isLoading) {
      this.interactionEvents = [];
      this.interactionLoadKey = '';
    }
    this.events = events;
    this.isLoading = false;
    this.scheduleInteractionsAndProfiles(events);
    return true;
  }

  private async loadEvents() {
    const load = ++this._loadCount;
    this.isLoading = true;

    try {
      const filters = buildFeedFilters({
        filters: this.filters,
        ids: this.ids,
        authors: this.authors,
        kinds: this.kinds,
        manifest: this.manifest,
        search: this.search,
        limit: this.limit,
        since: this.since,
        until: this.until,
        filterTags: this.filterTags,
        tagFilters: this.tagFilters,
      });
      const onUpdate = (arr: SignedEvent[]) => this._showEvents(load, arr);
      const { events, readRelays } = await fetchFeedEvents(filters, {
        relays: this.relays,
        authors: this.authors,
        onUpdate,
      });

      // Final deduped list, in case it differs from the progressive updates
      if (load === this._loadCount) this.authorRelays = readRelays;
      this._showEvents(load, events);
    } catch (error) {
      console.error('Failed to load events:', error);
      this._showEvents(load, []);
    }
  }

  private displayName(pubkey: string): string {
    return displayNameForPubkey(this.profileMap, pubkey);
  }

  private async loadInteractions(events: SignedEvent[]) {
    const filters = interactionFilters(events, {
      comments: this.commentsEnabled,
      reactions: this.reactionsEnabled,
    });
    if (filters.length === 0) return;

    try {
      const fetched = await fetchEvents(filters, this.readRelays, { waitForAll: true });

      this.interactionEvents = mergeUniqueEventsById(this.interactionEvents, fetched);
    } catch (error) {
      console.warn('Failed to load interaction events:', error);
    }
  }

  private async loadInteractionsAndProfiles(events: SignedEvent[]) {
    try {
      await this.loadInteractions(events);

      const loadedProfiles = await loadProfilesForEvents(
        [...this.events, ...this.interactionEvents],
        this.profileMap,
        this.readRelays
      );

      // Merge progressively loaded profiles by pubkey.
      this.profileMap = { ...this.profileMap, ...loadedProfiles };
    } catch (err) {
      console.warn('Failed to load interactions/profiles:', err);
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
    return renderEventActions({
      commentsEnabled: this.commentsEnabled,
      reactionsEnabled: this.reactionsEnabled,
      reactionOptions: this.reactionOptions,
      pendingKey: this.reactionPendingKey,
      eventId: event.id,
      onComment: () => this.openReplyComposer(event, rootEvent),
      onReact: (reaction) => this.publishReaction(event, reaction),
    });
  }

  public async refresh(): Promise<void> {
    if (this.shouldLoad()) {
      await this.loadEvents();
    }
  }

  private get _threadContext(): FeedThreadContext {
    return {
      manifest: this.manifest,
      commentManifest: this.commentManifest,
      excludeFields: this.excludeFields,
      editable: this.editable,
      showKind: this.showKind,
      showTags: this.showTags,
      activeReplyTarget: this.activeReplyTarget,
      trustedEditors: this.trustedEditors,
      displayName: (pubkey) => this.displayName(pubkey),
      renderEventActions: (event, rootEvent) => this.renderEventActions(event, rootEvent),
      onCommentPublished: (event) => this.handleCommentPublished(event),
    };
  }

  render() {
    const m = this._m;
    // A layout shows its own loading state, keeping the previous posts meanwhile
    if (this.isLoading && !this.layout) {
      return html`<div class="feed"><div class="loading">${m.loading}</div></div>`;
    }

    const threads = buildThreads(this.events, this.interactionEvents);
    const ctx = this._threadContext;
    const body = this.layout
      ? this.layout(threads, ctx, { loading: this.isLoading })
      : threads.length === 0
        ? html`<div class="empty">${m.empty}</div>`
        : threads.map((thread) => renderFeedThread(thread, ctx));

    return html`
      <div class="feed">
        ${
          this.statusMessage
            ? html`<div class="status ${this.statusTone}">${this.statusMessage}</div>`
            : ''
        }
        ${body}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-feed': NostrPostFeed;
  }
}
