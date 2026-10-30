/**
 * The month view of <nostr-calendar-agenda>: a grid of weeks with each day's event titles,
 * above the month's list. A day with events jumps to its place in the list.
 */

import { html, nothing, type TemplateResult } from 'lit';
import { type AgendaWindow, type CalendarEventLike, groupEventsByDay, todayIn } from '../agenda';
import { monthGrid, monthOf, weekdayNames, weekStartOf } from '../month';
import type { AgendaMessages } from './agendaMessages';

/** Titles shown in a day's cell before "+n more" */
const TITLES_PER_DAY = 3;

const titleOf = (event: CalendarEventLike): string =>
  event.tags.find((tag) => tag[0] === 'title')?.[1] ?? '…';

/** Scrolls the agenda list to a day's heading (in the feed's shadow root) */
const showDay = (e: Event, date: string) => {
  const root = (e.currentTarget as Element).getRootNode() as ShadowRoot | Document;
  root.querySelector(`[data-date="${date}"]`)?.scrollIntoView({ behavior: 'smooth' });
};

export const renderMonthGrid = (
  events: CalendarEventLike[],
  window: AgendaWindow,
  messages: AgendaMessages
): TemplateResult => {
  const month = monthOf(window.from, window.tzid);
  const byDate = new Map(groupEventsByDay(events, window).map((day) => [day.date, day.events]));
  const today = todayIn(window.tzid);
  // Weeks start where the viewer's locale starts them (Monday or Sunday, …)
  const weekStart = weekStartOf();
  return html`
    <table class="month-grid">
      <thead>
        <tr>
          ${weekdayNames(weekStart).map((name) => html`<th scope="col">${name}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${monthGrid(month, weekStart).map(
          (week) => html`<tr>
            ${week.map((date) => {
              const dayEvents = byDate.get(date) ?? [];
              const outside = !date.startsWith(month);
              const classes = [outside ? 'outside' : '', date === today ? 'today' : '']
                .filter(Boolean)
                .join(' ');
              return html`<td class=${classes}>
                ${
                  dayEvents.length > 0
                    ? html`<button type="button" class="day" @click=${(e: Event) => showDay(e, date)}>
                        <span class="day-number">${Number(date.slice(8))}</span>
                        ${dayEvents
                          .slice(0, TITLES_PER_DAY)
                          .map((event) => html`<span class="day-event">${titleOf(event)}</span>`)}
                        ${
                          dayEvents.length > TITLES_PER_DAY
                            ? html`<span class="day-more"
                                >${messages.moreEvents(dayEvents.length - TITLES_PER_DAY)}</span
                              >`
                            : nothing
                        }
                      </button>`
                    : html`<span class="day-number">${Number(date.slice(8))}</span>`
                }
              </td>`;
            })}
          </tr>`
        )}
      </tbody>
    </table>
  `;
};
