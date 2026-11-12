/**
 * @nostr-post/calendar - <nostr-calendar-event>
 *
 * One calendar event by its address (`.address`, `31922|31923:<pubkey>:<d-tag>`): web's
 * <nostr-post-address> with the calendar manifest, which loads the newest version and shows it
 * (title, date, place, participants, RSVP, Add to calendar, .ics). The calendar's kind view: a post linking an event
 * (`nostr:naddr…`) shows it like this. With `thread`, an event's own page: its comments,
 * reactions and update comments too (a <nostr-post-feed> of the one event), and the
 * manifest's `sections` (`<nostr-post-sections>`), e.g. the photos and videos of the event and
 * of everything referencing it, comments included.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import '@nostr-post/plugin-media/web';
import { npExportParts } from '@nostr-post/ui';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import '@nostr-post/web';
import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CALENDAR_EVENT_MANIFEST } from '../calendarManifest';
import { isCalendarEventAddress } from '../rsvp';

@customElement('nostr-calendar-event')
export class NostrCalendarEvent extends NpElement {
  static override styles = [
    ...npStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];

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
  /** Without the manifest's `sections` on the event's page (`thread`) */
  @property({ type: Boolean, attribute: 'hide-sections' }) hideSections = false;

  override render() {
    if (!isCalendarEventAddress(this.address)) return nothing;
    return html`<nostr-post-address
      exportparts=${npExportParts}
      .address=${this.address}
      .relays=${this.relays}
      .manifest=${this.manifest}
      .thread=${this.thread}
      .editable=${this.editable}
      .hideSections=${this.hideSections}
    ></nostr-post-address>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-calendar-event': NostrCalendarEvent;
  }
}
