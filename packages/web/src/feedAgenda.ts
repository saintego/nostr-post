/**
 * <nostr-post-feed agenda>: calendar events under day headings, with buttons to move the date
 * window. Which events go on which day is @nostr-post/plugin-date's `groupEventsByDay`; this
 * module only renders it.
 */

import {
  type AgendaWindow,
  formatAgendaDate,
  formatWindowRange,
  groupEventsByDay,
  shiftWindow,
} from '@nostr-post/plugin-date';
import { html, type TemplateResult } from 'lit';
import type { FeedMessages } from './feedMessages';
import type { FeedThread } from './feedStandard';
import { type FeedThreadContext, renderFeedThread } from './feedThread';

export interface FeedAgendaOptions {
  /** Window the buttons show and move */
  window: AgendaWindow;
  /** Window the threads were loaded for; while the next one loads, its days stay shown */
  shownWindow?: AgendaWindow;
  loading: boolean;
  messages: FeedMessages;
  /** Show the window starting at `from` (`YYYY-MM-DD`; undefined: today) */
  onMove: (from: string | undefined) => void;
}

const renderAgendaNav = ({
  window,
  loading,
  messages,
  onMove,
}: FeedAgendaOptions): TemplateResult => html`
  <nav class="agenda-nav" aria-label=${messages.agendaNavigation}>
    <button type="button" @click=${() => onMove(shiftWindow(window, -1))}>
      ‹ ${messages.previous}
    </button>
    <button type="button" @click=${() => onMove(undefined)}>${messages.today}</button>
    <button type="button" @click=${() => onMove(shiftWindow(window, 1))}>
      ${messages.next} ›
    </button>
    <span class="agenda-range">${formatWindowRange(window)}</span>
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
    <div class="agenda-days ${loading ? 'stale' : ''}" aria-busy=${loading ? 'true' : 'false'}>
      ${
        days.length === 0
          ? loading
            ? ''
            : html`<div class="empty">${messages.emptyAgenda}</div>`
          : days.map(
              ({ date, events }) => html`
                <section class="agenda-day">
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
