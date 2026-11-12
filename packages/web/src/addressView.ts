/**
 * @nostr-post/web - <nostr-post-address>
 *
 * One addressable event by its address (`.address`, `kind:<pubkey>:<d-tag>`): loads its newest
 * version and shows it with `.manifest` (<nostr-post-view>). With `thread`, the event's own
 * page: its comments, reactions and update comments too (a <nostr-post-feed> of the one event),
 * and the manifest's `sections` (<nostr-post-sections>). Domain packages build their kind views
 * on it with their manifest (a calendar event, an article).
 */

import { filterLatestAddressableEvents } from '@nostr-post/core/nip33';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { isAddress, targetFilters } from '@nostr-post/posts';
import {
  DEFAULT_RELAYS,
  type FetchFilter,
  fetchEvents,
  type SignedEvent,
} from '@nostr-post/signer';
import { npExportParts } from '@nostr-post/ui';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './feed';
import { type FeedLayout, renderFeedThread } from './feedThread';
import './sections';
import './view';

@customElement('nostr-post-address')
export class NostrPostAddress extends NpElement {
  static override styles = [
    ...npStyles,
    css`
      :host {
        display: block;
        margin: 0.5rem 0;
      }
    `,
  ];

  @property() address = '';
  @property({ type: Array }) relays?: string[];
  /** How the event shows; without one, its kind's standard fields */
  @property({ attribute: false }) manifest?: NostrPostManifest;
  /** With its comments, reactions and update comments (others' suggested changes) */
  @property({ type: Boolean }) thread = false;
  /**
   * An Edit button: its author republishes the event, anyone else suggests the changes as an
   * update comment (applied for the event's editors)
   */
  @property({ type: Boolean }) editable = false;
  /** Without the manifest's `sections` on the event's page (`thread`) */
  @property({ type: Boolean, attribute: 'hide-sections' }) hideSections = false;

  @state() _event?: SignedEvent;
  /** The feed's filters: a new array only for a new address (the feed reloads on one) */
  _filters: FetchFilter[] = [];
  _loads = 0;

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('address')) {
      this._filters = isAddress(this.address) ? targetFilters([this.address]) : [];
    }
  }

  override updated(changed: Map<string, unknown>): void {
    if (this.thread) return;
    if (changed.has('address') || changed.has('relays') || changed.has('thread')) void this._load();
  }

  /** The newest version's thread: relays can hold several versions of the event */
  _layout: FeedLayout = (threads, ctx) => {
    const [latest] = filterLatestAddressableEvents(threads.map((thread) => thread.root));
    const thread = threads.find((t) => t.root === latest);
    return thread ? renderFeedThread(thread, ctx) : html``;
  };

  async _load(): Promise<void> {
    const load = ++this._loads;
    this._event = undefined;
    if (!isAddress(this.address)) return;
    const events = await fetchEvents(targetFilters([this.address]), this.relays ?? DEFAULT_RELAYS, {
      waitForAll: true,
    }).catch(() => []);
    if (load === this._loads) this._event = filterLatestAddressableEvents(events)[0];
  }

  override render() {
    return html`${this._renderEvent()}${this._renderSections()}`;
  }

  /** The manifest's sections, on the event's own page */
  _renderSections() {
    const sections = this.manifest?.sections;
    if (!sections?.length || !this.thread || this.hideSections) return nothing;
    if (!isAddress(this.address)) return nothing;
    return html`<nostr-post-sections
      exportparts=${npExportParts}
      .sections=${sections}
      .target=${{ addresses: [this.address], ids: [], links: [] }}
      .linkValue=${this.address}
      .manifest=${this.manifest}
      .relays=${this.relays ?? DEFAULT_RELAYS}
    ></nostr-post-sections>`;
  }

  _renderEvent() {
    if (this.thread) {
      return this._filters.length
        ? html`<nostr-post-feed
            exportparts=${npExportParts}
            .filters=${this._filters}
            .relays=${this.relays}
            .manifest=${this.manifest}
            .layout=${this._layout}
            .editable=${this.editable}
          ></nostr-post-feed>`
        : nothing;
    }
    return this._event
      ? html`<nostr-post-view
          exportparts=${npExportParts}
          .event=${this._event}
          .manifest=${this.manifest}
          .editable=${this.editable}
        ></nostr-post-view>`
      : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-address': NostrPostAddress;
  }
}
