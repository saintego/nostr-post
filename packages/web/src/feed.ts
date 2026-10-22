/**
 * @nostr-post/web - <nostr-post-feed> Web Component
 *
 * Displays a list of Nostr events
 */

import { getManifestAvailableKinds } from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { ALL_DAY_EVENT_KIND, agendaDayTags, TIMED_EVENT_KIND } from '@nostr-post/plugin-date';
import { type FetchFilter, fetchEvents, fetchManifestByATag } from '@nostr-post/signer';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles, NostrPostElement } from './baseComponent';
import { renderEventActions } from './feedActions';
import { renderFeedAgenda } from './feedAgenda';
import { handleCommentPublished as handleCommentPublishedDetail } from './feedComments';
import { buildFetchFilters, buildInteractionLoadKey, mergeUniqueEventsById } from './feedData';
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
import { type FeedThreadContext, renderFeedThread } from './feedThread';
import type { SignedEvent } from './signer';
import { displayNameForPubkey, loadProfilesForEvents, type NostrProfile } from './userProfile';
import './composer';
import './view';

/** Events asked for by default; an agenda gets more, so a whole window fits */
const DEFAULT_LIMIT = 20;
const AGENDA_LIMIT = 500;

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

  @property({ type: Object })
  tagFilters?: Record<string, string[]>;

  @property({ type: Array, attribute: 'exclude-fields' })
  excludeFields?: string[];

  /** When true, shows an Edit button on addressable events (30000-39999). */
  @property({ type: Boolean })
  editable?: boolean;

  @property({ type: Array })
  filters?: FetchFilter[];

  /** Agenda: NIP-52 calendar events of a date window, by day (`#D` filter, sorted by start) */
  @property({ type: Boolean })
  agenda?: boolean;

  /** Agenda's first day, `YYYY-MM-DD`. Default: today */
  @property({ type: String, attribute: 'agenda-from' })
  agendaFrom?: string;

  /** Agenda's number of days (default 30, at most 366) */
  @property({ type: Number, attribute: 'agenda-days' })
  agendaDays?: number;

  /** IANA time zone the agenda's days are in. Default: the viewer's */
  @property({ type: String, attribute: 'time-zone' })
  timeZone?: string;

  @property({ type: Object, attribute: false })
  messages?: Partial<FeedMessages>;

  private get _m(): FeedMessages {
    return { ...DEFAULT_FEED_MESSAGES, ...this.messages };
  }

  private get _agendaWindow() {
    return { from: this.agendaFrom, days: this.agendaDays, tzid: this.timeZone };
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
    if (
      changedProperties.has('authors') ||
      changedProperties.has('kinds') ||
      changedProperties.has('ids') ||
      changedProperties.has('limit') ||
      changedProperties.has('since') ||
      changedProperties.has('until') ||
      changedProperties.has('search') ||
      changedProperties.has('relays') ||
      changedProperties.has('manifest') ||
      changedProperties.has('filterTags') ||
      changedProperties.has('tagFilters') ||
      changedProperties.has('filters') ||
      changedProperties.has('agenda') ||
      changedProperties.has('agendaFrom') ||
      changedProperties.has('agendaDays') ||
      changedProperties.has('timeZone') ||
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
    } catch {
      // ignore
    }
  }

  private shouldLoad(): boolean {
    // Only load if we have at least one meaningful filter set
    return !!(
      this.agenda ||
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

  private async loadEvents() {
    this.isLoading = true;
    this.interactionEvents = [];
    this.interactionLoadKey = '';
    const resolvedKinds =
      this.kinds && this.kinds.length > 0
        ? this.kinds
        : this.manifest
          ? getManifestAvailableKinds(this.manifest)
          : this.agenda
            ? [ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND]
            : [1];
    // Agenda: the window's days as a `#D` filter, and enough events for the whole window
    const tagFilters = this.agenda
      ? { ...this.tagFilters, '#D': agendaDayTags(this._agendaWindow) }
      : this.tagFilters;

    try {
      const onUpdate = (arr: SignedEvent[]) => {
        this.events = arr;
        this.isLoading = false;
        this.scheduleInteractionsAndProfiles(arr);
      };
      const { events, readRelays } = await fetchFeedEvents(
        buildFetchFilters({
          filters: this.filters,
          ids: this.ids,
          authors: this.authors,
          kinds: resolvedKinds,
          search: this.search,
          limit: this.limit ?? (this.agenda ? AGENDA_LIMIT : DEFAULT_LIMIT),
          since: this.since,
          until: this.until,
          filterTags: this.filterTags,
          tagFilters,
        }),
        { relays: this.relays, authors: this.authors, onUpdate }
      );

      // Ensure final deduped list
      this.authorRelays = readRelays;
      this.events = events;
      this.isLoading = false;

      // Ensure we process final root set if it differs from progressive updates
      this.scheduleInteractionsAndProfiles(events);
    } catch (error) {
      console.error('Failed to load events:', error);
      this.events = [];
      this.interactionEvents = [];
      this.interactionLoadKey = '';
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

  /** Shows the agenda window starting at `from` (undefined: today) */
  private _moveAgenda(from: string | undefined) {
    this.agendaFrom = from;
    this.dispatchCustomEvent('nostr-post-agenda-change', { from, days: this.agendaDays });
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
      displayName: (pubkey) => this.displayName(pubkey),
      renderEventActions: (event, rootEvent) => this.renderEventActions(event, rootEvent),
      onCommentPublished: (event) => this.handleCommentPublished(event),
    };
  }

  render() {
    const m = this._m;
    if (this.isLoading) {
      return html`<div class="feed"><div class="loading">${m.loading}</div></div>`;
    }

    const threads = buildThreads(this.events, this.interactionEvents);
    const ctx = this._threadContext;
    const body = this.agenda
      ? renderFeedAgenda(threads, ctx, {
          window: this._agendaWindow,
          messages: m,
          onMove: (from) => this._moveAgenda(from),
        })
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
