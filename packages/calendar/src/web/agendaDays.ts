/**
 * @nostr-post/calendar - <nostr-calendar-days>
 *
 * The posts of <nostr-calendar-agenda> under day headings (and, in month view, the month's grid
 * above them). It is the agenda's layout of <nostr-post-feed>: the feed loads the events and
 * their comments and reactions, this element groups them by day (`groupEventsByDay`) and shows
 * each with the feed's own thread rendering.
 */

import {
  baseStyles,
  type FeedThread,
  type FeedThreadContext,
  feedStyle,
  renderFeedThread,
} from '@nostr-post/web';
import { html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type AgendaWindow, formatAgendaDate, groupEventsByDay } from '../agenda';
import { type AgendaMessages, DEFAULT_AGENDA_MESSAGES } from './agendaMessages';
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

  override render() {
    const { ctx, window, messages } = this;
    if (!ctx || !window) return nothing;
    const threadByRoot = new Map(this.threads.map((thread) => [thread.root, thread]));
    const roots = this.threads.map((thread) => thread.root);
    const days = groupEventsByDay(roots, window);
    // An event spanning several days opens its reply composer only on its first day
    const shown = new Set<FeedThread>();
    const renderOnce = (thread: FeedThread) => {
      const again = shown.has(thread);
      shown.add(thread);
      return renderFeedThread(thread, again ? { ...ctx, activeReplyTarget: undefined } : ctx);
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
                    ${events.map((event) => {
                      const thread = threadByRoot.get(event);
                      return thread ? renderOnce(thread) : nothing;
                    })}
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
