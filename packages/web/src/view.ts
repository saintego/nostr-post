/**
 * @nostr-post/web - <nostr-post-view> Web Component
 *
 * A universal viewer for displaying Nostr events.
 * Supports multi-event posts: a primary event (e.g. kind 1) with linked
 * secondary events (e.g. kind 30078 NIP-78 structured data) shown as one post.
 */

import { getFieldsByKind, getManifestAvailableKinds } from '@nostr-post/core/manifestMappings';
import { parseManifestATag } from '@nostr-post/core/nip78';
import {
  type DisplayableEvent,
  type NostrPostManifest,
  type PostField,
  STANDARD_KIND1_POST_MANIFEST,
} from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { NostrPostElement, baseStyles } from './base-component';
import { ensurePluginsForManifest } from './pluginAutoLoad';
import { fetchEvents, fetchManifestByATag, getPublicKey } from './signer';
import {
  type NostrProfile,
  authorDisplayName,
  fetchAuthorProfile,
  truncatePubkey,
} from './userProfile';
import { type EditState, renderEditButton, renderInlineComposer } from './viewEdit';
import {
  hasStructuredContentMappings,
  renderLinkedEvents,
  renderManifestEventData,
} from './viewLinked';
import { viewStyle } from './viewStyle';
import { applyUpdateCommentsToEvent, renderUpdateComments } from './viewUpdates';

/** Event type that can be either unsigned or signed — re-exported from core for convenience */
export type { DisplayableEvent } from '@nostr-post/core/types';
type RegisteredPlugin = Exclude<ReturnType<typeof pluginRegistry.get>, undefined>;

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

  @property({ type: Boolean })
  showTags?: boolean;

  @property({ type: Boolean })
  showKind?: boolean;

  /** Field IDs to exclude from the rendered view */
  @property({ type: Array, attribute: 'exclude-fields' })
  excludeFields?: string[];

  /** Manifest resolved via auto-fetch from NIP-78 `a` tag */
  @state()
  private _resolvedManifest?: NostrPostManifest;

  /** Linked events fetched from relays */
  @state()
  private _fetchedLinkedEvents?: DisplayableEvent[];

  /** Track which `a` tag value we've already fetched for */
  private _lastFetchedATag?: string;

  /** Track which event ID we've fetched linked events for */
  private _lastFetchedLinkedId?: string;

  /** Track which pubkey we've fetched profile data for */
  private _lastFetchedProfilePubkey?: string;

  /** Static cache of fetched linked events by primary event id */
  private static _linkedEventsCache = new Map<string, DisplayableEvent[]>();

  /** Static cache of fetched author profiles by pubkey */
  private static _profileCache = new Map<string, NostrProfile>();

  @state()
  private _authorProfile?: NostrProfile;

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

    this._authorProfile = await fetchAuthorProfile({
      pubkey,
      cache: NostrPostView._profileCache,
    });
  }

  /**
   * Find an `a` tag in the event that references a nostr-post manifest
   * and fetch it from relays if not already cached.
   */
  private async _tryFetchManifest() {
    if (!this.event) return;

    // Look for an `a` tag referencing a NIP-78 manifest
    const aTag = this.event.tags.find((t: string[]) => {
      if (t[0] !== 'a') return false;
      const ref = parseManifestATag(t[1]);
      return !!ref;
    });

    if (!aTag) return;

    const aTagValue = aTag[1];

    // Skip if we already fetched this one
    if (this._lastFetchedATag === aTagValue) return;
    this._lastFetchedATag = aTagValue;

    try {
      const stored = await fetchManifestByATag(aTagValue);
      if (stored) {
        this._resolvedManifest = stored.manifest;
      }
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
    const dispatched = this.dispatchCustomEvent('nostr-post-edit-request', { event, dTag }, { cancelable: true });
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
    const kind = event.kind;
    const created_at = event.created_at;
    const tags = event.tags;
    const content = event.content;
    const pubkey = event.pubkey;
    const eventId = event.id;
    const showTechnicalMeta = Boolean(this.showKind || this.showTags);
    const manifestRenderedData = renderManifestEventData(event, this.effectiveManifest);
    const shouldUseManifestRendering =
      hasStructuredContentMappings(event, this.effectiveManifest) && Boolean(manifestRenderedData);

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
              ? html`<div>${unsafeHTML(this.formatMarkdown(content))}</div>`
              : nothing
          }
          ${shouldUseManifestRendering ? manifestRenderedData : nothing}
          ${shouldUseManifestRendering ? nothing : this.renderTagPlugins(tags)}
        </div>

        ${renderLinkedEvents(this.allLinkedEvents, this.effectiveManifest)}
        ${renderUpdateComments(this.interactionEvents)}
        ${
          this.showTags && tags.length > 0
            ? html`
              <div class="view-tags">
                ${tags.map(
                  (tag: string[]) => html`
                    <span class="tag">
                      <span class="tag-name">${tag[0]}:</span>
                      ${tag.slice(1).join(', ')}
                    </span>
                  `
                )}
              </div>
            `
            : ''
        }
        ${showTechnicalMeta && eventId ? html`<div class="view-id">ID: ${eventId}</div>` : ''}
        ${renderEditButton(event, this.editable, this._showInlineComposer, (ev) => this.handleEditRequest(ev))}
        ${renderInlineComposer(event, this.editState)}
      </div>
    `;
  }

  /**
   * Build a map from tag name -> manifest field for plugin lookup.
   */
  private getTagFieldMap(): Map<string, PostField[]> {
    const map = new Map<string, PostField[]>();
    const m = this.effectiveManifest;
    const kind = this.event?.kind;
    if (m && kind !== undefined) {
      for (const field of getFieldsByKind(m, kind, [kind])) {
        if (!Array.isArray(field.mapTo) && field.mapTo.target === 'tag' && field.mapTo.tagName) {
          const fields = map.get(field.mapTo.tagName) ?? [];
          fields.push(field);
          map.set(field.mapTo.tagName, fields);
        }
      }
    }
    return map;
  }

  private groupTagValues(
    tags: string[][],
    tagFieldMap: Map<string, PostField[]>
  ): Map<string, string[]> {
    const tagGroups = new Map<string, string[]>();
    for (const [tagName, rawValue] of tags) {
      if (!rawValue || !tagFieldMap.has(tagName)) continue;
      const existing = tagGroups.get(tagName) ?? [];
      existing.push(rawValue);
      tagGroups.set(tagName, existing);
    }
    return tagGroups;
  }

  private shouldSkipTagField(field: PostField): boolean {
    return field.visibility?.view === 'hidden' || this.excludeFields?.includes(field.id) === true;
  }

  private deserializeTagValue(
    plugin: RegisteredPlugin,
    field: PostField,
    rawValue: string
  ): unknown {
    if (plugin.deserializeValue) {
      return plugin.deserializeValue(rawValue, field);
    }
    if (field.type === 'number') {
      return Number(rawValue);
    }
    return rawValue;
  }

  private resolveTagPluginValue(
    plugin: RegisteredPlugin,
    field: PostField,
    values: string[],
    tags: string[][]
  ): unknown {
    if (plugin.resolveFromTags) {
      return plugin.resolveFromTags(tags, field);
    }
    if (field.uiPlugin === 'geo') {
      return values.reduce((a, b) => (a.length >= b.length ? a : b));
    }
    if (values.length > 1 || field.uiPlugin === 'hashtag' || field.uiPlugin === 'media') {
      return values;
    }
    return this.deserializeTagValue(plugin, field, values[0]);
  }

  /**
   * Render tag values using registered plugin view components.
   * Aggregates multi-value tags (hashtags, media) into arrays.
   * Falls back gracefully when no plugin or no viewTagName is registered.
   */
  private renderTagPlugins(tags: string[][]) {
    const tagFieldMap = this.getTagFieldMap();
    if (tagFieldMap.size === 0) return '';

    const tagGroups = this.groupTagValues(tags, tagFieldMap);

    const results = [];
    for (const [tagName, values] of tagGroups) {
      const fields = tagFieldMap.get(tagName) ?? [];
      for (const field of fields) {
        if (this.shouldSkipTagField(field)) continue;

        const plugin = pluginRegistry.get(field.uiPlugin);
        if (!plugin?.viewTagName) continue;

        const value = this.resolveTagPluginValue(plugin, field, values, tags);

        const viewTag = unsafeStatic(plugin.viewTagName);
        results.push(staticHtml`<${viewTag} .value=${value} .field=${field}></${viewTag}>`);
      }
    }
    return results;
  }

  private formatMarkdown(text: string): string {
    if (!text) return '';
    let html = text;
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code
    html = html.replace(
      /`([^`]+)`/g,
      '<code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>'
    );
    // Headings
    html = html.replace(
      /^### (.*?)$/gm,
      '<h4 style="margin: 1rem 0 0.5rem 0; font-size: 1rem;">$1</h4>'
    );
    html = html.replace(
      /^## (.*?)$/gm,
      '<h3 style="margin: 1rem 0 0.5rem 0; font-size: 1.1rem;">$1</h3>'
    );
    html = html.replace(
      /^# (.*?)$/gm,
      '<h2 style="margin: 1rem 0 0.5rem 0; font-size: 1.25rem;">$1</h2>'
    );
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-view': NostrPostView;
  }
}
