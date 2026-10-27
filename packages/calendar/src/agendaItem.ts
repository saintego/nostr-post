/**
 * @nostr-post/calendar - An event as an agenda row
 *
 * What a compact agenda row shows of an event: its title, when on the day being listed, where,
 * and its topics. Plain values from the tags, so a long agenda stays cheap (the full event view
 * opens on demand). No DOM dependencies.
 */

import { defaultTimeZone, unixToWall } from '@nostr-post/plugin-date';
import { type CalendarEventLike, eventTiming } from './agenda';

export interface AgendaItem {
  /** `kind:pubkey:d-tag` */
  address: string;
  title: string;
  /** All day, or the start time on that day (`HH:mm` in the agenda's zone) */
  allDay: boolean;
  time?: string;
  /** The event started on an earlier day (a festival's second day) */
  continued: boolean;
  /** `location` tags, joined */
  place?: string;
  /** `t` tags */
  topics: string[];
}

const tagValues = (tags: string[][], name: string): string[] =>
  tags.flatMap((tag) => (tag[0] === name && tag[1] ? [tag[1]] : []));

/** The row of an event on `date` (`YYYY-MM-DD`) in an agenda shown in `tzid` */
export const agendaItem = (
  event: CalendarEventLike,
  date: string,
  tzid = defaultTimeZone()
): AgendaItem => {
  const d = tagValues(event.tags, 'd')[0] ?? '';
  const timing = eventTiming(event);
  const startWall = timing && !timing.allDay ? unixToWall(timing.startUnix, tzid) : undefined;
  const startDate = timing?.allDay ? timing.start : startWall?.slice(0, 10);
  const continued = startDate !== undefined && startDate < date;
  const places = tagValues(event.tags, 'location');
  return {
    address: `${event.kind}:${event.pubkey}:${d}`,
    title: tagValues(event.tags, 'title')[0] ?? tagValues(event.tags, 'name')[0] ?? d,
    allDay: timing?.allDay ?? false,
    ...(startWall && !continued ? { time: startWall.slice(11, 16) } : {}),
    continued,
    ...(places.length > 0 ? { place: places.join(', ') } : {}),
    topics: tagValues(event.tags, 't'),
  };
};
