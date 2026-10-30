/**
 * @nostr-post/calendar - <nostr-calendar-days>
 *
 * The events of <nostr-calendar-agenda> under day headings (and, in month view, the month's grid
 * above them). It is the agenda's layout of <nostr-post-feed>: the feed loads the events and
 * their comments and reactions, this element groups them by day (`groupEventsByDay`) as compact
 * rows. One event at a time opens in full under its row (the feed's thread rendering: comments,
 * actions, venue map), so a month of hundreds of events stays light.
 */

import {
  baseStyles,
  type FeedThread,
  type FeedThreadContext,
  feedStyle,
  renderFeedThread,
} from '@nostr-post/web';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type AgendaWindow, eventTimeZone, formatAgendaDate, groupEventsByDay } from '../agenda';
import { agendaItem } from '../agendaItem';
import { type AgendaMessages, DEFAULT_AGENDA_MESSAGES } from './agendaMessages';
import { renderAgendaRow } from './agendaRow';
import { agendaStyles } from './agendaStyles';
import { renderMonthGrid } from './monthGrid';

@customElement('nostr-calendar-days')
export class NostrCalendarDays extends LitElement {
  static override styles = [baseStyles, feedStyle, agendaStyles];

  @property({ attribute: false }) threads: FeedThread[] = [];
  @property({ attribute: false }) ctx?: FeedThreadContext;
  /** The window the threads were loaded for */
  @property({ attribute: false }) window?: AgendaWindow;
  @property({ type: Boolean }) month = false;
  /** The next window is loading: these days stay, dimmed */
  @property({ type: Boolean }) loading = false;
  @property({ attribute: false }) messages: AgendaMessages = DEFAULT_AGENDA_MESSAGES;
  /** The app's page of an event (`<nostr-calendar-agenda>`'s `eventHref`) */
  @property({ attribute: false }) eventHref?: (address: string) => string;

  /** The event open in full: its address and the day it was opened on */
  @state() _open?: { address: string; date: string };

  override render() {
    const { ctx, window, messages } = this;
    if (!ctx || !window) return nothing;
    const threadByRoot = new Map(this.threads.map((thread) => [thread.root, thread]));
    const roots = this.threads.map((thread) => thread.root);
    const days = groupEventsByDay(roots, window);
    const open = this._open;
    const renderEvent = (event: (typeof roots)[number], date: string) => {
      const item = agendaItem(event, date, eventTimeZone(event, window));
      const isOpen = open?.address === item.address && open.date === date;
      const thread = threadByRoot.get(event);
      return html`${renderAgendaRow(item, {
        open: isOpen,
        eventHref: this.eventHref,
        messages,
        onToggle: () => {
          this._open = isOpen ? undefined : { address: item.address, date };
        },
      })}${isOpen && thread ? html`<div class="agenda-open">${renderFeedThread(thread, ctx)}</div>` : nothing}`;
    };
    return html`
      <div class="agenda-loading" role="status">${this.loading ? messages.loading : ''}</div>
      ${this.month ? renderMonthGrid(roots, window, messages) : nothing}
      <div
        class="agenda-days ${this.loading ? 'stale' : ''}"
        aria-busy=${this.loading ? 'true' : 'false'}
      >
        ${
          days.length === 0
            ? this.loading
              ? nothing
              : html`<div class="empty">${messages.empty}</div>`
            : days.map(
                ({ date, events }) => html`
                  <section class="agenda-day" data-date=${date}>
                    <h3 class="agenda-date">${formatAgendaDate(date)}</h3>
                    ${events.map((event) => renderEvent(event, date))}
                  </section>
                `
              )
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-calendar-days': NostrCalendarDays;
  }
}
