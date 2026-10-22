/**
 * <nostr-post-feed agenda>: calendar events under day headings. Which events go on which day
 * is @nostr-post/plugin-date's `groupEventsByDay`; this module only renders it.
 */

import { type AgendaWindow, formatAgendaDate, groupEventsByDay } from '@nostr-post/plugin-date';
import { html, type TemplateResult } from 'lit';
import type { FeedThread } from './feedStandard';
import { type FeedThreadContext, renderFeedThread } from './feedThread';

export const renderFeedAgenda = (
  threads: FeedThread[],
  window: AgendaWindow,
  ctx: FeedThreadContext,
  emptyText: string
): TemplateResult => {
  const threadByRoot = new Map(threads.map((thread) => [thread.root, thread]));
  const days = groupEventsByDay(
    threads.map((thread) => thread.root),
    window
  );
  if (days.length === 0) return html`<div class="empty">${emptyText}</div>`;

  return html`${days.map(
    ({ date, events }) => html`
      <section class="agenda-day">
        <h3 class="agenda-date">${formatAgendaDate(date)}</h3>
        ${events.map((event) => {
          const thread = threadByRoot.get(event);
          return thread ? renderFeedThread(thread, ctx) : '';
        })}
      </section>
    `
  )}`;
};
