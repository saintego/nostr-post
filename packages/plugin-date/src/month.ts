/**
 * @nostr-post/plugin-date - Months
 *
 * A month as an agenda window and as a grid of weeks, for a calendar view. Uses the agenda's
 * window and day grouping (`groupEventsByDay`). No DOM dependencies.
 */

import { type AgendaWindow, todayIn } from './agenda';
import { dateOfDayNumber, dayNumberOfDate, defaultTimeZone } from './dateValue';

/** What `Intl.Locale` says about weeks (`getWeekInfo()` in newer runtimes, `weekInfo` before) */
type LocaleWeeks = { getWeekInfo?: () => { firstDay?: number }; weekInfo?: { firstDay?: number } };

/**
 * The first day of the week in a locale (default: the viewer's): 0 Sunday … 6 Saturday, e.g.
 * 0 in the US, 1 in most of Europe. Monday where the runtime doesn't say.
 */
export const weekStartOf = (locale?: string): number => {
  try {
    const intl = new Intl.Locale(locale ?? Intl.DateTimeFormat().resolvedOptions().locale);
    const weeks = intl as unknown as LocaleWeeks;
    const firstDay = (weeks.getWeekInfo?.() ?? weeks.weekInfo)?.firstDay;
    // Intl counts 1 Monday … 7 Sunday
    return typeof firstDay === 'number' ? firstDay % 7 : 1;
  } catch {
    return 1;
  }
};

/** `YYYY-MM` of a date (`YYYY-MM-DD`), or of today */
export const monthOf = (date?: string, tzid = defaultTimeZone()): string =>
  (date && /^\d{4}-\d{2}/.test(date) ? date : todayIn(tzid)).slice(0, 7);

const daysInMonth = (month: string): number => {
  const [year = 1970, mon = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
};

/** The agenda window of a month (`YYYY-MM`) */
export const monthWindow = (month: string, tzid?: string): AgendaWindow => ({
  from: `${month}-01`,
  days: daysInMonth(month),
  ...(tzid ? { tzid } : {}),
});

/** The month `steps` months after `month` (negative: before) */
export const shiftMonth = (month: string, steps: number): string => {
  const [year = 1970, mon = 1] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + steps, 1));
  return date.toISOString().slice(0, 7);
};

/**
 * The month's weeks, each 7 dates (`YYYY-MM-DD`) from `weekStart` (0 Sunday … 6 Saturday;
 * default the viewer's locale's); the first and last week include days of the months around it
 */
export const monthGrid = (month: string, weekStart = weekStartOf()): string[][] => {
  const first = dayNumberOfDate(`${month}-01`) ?? 0;
  const last = first + daysInMonth(month) - 1;
  // Unix day 0 (1970-01-01) was a Thursday (weekday 4)
  const weekday = (day: number) => (((day + 4) % 7) + 7) % 7;
  const start = first - ((weekday(first) - weekStart + 7) % 7);
  const weeks: string[][] = [];
  for (let day = start; day <= last; day += 7) {
    weeks.push(Array.from({ length: 7 }, (_, i) => dateOfDayNumber(day + i)));
  }
  return weeks;
};

/** A month's name in the locale, e.g. "October 2026" */
export const formatMonth = (month: string, locale?: string): string => {
  const [year = 1970, mon = 1] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, mon - 1, 1)));
};

/** Short weekday names from `weekStart` (default the locale's), e.g. ["Mon", …, "Sun"] */
export const weekdayNames = (weekStart = weekStartOf(), locale?: string): string[] => {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  // 2026-06-01 was a Monday
  return Array.from({ length: 7 }, (_, i) =>
    format.format(new Date(Date.UTC(2026, 5, 1 + ((weekStart + 6 + i) % 7))))
  );
};
