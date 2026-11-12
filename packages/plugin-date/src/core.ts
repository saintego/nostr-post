/**
 * @nostr-post/plugin-date - Core
 *
 * Date field plugin. On NIP-52 calendar events the precision follows the kind: all-day
 * events (kind 31922) store `YYYY-MM-DD` dates, timed events (kind 31923) unix seconds
 * plus `start_tzid`/`end_tzid`. Both get the `end` tag and one `D` tag per covered day.
 * NIP-52 defines `D` only for timed events; on all-day events it is an extra tag so relays
 * can return them by day too. On other kinds `metadata.precision` decides ('day' default).
 * No DOM dependencies — safe for SSR/Node.
 */

import type {
  NostrTarget,
  NostrUIPlugin,
  PostField,
  Result,
  ValidationError,
} from '@nostr-post/plugins/types';
import {
  type DatePrecision,
  type DateValue,
  dayNumbers,
  defaultTimeZone,
  endsBeforeStart,
  isDateValue,
  isValidTimeZone,
  parseStoredAllDayEnd,
  parseStoredDate,
  serializeAllDayEnd,
  serializeWall,
  valueTimeZone,
} from './dateValue';
import { formatValueIn } from './dateDisplay';
import { guessTimeZoneOfTags } from './zoneGuess';

/** NIP-52 date-based (all-day) calendar event */
export const ALL_DAY_EVENT_KIND = 31922;
/** NIP-52 time-based calendar event */
export const TIMED_EVENT_KIND = 31923;

const isCalendarKind = (kind: number | undefined): boolean =>
  kind === ALL_DAY_EVENT_KIND || kind === TIMED_EVENT_KIND;

const targetsOf = (field: PostField): NostrTarget[] =>
  Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];

/** The target the field writes: the first one of an active kind, else its first */
const activeTarget = (field: PostField, activeKinds?: number[]): NostrTarget | undefined => {
  const targets = targetsOf(field);
  return (activeKinds && targets.find((target) => activeKinds.includes(target.kind))) ?? targets[0];
};

/**
 * The precision a field is written at: from the calendar event kind it writes
 * (`activeKinds`: the composer's selected publish format), else `metadata.precision`.
 */
export const datePrecision = (field: PostField, activeKinds?: number[]): DatePrecision => {
  const kind = activeTarget(field, activeKinds)?.kind;
  if (kind === ALL_DAY_EVENT_KIND) return 'day';
  if (kind === TIMED_EVENT_KIND) return 'time';
  return field.metadata?.precision === 'time' ? 'time' : 'day';
};

/** Tags of a value besides its primary `start` tag, on calendar event kinds */
export const calendarExtraTags = (
  value: DateValue,
  precision: DatePrecision
): [string, ...string[]][] => {
  const tags: [string, ...string[]][] = [];
  const end = value.end
    ? precision === 'day'
      ? serializeAllDayEnd(value.end)
      : serializeWall(value.end, 'time', valueTimeZone(value))
    : undefined;
  if (end) tags.push(['end', end]);
  if (precision === 'time') {
    const tzid = valueTimeZone(value);
    tags.push(['start_tzid', tzid]);
    if (end) tags.push(['end_tzid', tzid]);
  }
  for (const day of dayNumbers(value, precision)) tags.push(['D', day]);
  return tags;
};

const tagValue = (tags: string[][], name: string): string | undefined =>
  tags.find((tag) => tag[0] === name)?.[1];

/**
 * A timed event's zone: its `start_tzid`; without one (other clients may leave it out) the zone
 * guessed from its place (`g`, `i iso3166:`), marked so; no guess: none, so it reads in the
 * viewer's zone and says so (`dateDisplay`)
 */
const timedZoneOfTags = (tags: string[][]): { tzid?: string; guessed?: boolean } => {
  const own = tagValue(tags, 'start_tzid');
  if (own && isValidTimeZone(own)) return { tzid: own };
  const guess = guessTimeZoneOfTags(tags);
  return guess ? { tzid: guess, guessed: true } : {};
};

/** A field's value from an event's tags: its own tag, plus `end` and time zones for `start` */
export const dateValueFromTags = (tags: string[][], tagName = 'start'): DateValue | undefined => {
  const rawStart = tagValue(tags, tagName);
  if (rawStart === undefined) return undefined;
  const allDay = !/^\d+$/.test(rawStart.trim());
  const { tzid, guessed } = allDay ? {} : timedZoneOfTags(tags);
  const readZone = allDay ? undefined : (tzid ?? defaultTimeZone());
  const start = parseStoredDate(rawStart, readZone);
  if (!start) return undefined;
  const value: DateValue = tzid
    ? { start, tzid, ...(guessed ? { zoneGuessed: true } : {}) }
    : { start };
  const rawEnd = tagName === 'start' ? tagValue(tags, 'end') : undefined;
  const end =
    rawEnd === undefined
      ? undefined
      : allDay
        ? parseStoredAllDayEnd(rawEnd)
        : // Shown in the start's zone: the value has one time zone
          parseStoredDate(rawEnd, readZone);
  return end ? { ...value, end } : value;
};

/** A value as text in the locale, in its own zone, e.g. "Oct 21, 2026, 7:00 PM – 9:00 PM" */
export const formatDateValue = (value: DateValue, locale?: string): string =>
  formatValueIn(value, locale);

const fieldError = (field: PostField, message: string, code: string): ValidationError => ({
  field: field.id,
  message,
  code,
});

// ── Plugin definition ───────────────────────────────────────────────

export const datePlugin: NostrUIPlugin = {
  id: 'date',
  type: 'date',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const tzid =
      typeof value === 'object' && value !== null ? Reflect.get(value, 'tzid') : undefined;
    if (typeof tzid === 'string' && !isValidTimeZone(tzid)) {
      return {
        success: false,
        error: fieldError(field, `Unknown time zone: ${tzid}`, 'INVALID_TIME_ZONE'),
      };
    }
    if (!isDateValue(value)) {
      return {
        success: false,
        error: fieldError(field, 'Date must be a valid date', 'INVALID_DATE'),
      };
    }
    if (endsBeforeStart(value, datePrecision(field))) {
      return {
        success: false,
        error: fieldError(field, 'End must not be before start', 'END_BEFORE_START'),
      };
    }
    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string => (isDateValue(value) ? formatDateValue(value) : ''),

  /** The primary tag: a date or unix seconds, depending on the kind written */
  serializeValue: (value: unknown, field?: PostField): string => {
    if (!isDateValue(value)) return '';
    const precision = field ? datePrecision(field) : 'day';
    return serializeWall(value.start, precision, valueTimeZone(value)) ?? '';
  },

  deserializeValue: (raw: string): unknown => {
    const start = parseStoredDate(raw);
    return start ? { start } : undefined;
  },

  extraTags: (value: unknown, field: PostField): [string, ...string[]][] => {
    if (!isDateValue(value)) return [];
    const target = activeTarget(field);
    if (!isCalendarKind(target?.kind) || target?.tagName !== 'start') return [];
    return calendarExtraTags(value, datePrecision(field));
  },

  resolveFromTags: (tags: string[][], field: PostField): unknown =>
    dateValueFromTags(tags, activeTarget(field)?.tagName),

  /** A DateValue, as JSON */
  jsonSchema: () => ({
    type: 'object',
    properties: {
      start: {
        type: 'string',
        description: 'YYYY-MM-DD, or YYYY-MM-DDTHH:mm when the time is known (wall-clock time)',
      },
      end: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'Same form as start; for whole days the last day',
      },
      tzid: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description:
          "IANA time zone of the place, e.g. America/Bogota: from the place's city or country when the text doesn't name a zone",
      },
    },
    required: ['start', 'end', 'tzid'],
    additionalProperties: false,
  }),
};
