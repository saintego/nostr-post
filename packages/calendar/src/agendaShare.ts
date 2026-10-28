/**
 * @nostr-post/calendar - An agenda to share
 *
 * The events of a window as a short summary, day by day, e.g. "this week's gigs in Bangkok":
 * as text for a message (`agendaText`), or as lines an image is drawn from (`agendaSummary`,
 * see `agendaImage` in '@nostr-post/calendar/web'). No DOM dependencies.
 */

import { defaultTimeZone } from '@nostr-post/plugin-date';
import {
  type AgendaWindow,
  type CalendarEventLike,
  eventTimeZone,
  formatWindowRange,
  groupEventsByDay,
} from './agenda';
import { agendaItem } from './agendaItem';

/** One day of a shared agenda */
export interface SummaryDay {
  /** `YYYY-MM-DD` */
  date: string;
  /** The day in the locale, short, e.g. "Fri, Oct 31" */
  label: string;
  items: { time?: string; title: string; place?: string }[];
}

export interface AgendaSummary {
  /** The window's dates, e.g. "Oct 27 – Nov 2, 2026" */
  range: string;
  days: SummaryDay[];
  /** Events left out by `maxItems` */
  more: number;
}

export interface AgendaSummaryOptions {
  locale?: string;
  /** At most this many events (rows) */
  maxItems?: number;
}

const dayLabel = (date: string, locale?: string): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

/** The window's events by day (versions of an event once; days without events left out) */
export const agendaSummary = (
  events: CalendarEventLike[],
  window: AgendaWindow,
  { locale, maxItems = Number.POSITIVE_INFINITY }: AgendaSummaryOptions = {}
): AgendaSummary => {
  const zoned = { ...window, tzid: window.tzid ?? defaultTimeZone() };
  let left = maxItems;
  let more = 0;
  const days: SummaryDay[] = [];
  for (const day of groupEventsByDay(events, zoned)) {
    const items = day.events
      .map((event) => agendaItem(event, day.date, eventTimeZone(event, zoned)))
      .filter((item) => !item.continued)
      .map(({ time, title, place }) => ({
        ...(time ? { time } : {}),
        title,
        ...(place ? { place } : {}),
      }));
    const shown = items.slice(0, Math.max(left, 0));
    more += items.length - shown.length;
    left -= shown.length;
    if (shown.length)
      days.push({ date: day.date, label: dayLabel(day.date, locale), items: shown });
  }
  return { range: formatWindowRange(zoned, locale), days, more };
};

export interface AgendaTextOptions extends AgendaSummaryOptions {
  /** The first line, e.g. "Metal gigs in Bangkok" */
  title?: string;
  /** The last line: where to see it all */
  link?: string;
  /** Text for `more` events left out; default "+N more" */
  moreText?: (count: number) => string;
  /** Text when there are no events; default "Nothing yet" */
  emptyText?: string;
}

/** The window's events as a message: title and dates, a line per event by day, the link */
export const agendaText = (
  events: CalendarEventLike[],
  window: AgendaWindow,
  options: AgendaTextOptions = {}
): string => {
  const { title, link, moreText = (n) => `+${n} more`, emptyText = 'Nothing yet' } = options;
  const summary = agendaSummary(events, window, options);
  const lines = [title ? `${title}, ${summary.range}` : summary.range, ''];
  for (const day of summary.days) {
    lines.push(day.label);
    for (const item of day.items) {
      const when = item.time ? `${item.time} ` : '';
      lines.push(`• ${when}${item.title}${item.place ? ` @ ${item.place}` : ''}`);
    }
    lines.push('');
  }
  if (!summary.days.length) lines.push(emptyText, '');
  if (summary.more) lines.push(moreText(summary.more), '');
  if (link) lines.push(link);
  return lines.join('\n').trim();
};
