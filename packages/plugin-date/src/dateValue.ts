/**
 * @nostr-post/plugin-date - Date values and their Nostr forms
 *
 * A date field's value is wall-clock time plus a time zone, so it survives switching
 * between all-day and timed publishing. It is written as a calendar date (`YYYY-MM-DD`)
 * or as unix seconds, depending on the field's precision. No DOM dependencies.
 */

/** A date field's value */
export interface DateValue {
  /** `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` with a time */
  start: string;
  /** Same form as `start`. For all-day ranges the last day, inclusive */
  end?: string;
  /** IANA time zone of the wall-clock times, e.g. `Europe/Prague`. Default: the viewer's */
  tzid?: string;
}

/** `day`: a calendar date; `time`: a moment in time (unix seconds) */
export type DatePrecision = 'day' | 'time';

const SECONDS_PER_DAY = 86400;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const UNIX_PATTERN = /^\d+$/;

/** Most `D` tags one event gets (a year), so a long event doesn't make a huge event */
export const MAX_DAY_TAGS = 366;

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

const parseWall = (wall: string): WallParts | undefined => {
  const match = DATE_TIME_PATTERN.exec(wall) ?? DATE_PATTERN.exec(wall);
  if (!match) return undefined;
  const [, year, month, day, hour = '0', minute = '0'] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
  // Reject dates that roll over, e.g. 2026-02-30
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (check.getUTCMonth() !== parts.month - 1 || check.getUTCDate() !== parts.day) return undefined;
  if (parts.hour > 23 || parts.minute > 59) return undefined;
  return parts;
};

const wallAsUtcSeconds = (parts: WallParts): number =>
  Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) / 1000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const wallFormatter = (tzid: string): Intl.DateTimeFormat | undefined => {
  const cached = formatterCache.get(tzid);
  if (cached) return cached;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzid,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(tzid, formatter);
    return formatter;
  } catch {
    return undefined;
  }
};

/** Whether the runtime knows the IANA time zone */
export const isValidTimeZone = (tzid: string): boolean => wallFormatter(tzid) !== undefined;

/** The viewer's time zone, UTC when the runtime doesn't say */
export const defaultTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** A value's time zone: its own, else the viewer's (what the date input shows) */
export const valueTimeZone = (value: DateValue): string => value.tzid ?? defaultTimeZone();

const wallPartsAt = (unix: number, tzid: string): WallParts | undefined => {
  const formatter = wallFormatter(tzid);
  if (!formatter) return undefined;
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(new Date(unix * 1000))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
  };
};

/** The time zone's offset from UTC at a moment, in seconds */
const offsetAt = (unix: number, tzid: string): number | undefined => {
  const parts = wallPartsAt(unix, tzid);
  // wallPartsAt drops seconds; the moments compared here are whole minutes
  return parts ? wallAsUtcSeconds(parts) - unix : undefined;
};

/** Unix seconds of a wall-clock time (`YYYY-MM-DD[THH:mm]`) in a time zone */
export const wallToUnix = (wall: string, tzid = 'UTC'): number | undefined => {
  const parts = parseWall(wall);
  if (!parts) return undefined;
  const asUtc = wallAsUtcSeconds(parts);
  const firstOffset = offsetAt(asUtc, tzid);
  if (firstOffset === undefined) return undefined;
  // Second pass: the offset at the guessed moment can differ around a DST switch
  const secondOffset = offsetAt(asUtc - firstOffset, tzid) ?? firstOffset;
  return asUtc - secondOffset;
};

/** Wall-clock time (`YYYY-MM-DDTHH:mm`) of a moment in a time zone */
export const unixToWall = (unix: number, tzid = 'UTC'): string | undefined => {
  const parts = wallPartsAt(unix, tzid);
  if (!parts) return undefined;
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

/** The calendar date part of a wall-clock value */
const datePart = (wall: string): string => wall.slice(0, 10);

/** Whether a wall-clock value has a time of day */
export const hasTime = (wall: string): boolean => DATE_TIME_PATTERN.test(wall);

/** A wall-clock value in the form of a precision: date only, or with a time (midnight if none) */
export const wallForPrecision = (wall: string, precision: DatePrecision): string =>
  precision === 'day' ? datePart(wall) : hasTime(wall) ? wall : `${datePart(wall)}T00:00`;

/** Unix day number of a calendar date (days since 1970-01-01), as NIP-52 `D` tags count */
export const dayNumberOfDate = (date: string): number | undefined => {
  const parts = parseWall(date);
  return parts ? Math.floor(wallAsUtcSeconds(parts) / SECONDS_PER_DAY) : undefined;
};

/** `YYYY-MM-DD` of a unix day number */
export const dateOfDayNumber = (day: number): string =>
  new Date(day * SECONDS_PER_DAY * 1000).toISOString().slice(0, 10);

/** A wall-clock value as stored at a precision: `YYYY-MM-DD`, or unix seconds as a string */
export const serializeWall = (
  wall: string,
  precision: DatePrecision,
  tzid?: string
): string | undefined => {
  if (!parseWall(wall)) return undefined;
  if (precision === 'day') return datePart(wall);
  const unix = wallToUnix(wall, tzid);
  return unix === undefined ? undefined : String(unix);
};

/**
 * The tag value of an all-day range's end. NIP-52 all-day ends are exclusive (the day
 * after the last day); the value keeps the last day, as people enter it.
 */
export const serializeAllDayEnd = (end: string): string | undefined => {
  const day = dayNumberOfDate(datePart(end));
  return day === undefined ? undefined : dateOfDayNumber(day + 1);
};

/** Reads a stored `start`/`end` value back: a date stays a date, unix seconds become wall time */
export const parseStoredDate = (raw: string, tzid?: string): string | undefined => {
  const trimmed = raw.trim();
  if (DATE_PATTERN.test(trimmed)) return parseWall(trimmed) ? trimmed : undefined;
  if (UNIX_PATTERN.test(trimmed)) return unixToWall(Number(trimmed), tzid ?? defaultTimeZone());
  return undefined;
};

/** Reads a stored all-day end (exclusive) back as the last day of the range */
export const parseStoredAllDayEnd = (raw: string): string | undefined => {
  const day = dayNumberOfDate(raw.trim());
  return day === undefined ? undefined : dateOfDayNumber(day - 1);
};

const dayRange = (first: number, last: number): string[] => {
  const days: string[] = [];
  for (let day = first; day <= last && days.length < MAX_DAY_TAGS; day++) days.push(String(day));
  return days;
};

/**
 * NIP-52 `D` tag values: the unix day numbers the value covers. At day precision the
 * calendar dates themselves; at time precision the UTC days from start to end.
 */
export const dayNumbers = (value: DateValue, precision: DatePrecision): string[] => {
  if (precision === 'day') {
    const first = dayNumberOfDate(datePart(value.start));
    if (first === undefined) return [];
    const last = value.end ? dayNumberOfDate(datePart(value.end)) : undefined;
    return dayRange(first, Math.max(first, last ?? first));
  }
  const start = wallToUnix(value.start, valueTimeZone(value));
  if (start === undefined) return [];
  const end = value.end ? wallToUnix(value.end, valueTimeZone(value)) : undefined;
  const first = Math.floor(start / SECONDS_PER_DAY);
  // An end at midnight doesn't cover the day it starts
  const last = end !== undefined && end > start ? Math.floor((end - 1) / SECONDS_PER_DAY) : first;
  return dayRange(first, last);
};

/** Whether a value is a well-formed DateValue (dates exist, time zone known) */
export const isDateValue = (value: unknown): value is DateValue => {
  if (typeof value !== 'object' || value === null) return false;
  const { start, end, tzid } = value as Record<string, unknown>;
  if (typeof start !== 'string' || !parseWall(start)) return false;
  if (end !== undefined && (typeof end !== 'string' || !parseWall(end))) return false;
  if (tzid !== undefined && (typeof tzid !== 'string' || !isValidTimeZone(tzid))) return false;
  return true;
};

/** Whether the value's end comes before its start, compared at the precision */
export const endsBeforeStart = (value: DateValue, precision: DatePrecision): boolean => {
  if (!value.end) return false;
  if (precision === 'day') return datePart(value.end) < datePart(value.start);
  const start = wallToUnix(value.start, valueTimeZone(value));
  const end = wallToUnix(value.end, valueTimeZone(value));
  return start !== undefined && end !== undefined && end < start;
};
