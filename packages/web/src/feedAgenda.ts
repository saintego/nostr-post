/**
 * <nostr-post-feed agenda>: calendar events under day headings, with buttons to move the date
 * window. Which events go on which day is @nostr-post/plugin-date's `groupEventsByDay`; this
 * module only renders it.
 */

import {
  type AgendaWindow,
  formatAgendaDate,
  formatMonth,
  formatWindowRange,
  groupEventsByDay,
  monthOf,
  shiftMonth,
  shiftWindow,
} from '@nostr-post/plugin-date';
import { html, type TemplateResult } from 'lit';
import type { FeedMessages } from './feedMessages';
import { renderMonthGrid } from './feedMonth';
import type { FeedThread } from './feedStandard';
import { type FeedThreadContext, renderFeedThread } from './feedThread';

export interface FeedAgendaOptions {
  /** Window the buttons show and move */
  window: AgendaWindow;
  /** Window the threads were loaded for; while the next one loads, its days stay shown */
  shownWindow?: AgendaWindow;
  loading: boolean;
  /** Month view: the window is a month, shown as a grid above the list */
  month?: boolean;
  messages: FeedMessages;
  /** Show the window starting at `from` (`YYYY-MM-DD`; undefined: today) */
  onMove: (from: string | undefined) => void;
}

/** The first day of the window `steps` windows (or months) on */
const shifted = (window: AgendaWindow, steps: number, month?: boolean): string =>
  month ? `${shiftMonth(monthOf(window.from, window.tzid), steps)}-01` : shiftWindow(window, steps);

const renderAgendaNav = ({
  window,
  loading,
  month,
  messages,
  onMove,
}: FeedAgendaOptions): TemplateResult => html`
  <nav class="agenda-nav" aria-label=${messages.agendaNavigation}>
    <button type="button" @click=${() => onMove(shifted(window, -1, month))}>
      ‹ ${messages.previous}
    </button>
    <button type="button" @click=${() => onMove(undefined)}>${messages.today}</button>
    <button type="button" @click=${() => onMove(shifted(window, 1, month))}>
      ${messages.next} ›
    </button>
    <span class="agenda-range"
      >${month ? formatMonth(monthOf(window.from, window.tzid)) : formatWindowRange(window)}</span
    >
    <span class="agenda-loading" role="status">${loading ? messages.loading : ''}</span>
  </nav>
`;

export const renderFeedAgenda = (
  threads: FeedThread[],
  ctx: FeedThreadContext,
  options: FeedAgendaOptions
): TemplateResult => {
  const { shownWindow, loading, messages } = options;
  const threadByRoot = new Map(threads.map((thread) => [thread.root, thread]));
  const days = shownWindow
    ? groupEventsByDay(
        threads.map((thread) => thread.root),
        shownWindow
      )
    : [];
  // An event spanning several days opens its reply composer only on its first day
  const shown = new Set<FeedThread>();
  const renderOnce = (thread: FeedThread) => {
    const again = shown.has(thread);
    shown.add(thread);
    return renderFeedThread(thread, again ? { ...ctx, activeReplyTarget: undefined } : ctx);
  };

  return html`
    ${renderAgendaNav(options)}
    ${
      options.month && shownWindow
        ? renderMonthGrid(
            threads.map((thread) => thread.root),
            shownWindow,
            messages
          )
        : ''
    }
    <div class="agenda-days ${loading ? 'stale' : ''}" aria-busy=${loading ? 'true' : 'false'}>
      ${
        days.length === 0
          ? loading
            ? ''
            : html`<div class="empty">${messages.emptyAgenda}</div>`
          : days.map(
              ({ date, events }) => html`
                <section class="agenda-day" data-date=${date}>
                  <h3 class="agenda-date">${formatAgendaDate(date)}</h3>
                  ${events.map((event) => {
                    const thread = threadByRoot.get(event);
                    return thread ? renderOnce(thread) : '';
                  })}
                </section>
              `
            )
      }
    </div>
  `;
};
