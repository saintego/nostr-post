/**
 * @nostr-post/plugin-date - Agenda
 *
 * NIP-52 calendar events by day: the relay filter for a date window (`#D` day tags) and the
 * events of each day of the window, in the viewer's time zone. Works on any window, so an
 * agenda list and a month grid share it. No DOM dependencies.
 */

import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from './core';
import {
  dateOfDayNumber,
  dayNumberOfDate,
  defaultTimeZone,
  MAX_DAY_TAGS,
  unixToWall,
  wallToUnix,
} from './dateValue';

const SECONDS_PER_DAY = 86400;
const UNIX_PATTERN = /^\d+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Days shown by default */
export const DEFAULT_AGENDA_DAYS = 30;

/** A date window: `days` calendar days from `from` (`YYYY-MM-DD`) in a time zone */
export interface AgendaWindow {
  /** First day, `YYYY-MM-DD`. Default: today in the time zone */
  from?: string;
  /** Number of days, 1–366. Default: DEFAULT_AGENDA_DAYS */
  days?: number;
  /** IANA time zone the days are in. Default: the viewer's */
  tzid?: string;
}

/** The parts of an event the agenda reads (a signed Nostr event fits) */
export interface CalendarEventLike {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
}

/** When an event takes place */
export interface EventTiming {
  allDay: boolean;
  /** All-day: the first date, `YYYY-MM-DD`; timed: unix seconds as a string */
  start: string;
  /** Unix seconds of the start (all-day: midnight UTC of the first date), for sorting */
  startUnix: number;
  /** All-day: the last date (inclusive); timed: unix seconds of the end (start if none) */
  endUnix: number;
  lastDate?: string;
}

export interface AgendaDay<T> {
  /** `YYYY-MM-DD` in the window's time zone */
  date: string;
  events: T[];
}

const tagValue = (tags: string[][], name: string): string | undefined =>
  tags.find((tag) => tag[0] === name)?.[1]?.trim();

/** Today's date (`YYYY-MM-DD`) in a time zone */
export const todayIn = (tzid = defaultTimeZone(), now = Date.now()): string =>
  (unixToWall(Math.floor(now / 1000), tzid) ?? new Date(now).toISOString()).slice(0, 10);

const resolveWindow = (window: AgendaWindow) => {
  const tzid = window.tzid ?? defaultTimeZone();
  const from = window.from && DATE_PATTERN.test(window.from) ? window.from : todayIn(tzid);
  const days = Math.min(Math.max(Math.floor(window.days ?? DEFAULT_AGENDA_DAYS), 1), MAX_DAY_TAGS);
  const first = dayNumberOfDate(from) ?? dayNumberOfDate(todayIn(tzid)) ?? 0;
  return { tzid, first, last: first + days - 1 };
};

/** The window's dates, `YYYY-MM-DD`, first to last */
export const windowDates = (window: AgendaWindow): string[] => {
  const { first, last } = resolveWindow(window);
  const dates: string[] = [];
  for (let day = first; day <= last; day++) dates.push(dateOfDayNumber(day));
  return dates;
};

/**
 * `D` tag values to ask relays for: the UTC days the window's local days touch (timed events
 * are tagged by UTC day), plus the window's own calendar dates (all-day events by date).
 */
export const agendaDayTags = (window: AgendaWindow): string[] => {
  const { tzid, first, last } = resolveWindow(window);
  const startUnix = wallToUnix(dateOfDayNumber(first), tzid);
  const endUnix = wallToUnix(dateOfDayNumber(last + 1), tzid);
  const utcFirst = startUnix === undefined ? first : Math.floor(startUnix / SECONDS_PER_DAY);
  const utcLast = endUnix === undefined ? last : Math.floor((endUnix - 1) / SECONDS_PER_DAY);
  const tags: string[] = [];
  for (let day = Math.min(first, utcFirst); day <= Math.max(last, utcLast); day++) {
    tags.push(String(day));
  }
  return tags;
};

/** Relay filter for the calendar events of a window */
export const agendaFilter = (
  window: AgendaWindow,
  kinds: number[] = [ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND]
): { kinds: number[]; '#D': string[] } => ({ kinds, '#D': agendaDayTags(window) });

/** When an event takes place, from its `start`/`end` tags; undefined without a valid start */
export const eventTiming = (event: CalendarEventLike): EventTiming | undefined => {
  const start = tagValue(event.tags, 'start');
  if (!start) return undefined;
  const end = tagValue(event.tags, 'end');
  if (event.kind !== TIMED_EVENT_KIND && DATE_PATTERN.test(start)) {
    const firstDay = dayNumberOfDate(start);
    if (firstDay === undefined) return undefined;
    // NIP-52 all-day ends are exclusive
    const endDay = end && DATE_PATTERN.test(end) ? dayNumberOfDate(end) : undefined;
    const lastDay = endDay !== undefined && endDay > firstDay ? endDay - 1 : firstDay;
    return {
      allDay: true,
      start,
      startUnix: firstDay * SECONDS_PER_DAY,
      endUnix: (lastDay + 1) * SECONDS_PER_DAY,
      lastDate: dateOfDayNumber(lastDay),
    };
  }
  if (!UNIX_PATTERN.test(start)) return undefined;
  const startUnix = Number(start);
  const endUnix = end && UNIX_PATTERN.test(end) ? Math.max(Number(end), startUnix) : startUnix;
  return { allDay: false, start, startUnix, endUnix };
};

/** The dates (`YYYY-MM-DD`, in the time zone for timed events) an event takes place on */
export const eventDates = (timing: EventTiming, tzid = defaultTimeZone()): string[] => {
  const firstDate = timing.allDay ? timing.start : unixToWall(timing.startUnix, tzid);
  // An end at midnight doesn't reach into that day
  const lastMoment = Math.max(timing.startUnix, timing.endUnix - 1);
  const lastDate = timing.allDay ? timing.lastDate : unixToWall(lastMoment, tzid);
  const first = firstDate ? dayNumberOfDate(firstDate.slice(0, 10)) : undefined;
  const last = lastDate ? dayNumberOfDate(lastDate.slice(0, 10)) : undefined;
  if (first === undefined) return [];
  const dates: string[] = [];
  for (let day = first; day <= Math.max(first, last ?? first); day++) {
    dates.push(dateOfDayNumber(day));
    if (dates.length >= MAX_DAY_TAGS) break;
  }
  return dates;
};

/** Newest version of each addressable event (`kind:pubkey:d`); others pass as they are */
export const latestByAddress = <T extends CalendarEventLike>(events: T[]): T[] => {
  const latest = new Map<string, T>();
  const order: string[] = [];
  events.forEach((event, index) => {
    const dTag = event.kind >= 30000 && event.kind < 40000 ? tagValue(event.tags, 'd') : undefined;
    const key = dTag === undefined ? `#${index}` : `${event.kind}:${event.pubkey}:${dTag}`;
    const existing = latest.get(key);
    if (!existing) order.push(key);
    if (!existing || event.created_at > existing.created_at) latest.set(key, event);
  });
  return order.flatMap((key) => latest.get(key) ?? []);
};

/**
 * The window's days that have events, each with its events: all-day ones first, then by start.
 * An event spanning several days is listed on each of them; versions of one event count once.
 */
export const groupEventsByDay = <T extends CalendarEventLike>(
  events: T[],
  window: AgendaWindow
): AgendaDay<T>[] => {
  const tzid = window.tzid ?? defaultTimeZone();
  const dates = windowDates(window);
  const byDate = new Map<string, { event: T; timing: EventTiming }[]>(
    dates.map((date) => [date, []])
  );
  for (const event of latestByAddress(events)) {
    const timing = eventTiming(event);
    if (!timing) continue;
    for (const date of eventDates(timing, tzid)) byDate.get(date)?.push({ event, timing });
  }
  return dates.flatMap((date) => {
    const entries = byDate.get(date) ?? [];
    if (entries.length === 0) return [];
    entries.sort(
      (a, b) =>
        Number(b.timing.allDay) - Number(a.timing.allDay) || a.timing.startUnix - b.timing.startUnix
    );
    return [{ date, events: entries.map((entry) => entry.event) }];
  });
};

/** A day heading in the locale, e.g. "Wednesday, October 21, 2026" */
export const formatAgendaDate = (date: string, locale?: string): string => {
  const day = dayNumberOfDate(date);
  return day === undefined
    ? date
    : new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(
        new Date(day * SECONDS_PER_DAY * 1000)
      );
};
