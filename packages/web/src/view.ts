/**
 * @nostr-post/web - <nostr-post-view> Web Component
 *
 * A universal viewer for displaying Nostr events.
 * Supports multi-event posts: a primary event (e.g. kind 1) with linked
 * secondary events (e.g. kind 30078 NIP-78 structured data) shown as one post.
 */

import { NIP78_KIND, eventToManifest, parseManifestATag } from '@nostr-post/core/nip78';
import type { NostrPostManifest, PostField, UnsignedNostrEvent } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { NostrPostElement, baseStyles } from './base-component';
import type { SignedEvent } from './signer';
import { renderLinkedEvents } from './viewLinked';
import { viewStyle } from './viewStyle';

/** Event type that can be either unsigned or signed */
export type DisplayableEvent = UnsignedNostrEvent | SignedEvent;

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

  @property({ type: Boolean })
  showTags?: boolean;

  @property({ type: Boolean })
  showKind?: boolean;

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

  /** Static cache of fetched manifests by `a` tag */
  private static _manifestCache = new Map<string, NostrPostManifest>();

  /** Static cache of fetched linked events by primary event id */
  private static _linkedEventsCache = new Map<string, DisplayableEvent[]>();

  constructor() {
    super();
    this.showTags = true;
    this.showKind = true;
  }

  /**
   * The effective manifest: explicit prop takes priority, then auto-fetched.
   */
  private get effectiveManifest(): NostrPostManifest | undefined {
    return this.manifest ?? this._resolvedManifest;
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
      // Auto-fetch linked events when manifest has multiple kinds
      if (!this.linkedEvents) {
        this._tryFetchLinkedEvents();
      }
    }
  }

  /**
   * Find an `a` tag in the event that references a nostr-post manifest
   * and fetch it from relays if not already cached.
   */
  private async _tryFetchManifest() {
    if (!this.event) return;

    // Look for an `a` tag referencing a NIP-78 manifest
    const aTag = this.event.tags.find((t) => {
      if (t[0] !== 'a') return false;
      const ref = parseManifestATag(t[1]);
      return !!ref;
    });

    if (!aTag) return;

    const aTagValue = aTag[1];

    // Skip if we already fetched this one
    if (this._lastFetchedATag === aTagValue) return;
    this._lastFetchedATag = aTagValue;

    // Check static cache first
    const cached = NostrPostView._manifestCache.get(aTagValue);
    if (cached) {
      this._resolvedManifest = cached;
      return;
    }

    // Parse the reference
    const ref = parseManifestATag(aTagValue);
    if (!ref) return;

    try {
      const { fetchEvents } = await import('./signer');

      const events = await fetchEvents({
        kinds: [NIP78_KIND],
        authors: [ref.pubkey],
        '#d': [ref.dTag],
        limit: 1,
      });

      if (events.length > 0) {
        const stored = eventToManifest(events[0]);
        if (stored) {
          NostrPostView._manifestCache.set(aTagValue, stored.manifest);
          this._resolvedManifest = stored.manifest;
        }
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

    const eventId = 'id' in this.event ? (this.event as SignedEvent).id : undefined;
    if (!eventId) return;

    // Only fetch if the manifest has kinds beyond the primary event's kind
    const m = this.effectiveManifest;
    if (!m || m.requiredKinds.length <= 1) return;

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

    const otherKinds = m.requiredKinds.filter((k) => k !== eventKind);
    if (otherKinds.length === 0) return;

    try {
      const { fetchEvents } = await import('./signer');

      const events = await fetchEvents({
        kinds: otherKinds,
        '#e': [eventId],
        authors: [eventPubkey],
        limit: 10,
      });

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
      return html`<div class="error">
        No event provided. Please set the event property.
      </div>`;
    }

    const event = this.event;
    const kind = event.kind;
    const created_at = event.created_at;
    const tags = event.tags;
    const content = event.content;
    const pubkey = event.pubkey;
    const eventId = 'id' in event ? (event as SignedEvent).id : undefined;

    return html`
      <div class="view">
        <div class="view-header">
          ${this.showKind ? html`<span class="view-kind">Kind ${kind}</span>` : ''}
          <span class="view-pubkey" title=${pubkey}
            >${this.truncatePubkey(pubkey)}</span
          >
          <span class="view-timestamp"
            >${this.formatTimestamp(created_at)}</span
          >
        </div>

        <div class="view-content">
          ${content ? html`<div>${unsafeHTML(this.formatMarkdown(content))}</div>` : ''}
          ${this.renderTagPlugins(tags)}
        </div>

        ${renderLinkedEvents(this.allLinkedEvents, this.effectiveManifest)}

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
        ${eventId ? html`<div class="view-id">ID: ${eventId}</div>` : ''}
      </div>
    `;
  }

  /**
   * Build a map from tag name -> manifest field for plugin lookup.
   */
  private getTagFieldMap(): Map<string, PostField> {
    const map = new Map<string, PostField>();
    const m = this.effectiveManifest;
    if (m) {
      for (const field of m.fields) {
        if (field.mapTo.target === 'tag' && field.mapTo.tagName) {
          map.set(field.mapTo.tagName, field);
        }
      }
    }
    return map;
  }

  /**
   * Render tag values using registered plugin view components.
   * Falls back gracefully when no plugin or no viewTagName is registered.
   */
  private renderTagPlugins(tags: string[][]) {
    const tagFieldMap = this.getTagFieldMap();
    if (tagFieldMap.size === 0) return '';

    const results = [];
    for (const tag of tags) {
      const [tagName, rawValue] = tag;
      if (!rawValue) continue;

      const field = tagFieldMap.get(tagName);
      if (!field) continue;

      const plugin = pluginRegistry.get(field.uiPlugin);
      if (!plugin?.viewTagName) continue;

      // Deserialize the raw tag string to a typed value
      let value: unknown = rawValue;
      if (plugin.deserializeValue) {
        value = plugin.deserializeValue(rawValue, field);
      } else if (field.type === 'number') {
        value = Number(rawValue);
      }

      const viewTag = unsafeStatic(plugin.viewTagName);
      results.push(staticHtml`<${viewTag} .value=${value} .field=${field}></${viewTag}>`);
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
