/**
 * @nostr-post/calendar - <nostr-calendar-event>
 *
 * One calendar event by its address (`.address`, `31922|31923:<pubkey>:<d-tag>`): loads its
 * newest version and shows it with the calendar manifest (title, date, place, participants,
 * RSVP, Add to calendar, .ics). The calendar's kind view: a post linking an event
 * (`nostr:naddr…`) shows it like this. With `thread`, an event's own page: its comments,
 * reactions and update comments too (a <nostr-post-feed> of the one event).
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  DEFAULT_RELAYS,
  type FetchFilter,
  fetchEvents,
  type SignedEvent,
} from '@nostr-post/signer';
import { type FeedLayout, renderFeedThread } from '@nostr-post/web';
import '@nostr-post/web';
import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { latestByAddress } from '../agenda';
import { CALENDAR_EVENT_MANIFEST } from '../calendarManifest';
import { calendarEventFilters } from '../calendars';
import { isCalendarEventAddress } from '../rsvp';

@customElement('nostr-calendar-event')
export class NostrCalendarEvent extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin: 0.5rem 0;
    }
  `;

  @property() address = '';
  @property({ type: Array }) relays?: string[];
  /** Default CALENDAR_EVENT_MANIFEST */
  @property({ attribute: false }) manifest: NostrPostManifest = CALENDAR_EVENT_MANIFEST;
  /** With its comments, reactions and update comments (others' suggested changes) */
  @property({ type: Boolean }) thread = false;
  /**
   * An Edit button: its author republishes the event, anyone else suggests the changes as an
   * update comment (applied for the event's editors)
   */
  @property({ type: Boolean }) editable = false;

  @state() _event?: SignedEvent;
  /** The feed's filters: a new array only for a new address (the feed reloads on one) */
  _filters: FetchFilter[] = [];
  _loads = 0;

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('address')) {
      this._filters = isCalendarEventAddress(this.address)
        ? calendarEventFilters([this.address])
        : [];
    }
  }

  override updated(changed: Map<string, unknown>): void {
    if (this.thread) return;
    if (changed.has('address') || changed.has('relays') || changed.has('thread')) void this._load();
  }

  /** The newest version's thread: relays can hold several versions of the event */
  _layout: FeedLayout = (threads, ctx) => {
    const [latest] = latestByAddress(threads.map((thread) => thread.root));
    const thread = threads.find((t) => t.root === latest);
    return thread ? renderFeedThread(thread, ctx) : html``;
  };

  async _load(): Promise<void> {
    const load = ++this._loads;
    this._event = undefined;
    if (!isCalendarEventAddress(this.address)) return;
    const events = await fetchEvents(
      calendarEventFilters([this.address]),
      this.relays ?? DEFAULT_RELAYS,
      { waitForAll: true }
    ).catch(() => []);
    if (load === this._loads) this._event = latestByAddress(events)[0];
  }

  override render() {
    if (this.thread) {
      return this._filters.length
        ? html`<nostr-post-feed
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
          .event=${this._event}
          .manifest=${this.manifest}
          .editable=${this.editable}
        ></nostr-post-view>`
      : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-calendar-event': NostrCalendarEvent;
  }
}
