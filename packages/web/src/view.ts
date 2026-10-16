/**
 * @nostr-post/web - <nostr-post-view> Web Component
 *
 * A universal viewer for displaying Nostr events.
 * Supports multi-event posts: a primary event (e.g. kind 1) with linked
 * secondary events (e.g. kind 30078 NIP-78 structured data) shown as one post.
 */

import { getManifestAvailableKinds } from '@nostr-post/core/manifestMappings';
import {
  mentionedPubkeys,
  mentionRelayHints,
  tokenizeNoteContent,
} from '@nostr-post/core/noteContent';
import {
  type DisplayableEvent,
  type NostrPostManifest,
  STANDARD_KIND1_POST_MANIFEST,
} from '@nostr-post/core/types';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles, NostrPostElement } from './base-component';
import { ensurePluginsForManifest } from './pluginAutoLoad';
import {
  type EventManifest,
  fetchEvents,
  fetchManifestForEvent,
  fetchProfile,
  fetchProfiles,
  getPublicKey,
} from './signer';
import { authorDisplayName, type NostrProfile, truncatePubkey } from './userProfile';
import { DEFAULT_NOSTR_LINK_BASE, renderNoteContent } from './viewContent';
import { type EditState, renderEditButton, renderInlineComposer } from './viewEdit';
import {
  hasStructuredContentMappings,
  renderLinkedEvents,
  renderManifestEventData,
} from './viewLinked';
import { DEFAULT_RAW_DATA_MESSAGES, type RawDataMessages, renderRawData } from './viewRawData';
import { postRoleView } from './viewRoles';
import { viewStyle } from './viewStyle';
import { renderTagPlugins } from './viewTagPlugins';
import { applyUpdateCommentsToEvent, renderUpdateComments } from './viewUpdates';

/** Event type that can be either unsigned or signed — re-exported from core for convenience */
export type { DisplayableEvent } from '@nostr-post/core/types';

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
  static styles = [baseStyles, viewStyle];

  @property({ type: Object })
  event?: DisplayableEvent;

  @property({ type: Object })
  manifest?: NostrPostManifest;

  /** Linked events that are part of this multi-event post (e.g. NIP-78 data) */
  @property({ type: Array })
  linkedEvents?: DisplayableEvent[];

  /** Interaction events related to the primary event (e.g. kind 1 update comments). */
  @property({ type: Array, attribute: false })
  interactionEvents?: DisplayableEvent[];

  /**
   * When true, shows an "Edit" button on posts.
   * For addressable events (kinds 30000–39999) it opens an inline composer that
   * publishes a replacement event (NIP-33 overwrite).
   * For kind-1 events it opens an inline composer that, on submit, publishes a
   * kind-1 update-comment reply (`update:{fieldId}:{value}` per changed field)
   * so the change is applied locally while remaining visible as a plain comment
   * in other clients.
   * Clicking always dispatches `nostr-post-edit-request` (cancelable) with
   * `{ event, dTag }`. Call `preventDefault()` to suppress the inline composer
   * and handle editing yourself.
   */
  @property({ type: Boolean })
  editable?: boolean;

  @state()
  private _showInlineComposer = false;

  @state()
  private _editPubkey?: string;

  /** Show the collapsed "All data" section (kind, author, ID, time, all tags, content) */
  @property({ type: Boolean, attribute: 'show-tags' })
  showTags?: boolean;

  /** Same as showTags */
  @property({ type: Boolean, attribute: 'show-kind' })
  showKind?: boolean;

  /** Overrides for the "All data" section's text (e.g. translations) */
  @property({ attribute: false })
  messages?: Partial<RawDataMessages>;

  /** Base URL that `nostr:` references in the text link to; the NIP-19 entity is appended */
  @property({ attribute: 'nostr-link-base' })
  nostrLinkBase = DEFAULT_NOSTR_LINK_BASE;

  /** Field IDs to exclude from the rendered view */
  @property({ type: Array, attribute: 'exclude-fields' })
  excludeFields?: string[];

  /** Manifest resolved via auto-fetch from NIP-78 `a` tag */
  @state()
  private _resolvedManifest?: NostrPostManifest;

  /** Linked events fetched from relays */
  @state()
  private _fetchedLinkedEvents?: DisplayableEvent[];

  /** The event we last looked up the manifest for */
  private _lastManifestLookup?: string;

  /** Set when the manifest is another author's with the event's manifest id: said in the view */
  @state()
  private _manifestSource?: EventManifest;

  /** Track which event ID we've fetched linked events for */
  private _lastFetchedLinkedId?: string;

  /** Track which pubkey we've fetched profile data for */
  private _lastFetchedProfilePubkey?: string;

  /** Static cache of fetched linked events by primary event id */
  private static _linkedEventsCache = new Map<string, DisplayableEvent[]>();

  @state()
  private _authorProfile?: NostrProfile;

  /** Profiles of pubkeys mentioned in the text (`nostr:npub…`) */
  @state()
  private _mentionProfiles = new Map<string, NostrProfile>();

  constructor() {
    super();
    this.showTags = false;
    this.showKind = false;
  }

  /**
   * The effective manifest: explicit prop takes priority, then auto-fetched.
   */
  private get effectiveManifest(): NostrPostManifest | undefined {
    return this.manifest ?? this._resolvedManifest ?? STANDARD_KIND1_POST_MANIFEST;
  }

  /**
   * All linked events: explicit prop takes priority, then auto-fetched.
   */
  private get allLinkedEvents(): DisplayableEvent[] {
    return this.linkedEvents ?? this._fetchedLinkedEvents ?? [];
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if ((changedProperties.has('event') || changedProperties.has('manifest')) && this.event) {
      // Auto-fetch manifest when no explicit manifest is set
      if (!this.manifest) {
        this._tryFetchManifest();
      }
      void this._ensureManifestPlugins();
      // Auto-fetch linked events when manifest has multiple kinds
      if (!this.linkedEvents) {
        this._tryFetchLinkedEvents();
      }
      this._tryFetchAuthorProfile();
      void this._fetchMentionProfiles();
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this._ensureManifestPlugins();
  }

  private async _ensureManifestPlugins() {
    await ensurePluginsForManifest(this.effectiveManifest);
    this.requestUpdate();
  }

  private async _tryFetchAuthorProfile() {
    if (!this.event?.pubkey) return;

    const pubkey = this.event.pubkey;
    if (this._lastFetchedProfilePubkey === pubkey) return;
    this._lastFetchedProfilePubkey = pubkey;

    const profile = await fetchProfile(pubkey);
    if (this.event?.pubkey === pubkey) this._authorProfile = profile;
  }

  private async _fetchMentionProfiles() {
    const event = this.event;
    const tokens = event ? tokenizeNoteContent(event.content) : [];
    const pubkeys = mentionedPubkeys(tokens);
    if (pubkeys.length === 0) return;
    const profiles = await fetchProfiles(pubkeys, { hints: mentionRelayHints(tokens) });
    if (this.event === event) this._mentionProfiles = profiles;
  }

  /**
   * The manifest the event was made with: its `a` address, else by its manifest label
   * (the author's own, then another author's, only when it fits the event)
   */
  private async _tryFetchManifest() {
    const event = this.event;
    if (!event) return;
    const key = event.id ?? JSON.stringify(event.tags);
    if (this._lastManifestLookup === key) return;
    this._lastManifestLookup = key;
    try {
      const found = await fetchManifestForEvent(event);
      if (this.event !== event || !found) return;
      this._resolvedManifest = found.manifest;
      this._manifestSource = found.source === 'other' ? found : undefined;
    } catch (err) {
      console.warn('Failed to auto-fetch manifest from relay:', err);
    }
  }

  /**
   * Auto-fetch linked events (e.g. NIP-78 data) that reference this event.
   * Only fetches when the manifest specifies multiple kinds.
   */
  private async _tryFetchLinkedEvents() {
    if (!this.event) return;

    const eventId = this.event.id;
    if (!eventId) return;

    // Only fetch if the manifest has kinds beyond the primary event's kind
    const m = this.effectiveManifest;
    if (!m) return;
    const availableKinds = getManifestAvailableKinds(m);
    if (availableKinds.length <= 1) return;

    // Skip if we already fetched for this event
    if (this._lastFetchedLinkedId === eventId) return;
    this._lastFetchedLinkedId = eventId;

    // Check cache
    const cached = NostrPostView._linkedEventsCache.get(eventId);
    if (cached) {
      this._fetchedLinkedEvents = cached;
      return;
    }

    const eventKind = this.event?.kind;
    const eventPubkey = this.event?.pubkey;
    if (!eventKind || !eventPubkey) return;

    const otherKinds = availableKinds.filter((k) => k !== eventKind);
    if (otherKinds.length === 0) return;

    try {
      const events = await fetchEvents(
        {
          kinds: otherKinds,
          '#e': [eventId],
          authors: [eventPubkey],
          limit: 10,
        },
        undefined,
        { waitForAll: true }
      );

      if (events.length > 0) {
        NostrPostView._linkedEventsCache.set(eventId, events);
        this._fetchedLinkedEvents = events;
      }
    } catch (err) {
      console.warn('Failed to fetch linked events:', err);
    }
  }

  /**
   * Format timestamp to readable date
   */
  private formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  private authorDisplayName(pubkey: string): string {
    return authorDisplayName(this._authorProfile, pubkey);
  }

  private handleEditRequest(event: DisplayableEvent) {
    const dTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1];
    const dispatched = this.dispatchCustomEvent(
      'nostr-post-edit-request',
      { event, dTag },
      { cancelable: true }
    );
    if (!dispatched.defaultPrevented) {
      const opening = !this._showInlineComposer;
      this._showInlineComposer = opening;
      if (opening && !(event.kind >= 30000 && event.kind < 40000)) {
        void getPublicKey().then((pk) => {
          this._editPubkey = pk;
        });
      }
    }
  }

  private get editState(): EditState {
    return {
      showInlineComposer: this._showInlineComposer,
      editPubkey: this._editPubkey,
      effectiveManifest: this.effectiveManifest,
      onComposerClose: () => {
        this._showInlineComposer = false;
      },
      onError: (message) => this.showError(message),
    };
  }

  render() {
    if (!this.event) {
      return html`<div class="error">
        No event provided. Please set the event property.
      </div>`;
    }

    const event = applyUpdateCommentsToEvent(
      this.event,
      this.effectiveManifest,
      this.interactionEvents
    );
    const { kind, created_at, pubkey } = event;
    // Role lines (`Tasted at: nostr:naddr1…`) show as rows, not in the text
    const { text: content, rows: roleRows, tags } = postRoleView(event, this.effectiveManifest);
    const showTechnicalMeta = Boolean(this.showKind || this.showTags);
    const manifestRenderedData = renderManifestEventData(event, this.effectiveManifest);
    const shouldUseManifestRendering =
      hasStructuredContentMappings(event, this.effectiveManifest) && Boolean(manifestRenderedData);
    const tokens = tokenizeNoteContent(content, tags);

    return html`
      <div class="view">
        <div class="view-header">
          ${this.showKind ? html`<span class="view-kind">Kind ${kind}</span>` : ''}
          ${
            this._authorProfile?.picture
              ? html`
                <img
                  class="view-avatar"
                  src=${this._authorProfile.picture}
                  alt="Author avatar"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
              `
              : ''
          }
          <span class="view-author" title=${pubkey}>${this.authorDisplayName(pubkey)}</span>
          ${
            showTechnicalMeta
              ? html`<span class="view-pubkey" title=${pubkey}>${truncatePubkey(pubkey)}</span>`
              : ''
          }
          <span class="view-timestamp"
            >${this.formatTimestamp(created_at)}</span
          >
        </div>

        <div class="view-content">
          ${
            content && !shouldUseManifestRendering
              ? renderNoteContent(tokens, {
                  nostrLinkBase: this.nostrLinkBase,
                  profiles: this._mentionProfiles,
                })
              : nothing
          }
          ${shouldUseManifestRendering ? manifestRenderedData : nothing}
          ${
            shouldUseManifestRendering
              ? nothing
              : renderTagPlugins({
                  kind,
                  manifest: this.effectiveManifest,
                  tags,
                  tokens,
                  excludeFields: this.excludeFields,
                })
          } ${roleRows}
        </div>
        ${
          this._manifestSource && !this.manifest
            ? html`<div class="view-manifest-note">
                ${{ ...DEFAULT_RAW_DATA_MESSAGES, ...this.messages }.shownWithManifest(
                  this._manifestSource.manifest.id,
                  truncatePubkey(this._manifestSource.pubkey ?? '')
                )}
              </div>`
            : nothing
        }

        ${renderLinkedEvents(this.allLinkedEvents, this.effectiveManifest)}
        ${renderUpdateComments(this.interactionEvents, this.event.pubkey)}
        ${showTechnicalMeta ? renderRawData(event, { ...DEFAULT_RAW_DATA_MESSAGES, ...this.messages }) : ''}
        ${renderEditButton(event, this.editable, this._showInlineComposer, (ev) => this.handleEditRequest(ev))}
        ${renderInlineComposer(event, this.editState)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-view': NostrPostView;
  }
}
