/**
 * @nostr-post/calendar - <nostr-calendar-agenda>
 *
 * NIP-52 calendar events of a date window under day headings, sorted by when they start, or a
 * month as a grid above its list (`view="month"`). Previous / Today / Next move the window.
 * The events come by their `D` day tags (narrowed by `authors` and `tagFilters`, e.g. an area
 * `#g` and a genre `#t`), or with `calendar` the events of one calendar by address.
 *
 * It is a <nostr-post-feed> with the agenda as its layout, so events keep their comments,
 * reactions and actions (RSVP, Add to calendar, .ics). Fires `nostr-calendar-agenda-change`
 * ({ from, days, view }) when the window moves.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { FetchFilter } from '@nostr-post/signer';
import { baseStyles, type FeedLayout, feedStyle } from '@nostr-post/web';
import '@nostr-post/web';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type AgendaWindow, formatWindowRange, shiftWindow } from '../agenda';
import { agendaFilters } from '../agendaQuery';
import { CALENDAR_EVENT_MANIFEST } from '../calendarManifest';
import { fetchCalendarItems } from '../calendars';
import { agendaWindowFor, formatMonth, monthOf, shiftMonth } from '../month';
import './agendaDays';
import { type AgendaMessages, DEFAULT_AGENDA_MESSAGES } from './agendaMessages';
import { agendaStyles } from './agendaStyles';

/** Properties that change which events load */
const QUERY_PROPERTIES = [
  'from',
  'days',
  'view',
  'timeZone',
  'eventZones',
  'kinds',
  'authors',
  'tagFilters',
];

@customElement('nostr-calendar-agenda')
export class NostrCalendarAgenda extends LitElement {
  static override styles = [baseStyles, feedStyle, agendaStyles];

  /** First day, `YYYY-MM-DD` (in month view: a day of the month). Default: today */
  @property() from?: string;
  /** Number of days (default 30, at most 366); in month view the month's */
  @property({ type: Number }) days?: number;
  /** `month`: the month as a grid above its list */
  @property() view: 'list' | 'month' = 'list';
  /** IANA time zone of the days. Default: the viewer's */
  @property({ attribute: 'time-zone' }) timeZone?: string;
  /** Events on the days and at the times of their own zone (`start_tzid`), e.g. a city's gigs */
  @property({ type: Boolean, attribute: 'event-zones' }) eventZones = false;
  /** One calendar (`31924:<pubkey>:<d-tag>`): its events, by address */
  @property() calendar?: string;
  /** Default 31922 and 31923 */
  @property({ type: Array }) kinds?: number[];
  @property({ type: Array }) authors?: string[];
  /** e.g. `{ '#g': ['u09t'], '#t': ['punk'] }` */
  @property({ type: Object }) tagFilters?: Record<string, string[]>;
  @property({ type: Array }) relays?: string[];
  /** Default CALENDAR_EVENT_MANIFEST */
  @property({ attribute: false }) manifest: NostrPostManifest = CALENDAR_EVENT_MANIFEST;
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean, attribute: 'comments-enabled' }) commentsEnabled = true;
  @property({ type: Boolean, attribute: 'reactions-enabled' }) reactionsEnabled = true;
  @property({ attribute: false }) messages: Partial<AgendaMessages> = {};
  /**
   * The app's page of an event, e.g. `(address) => '#/event/' + encodeNaddr(address)`: rows link
   * there. Without it a row's title opens the event under it
   */
  @property({ attribute: false }) eventHref?: (address: string) => string;

  /** A calendar's event addresses, once loaded */
  @state() _calendarItems?: string[];
  @state() _filters?: FetchFilter[];

  /** The window the shown events were loaded for: kept while the next one loads */
  _shownWindow?: AgendaWindow;
  _calendarLoads = 0;

  get _m(): AgendaMessages {
    return { ...DEFAULT_AGENDA_MESSAGES, ...this.messages };
  }

  get _window(): AgendaWindow {
    const window = agendaWindowFor(this.from, this.days, this.timeZone, this.view);
    return this.eventZones ? { ...window, eventZones: true } : window;
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('calendar')) {
      this._calendarItems = undefined;
      if (this.calendar) void this._loadCalendar(this.calendar);
    }
    const queryChanged = QUERY_PROPERTIES.some((key) => changed.has(key));
    if (queryChanged || changed.has('_calendarItems') || changed.has('calendar')) {
      // A new array only when the query changed: the feed reloads on a new `filters`
      this._filters =
        this.calendar && !this._calendarItems
          ? undefined
          : agendaFilters({
              window: this._window,
              kinds: this.kinds,
              authors: this.authors,
              tagFilters: this.tagFilters,
              calendarItems: this.calendar ? this._calendarItems : undefined,
            });
    }
  }

  async _loadCalendar(calendar: string): Promise<void> {
    const load = ++this._calendarLoads;
    const items = await fetchCalendarItems(calendar, { relays: this.relays }).catch(() => []);
    if (load === this._calendarLoads) this._calendarItems = items;
  }

  _move(from: string | undefined): void {
    this.from = from;
    this.dispatchEvent(
      new CustomEvent('nostr-calendar-agenda-change', {
        detail: { from, days: this.days, view: this.view },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** The first day `steps` windows (or months) on */
  _shifted(steps: number): string {
    const window = this._window;
    return this.view === 'month'
      ? `${shiftMonth(monthOf(window.from, window.tzid), steps)}-01`
      : shiftWindow(window, steps);
  }

  _layout: FeedLayout = (threads, ctx, { loading }) => {
    if (!loading) this._shownWindow = this._window;
    return html`<nostr-calendar-days
      .threads=${threads}
      .ctx=${ctx}
      .window=${this._shownWindow ?? this._window}
      .month=${this.view === 'month'}
      .loading=${loading}
      .messages=${this._m}
      .eventHref=${this.eventHref}
    ></nostr-calendar-days>`;
  };

  override render() {
    const m = this._m;
    const window = this._window;
    const filters = this._filters;
    return html`
      <nav class="agenda-nav" aria-label=${m.navigation}>
        <button type="button" @click=${() => this._move(this._shifted(-1))}>‹ ${m.previous}</button>
        <button type="button" @click=${() => this._move(undefined)}>${m.today}</button>
        <button type="button" @click=${() => this._move(this._shifted(1))}>${m.next} ›</button>
        <span class="agenda-range"
          >${this.view === 'month' ? formatMonth(monthOf(window.from, window.tzid)) : formatWindowRange(window)}</span
        >
        <span class="agenda-loading" role="status">${filters ? '' : m.loading}</span>
      </nav>
      ${
        !filters
          ? nothing
          : filters.length === 0
            ? html`<div class="empty">${m.empty}</div>`
            : html`<nostr-post-feed
                .filters=${filters}
                .relays=${this.relays}
                .manifest=${this.manifest}
                .layout=${this._layout}
                .trustedEditors=${this.calendar ? [this.calendar.split(':')[1] ?? ''] : undefined}
                .editable=${this.editable}
                .commentsEnabled=${this.commentsEnabled}
                .reactionsEnabled=${this.reactionsEnabled}
              ></nostr-post-feed>`
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-calendar-agenda': NostrCalendarAgenda;
  }
}
