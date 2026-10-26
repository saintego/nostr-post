/**
 * @nostr-post/calendar - <nostr-calendar-event>
 *
 * One calendar event by its address (`.address`, `31922|31923:<pubkey>:<d-tag>`): loads its
 * newest version and shows it with the calendar manifest (title, date, place, participants,
 * RSVP, Add to calendar, .ics). The calendar's kind view: a post linking an event
 * (`nostr:naddr…`) shows it like this.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { DEFAULT_RELAYS, fetchEvents, type SignedEvent } from '@nostr-post/signer';
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

  @state() _event?: SignedEvent;
  _loads = 0;

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('address') || changed.has('relays')) void this._load();
  }

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
    return this._event
      ? html`<nostr-post-view .event=${this._event} .manifest=${this.manifest}></nostr-post-view>`
      : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-calendar-event': NostrCalendarEvent;
  }
}
