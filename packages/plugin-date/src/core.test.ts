import type { PostField } from '@nostr-post/plugins/types';
import { describe, expect, it } from 'vitest';
import {
  ALL_DAY_EVENT_KIND,
  datePlugin,
  datePrecision,
  dateValueFromTags,
  formatDateValue,
  TIMED_EVENT_KIND,
} from './core';
import { defaultTimeZone, wallToUnix } from './dateValue';

const utc = (year: number, month: number, date: number, hour = 0) =>
  Date.UTC(year, month - 1, date, hour) / 1000;
const day = (year: number, month: number, date: number) => String(utc(year, month, date) / 86400);

const calendarField: PostField = {
  id: 'when',
  type: 'date',
  uiPlugin: 'date',
  mapTo: [
    { kind: ALL_DAY_EVENT_KIND, target: 'tag', tagName: 'start' },
    { kind: TIMED_EVENT_KIND, target: 'tag', tagName: 'start' },
  ],
};

/** The field as the coordinator passes it for one kind */
const resolvedFor = (kind: number): PostField => ({
  ...calendarField,
  mapTo: { kind, target: 'tag', tagName: 'start' },
});

const value = { start: '2026-10-21T19:00', end: '2026-10-22T09:00', tzid: 'Europe/Prague' };

describe('datePrecision', () => {
  it('follows the calendar kind being written', () => {
    expect(datePrecision(calendarField, [ALL_DAY_EVENT_KIND])).toBe('day');
    expect(datePrecision(calendarField, [TIMED_EVENT_KIND])).toBe('time');
    expect(datePrecision(resolvedFor(TIMED_EVENT_KIND))).toBe('time');
  });

  it('uses metadata.precision on other kinds, day by default', () => {
    const field: PostField = {
      ...calendarField,
      mapTo: { kind: 1, target: 'tag', tagName: 'date' },
    };
    expect(datePrecision(field)).toBe('day');
    expect(datePrecision({ ...field, metadata: { precision: 'time' } })).toBe('time');
  });
});

describe('datePlugin tags', () => {
  it('writes an all-day event: dates, exclusive end, D tags', () => {
    const field = resolvedFor(ALL_DAY_EVENT_KIND);
    expect(datePlugin.serializeValue?.(value, field)).toBe('2026-10-21');
    expect(datePlugin.extraTags?.(value, field)).toEqual([
      ['end', '2026-10-23'],
      ['D', day(2026, 10, 21)],
      ['D', day(2026, 10, 22)],
    ]);
  });

  it('writes a timed event: unix seconds, time zones, D tags', () => {
    const field = resolvedFor(TIMED_EVENT_KIND);
    expect(datePlugin.serializeValue?.(value, field)).toBe(String(utc(2026, 10, 21, 17)));
    expect(datePlugin.extraTags?.(value, field)).toEqual([
      ['end', String(utc(2026, 10, 22, 7))],
      ['start_tzid', 'Europe/Prague'],
      ['end_tzid', 'Europe/Prague'],
      ['D', day(2026, 10, 21)],
      ['D', day(2026, 10, 22)],
    ]);
  });

  it("writes a value without time zone in the viewer's, as the input shows it", () => {
    const field = resolvedFor(TIMED_EVENT_KIND);
    const noZone = { start: '2026-10-21T19:00' };
    expect(datePlugin.serializeValue?.(noZone, field)).toBe(
      String(wallToUnix(noZone.start, defaultTimeZone()))
    );
    expect(datePlugin.extraTags?.(noZone, field)).toContainEqual(['start_tzid', defaultTimeZone()]);
  });

  it('adds no calendar tags on other kinds', () => {
    const field: PostField = {
      ...calendarField,
      mapTo: { kind: 1, target: 'tag', tagName: 'date' },
    };
    expect(datePlugin.serializeValue?.(value, field)).toBe('2026-10-21');
    expect(datePlugin.extraTags?.(value, field)).toEqual([]);
  });

  it('writes nothing for an invalid value', () => {
    expect(datePlugin.serializeValue?.({ start: 'soon' }, resolvedFor(TIMED_EVENT_KIND))).toBe('');
    expect(datePlugin.extraTags?.({ start: 'soon' }, resolvedFor(TIMED_EVENT_KIND))).toEqual([]);
  });
});

describe('dateValueFromTags', () => {
  it('reads an all-day event back with its last day', () => {
    expect(
      dateValueFromTags([
        ['d', 'x'],
        ['start', '2026-10-21'],
        ['end', '2026-10-23'],
      ])
    ).toEqual({ start: '2026-10-21', end: '2026-10-22' });
  });

  it('reads a timed event back in its time zone', () => {
    expect(
      dateValueFromTags([
        ['start', String(utc(2026, 10, 21, 17))],
        ['end', String(utc(2026, 10, 22, 7))],
        ['start_tzid', 'Europe/Prague'],
      ])
    ).toEqual(value);
  });

  it('round-trips what the plugin writes', () => {
    const field = resolvedFor(TIMED_EVENT_KIND);
    const tags = [
      ['start', datePlugin.serializeValue?.(value, field) ?? ''],
      ...(datePlugin.extraTags?.(value, field) ?? []),
    ];
    expect(datePlugin.resolveFromTags?.(tags, calendarField)).toEqual(value);
  });

  it('is undefined without a start tag', () => {
    expect(dateValueFromTags([['title', 'x']])).toBeUndefined();
  });
});

describe('validate / formatDateValue', () => {
  it('rejects bad dates and ends before the start', () => {
    expect(datePlugin.validate?.(value, calendarField).success).toBe(true);
    expect(datePlugin.validate?.({ start: '2026-13-01' }, calendarField).success).toBe(false);
    const backwards = { start: '2026-10-21', end: '2026-10-20' };
    expect(datePlugin.validate?.(backwards, calendarField)).toMatchObject({
      success: false,
      error: { code: 'END_BEFORE_START' },
    });
  });

  it('formats dates and times in the locale', () => {
    expect(formatDateValue({ start: '2026-10-21', end: '2026-10-23' }, 'en-US')).toBe(
      'Oct 21, 2026 – Oct 23, 2026'
    );
    expect(formatDateValue({ start: '2026-10-21T19:00', tzid: 'Europe/Prague' }, 'en-US')).toMatch(
      /^Oct 21, 2026, 7:00\sPM$/
    );
  });
});
