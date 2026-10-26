/**
 * @nostr-post/calendar - What an agenda asks relays for
 *
 * A date window's events by their `D` day tags, or a calendar's events by address (so also
 * all-day events of clients that write no `D` tags). No DOM dependencies.
 */

import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from '@nostr-post/plugin-date';
import type { FetchFilter } from '@nostr-post/signer';
import { type AgendaWindow, agendaDayTags } from './agenda';
import { calendarEventFilters } from './calendars';

/** Events asked for at most: enough for a whole window */
export const AGENDA_LIMIT = 500;

export interface AgendaQuery {
  window: AgendaWindow;
  /** Default 31922 and 31923 */
  kinds?: number[];
  authors?: string[];
  /** e.g. `{ '#g': ['u09t'], '#t': ['punk'] }`: an area, a genre */
  tagFilters?: Record<string, string[]>;
  /** A calendar's event addresses (`fetchCalendarItems`): asked for by address instead */
  calendarItems?: string[];
  limit?: number;
}

/** The relay filters of an agenda; none for an empty calendar */
export const agendaFilters = (query: AgendaQuery): FetchFilter[] => {
  if (query.calendarItems) return calendarEventFilters(query.calendarItems);
  const filter: FetchFilter = {
    kinds: query.kinds?.length ? query.kinds : [ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND],
    limit: query.limit ?? AGENDA_LIMIT,
    ...(query.authors?.length ? { authors: query.authors } : {}),
  };
  for (const [tag, values] of Object.entries(query.tagFilters ?? {})) {
    if (tag.startsWith('#') && values.length > 0) filter[tag as `#${string}`] = values;
  }
  filter['#D'] = agendaDayTags(query.window);
  return [filter];
};
