/**
 * @nostr-post/plugin-date - How a value reads
 *
 * A timed value reads in its own zone (an event's `start_tzid`: the venue's time for every
 * reader), with the viewer's time next to it when their zone is another. A value without a zone
 * (e.g. an event from a client that leaves `start_tzid` out) can only be read in the viewer's
 * zone, and says so. No DOM dependencies.
 */

import { type DateValue, defaultTimeZone, hasTime, wallToUnix } from './dateValue';

/** A moment (or a calendar date, `zone` undefined) as text in the locale */
const formatMoment = (
  wall: string,
  zone: string,
  locale: string | undefined,
  displayZone = zone
): string => {
  if (!hasTime(wall)) {
    const unix = wallToUnix(wall, 'UTC');
    return unix === undefined
      ? wall
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
          new Date(unix * 1000)
        );
  }
  const unix = wallToUnix(wall, zone);
  return unix === undefined
    ? wall
    : new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: displayZone,
      }).format(new Date(unix * 1000));
};

/** A value's start and end as text, read in `displayZone` (default: its own zone) */
export const formatValueIn = (value: DateValue, locale?: string, displayZone?: string): string => {
  const zone = value.tzid ?? defaultTimeZone();
  const start = formatMoment(value.start, zone, locale, displayZone ?? zone);
  return value.end
    ? `${start} – ${formatMoment(value.end, zone, locale, displayZone ?? zone)}`
    : start;
};

/** What a date view shows */
export interface DateDisplay {
  /** The value in its own zone, e.g. "Nov 20, 2026, 7:00 PM – Nov 20, 2026, 10:00 PM" */
  text: string;
  /** Its zone (`Europe/Berlin`); undefined for calendar dates and values without one */
  zone?: string;
  /** `zone` was guessed from the place (`DateValue.zoneGuessed`) */
  zoneGuessed?: boolean;
  /** A timed value without a zone: `text` is in the viewer's zone */
  inViewerZone: boolean;
  /** The same moments in the viewer's zone, when theirs is another */
  viewerText?: string;
}

/** How a value reads for a viewer in `viewerZone` (default: the runtime's zone) */
export const dateDisplay = (
  value: DateValue,
  { locale, viewerZone = defaultTimeZone() }: { locale?: string; viewerZone?: string } = {}
): DateDisplay => {
  if (!hasTime(value.start)) return { text: formatValueIn(value, locale), inViewerZone: false };
  if (!value.tzid) {
    return {
      text: formatValueIn({ ...value, tzid: viewerZone }, locale),
      inViewerZone: true,
    };
  }
  const text = formatValueIn(value, locale);
  const viewerText = formatValueIn(value, locale, viewerZone);
  // Another zone with the same clock (e.g. Europe/Paris for Europe/Berlin) needs no second line
  const zone = { zone: value.tzid, ...(value.zoneGuessed ? { zoneGuessed: true } : {}) };
  return viewerText === text
    ? { text, ...zone, inViewerZone: false }
    : { text, ...zone, inViewerZone: false, viewerText };
};
