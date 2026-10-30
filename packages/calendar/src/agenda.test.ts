import { describe, expect, it } from 'vitest';
import {
  agendaDayTags,
  agendaFilter,
  eventDates,
  eventTimeZone,
  eventTiming,
  formatAgendaDate,
  formatWindowRange,
  groupEventsByDay,
  latestByAddress,
  shiftWindow,
  todayIn,
  windowDates,
} from './agenda';

const utc = (year: number, month: number, date: number, hour = 0, minute = 0) =>
  Date.UTC(year, month - 1, date, hour, minute) / 1000;
const day = (year: number, month: number, date: number) => utc(year, month, date) / 86400;

let created = 1000;
const allDay = (d: string, start: string, end?: string, createdAt = created++) => ({
  kind: 31922,
  pubkey: 'a',
  created_at: createdAt,
  tags: [['d', d], ['start', start], ...(end ? [['end', end]] : [])],
});
const timed = (d: string, start: number, end?: number, createdAt = created++) => ({
  kind: 31923,
  pubkey: 'a',
  created_at: createdAt,
  tags: [['d', d], ['start', String(start)], ...(end ? [['end', String(end)]] : [])],
});

const ids = (days: { date: string; events: { tags: string[][] }[] }[]) =>
  days.map(({ date, events }) => [date, events.map((event) => event.tags[0]?.[1])]);

describe('windows', () => {
  it('lists the window dates', () => {
    expect(windowDates({ from: '2026-12-30', days: 3, tzid: 'UTC' })).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
    ]);
  });

  it('defaults to today in the time zone', () => {
    const now = Date.UTC(2026, 9, 21, 20);
    expect(todayIn('UTC', now)).toBe('2026-10-21');
    expect(todayIn('Asia/Bangkok', now)).toBe('2026-10-22');
  });

  it('asks for the UTC days of the local window and its calendar dates', () => {
    // Bangkok is UTC+7: Oct 21 local starts Oct 20 17:00 UTC
    expect(agendaDayTags({ from: '2026-10-21', days: 2, tzid: 'Asia/Bangkok' })).toEqual(
      [day(2026, 10, 20), day(2026, 10, 21), day(2026, 10, 22)].map(String)
    );
    // New York is UTC-4: Oct 22 local ends Oct 23 04:00 UTC
    expect(agendaDayTags({ from: '2026-10-21', days: 2, tzid: 'America/New_York' })).toEqual(
      [day(2026, 10, 21), day(2026, 10, 22), day(2026, 10, 23)].map(String)
    );
    expect(agendaFilter({ from: '2026-10-21', days: 1, tzid: 'UTC' })).toEqual({
      kinds: [31922, 31923],
      '#D': [String(day(2026, 10, 21))],
    });
  });
});

describe('eventTiming / eventDates', () => {
  it('reads all-day events with their exclusive end', () => {
    const timing = eventTiming(allDay('x', '2026-10-21', '2026-10-24'));
    expect(timing).toMatchObject({ allDay: true, lastDate: '2026-10-23' });
    expect(eventDates(timing ?? ({} as never), 'Asia/Bangkok')).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]);
  });

  it('puts timed events on the local days they cover', () => {
    // 22:00–01:00 UTC is 05:00–08:00 next day in Bangkok
    const timing = eventTiming(timed('x', utc(2026, 10, 21, 22), utc(2026, 10, 22, 1)));
    expect(eventDates(timing ?? ({} as never), 'UTC')).toEqual(['2026-10-21', '2026-10-22']);
    expect(eventDates(timing ?? ({} as never), 'Asia/Bangkok')).toEqual(['2026-10-22']);
  });

  it('skips events without a valid start', () => {
    expect(eventTiming({ ...allDay('x', 'soon'), kind: 31922 })).toBeUndefined();
    expect(eventTiming({ kind: 31923, pubkey: 'a', created_at: 1, tags: [] })).toBeUndefined();
  });
});

describe('latestByAddress', () => {
  it('keeps the newest version of each event', () => {
    const old = allDay('x', '2026-10-21', undefined, 1);
    const updated = allDay('x', '2026-10-22', undefined, 2);
    expect(latestByAddress([updated, old, allDay('y', '2026-10-21')])).toEqual([
      updated,
      expect.objectContaining({ tags: expect.arrayContaining([['d', 'y']]) }),
    ]);
  });
});

describe('groupEventsByDay', () => {
  const window = { from: '2026-10-21', days: 3, tzid: 'UTC' };

  it('groups by day, all-day first, then by start, skipping empty days', () => {
    const events = [
      timed('late', utc(2026, 10, 21, 18)),
      timed('early', utc(2026, 10, 21, 9)),
      allDay('fest', '2026-10-21', '2026-10-23'),
      timed('outside', utc(2026, 10, 30, 9)),
    ];
    expect(ids(groupEventsByDay(events, window))).toEqual([
      ['2026-10-21', ['fest', 'early', 'late']],
      ['2026-10-22', ['fest']],
    ]);
  });

  it('lists an updated event once, at its new date', () => {
    const events = [
      allDay('moved', '2026-10-21', undefined, 1),
      allDay('moved', '2026-10-23', undefined, 2),
    ];
    expect(ids(groupEventsByDay(events, window))).toEqual([['2026-10-23', ['moved']]]);
  });
});

describe('eventZones', () => {
  // Fri 23:30 in Bangkok (UTC+7) is Fri 18:30 in Prague (UTC+2) and Fri 12:30 in New York
  const gig = {
    ...timed('gig', utc(2026, 10, 23, 16, 30)),
    tags: [...timed('gig', utc(2026, 10, 23, 16, 30)).tags, ['start_tzid', 'Asia/Bangkok']],
  };

  it("shows an event in its own zone, else the window's", () => {
    const window = { from: '2026-10-23', days: 2, tzid: 'America/Los_Angeles' };
    expect(eventTimeZone(gig, window)).toBe('America/Los_Angeles');
    expect(eventTimeZone(gig, { ...window, eventZones: true })).toBe('Asia/Bangkok');
    const unknown = { ...gig, tags: [...gig.tags.slice(0, -1), ['start_tzid', 'Mars/Base']] };
    expect(eventTimeZone(unknown, { ...window, eventZones: true })).toBe('America/Los_Angeles');
  });

  it("puts an event on its own zone's day", () => {
    // 01:00 Saturday in Bangkok is still Friday in Los Angeles
    const late = {
      ...gig,
      tags: [
        ['d', 'late'],
        ['start', String(utc(2026, 10, 23, 18))],
        ['start_tzid', 'Asia/Bangkok'],
      ],
    };
    const window = { from: '2026-10-23', days: 2, tzid: 'America/Los_Angeles' };
    expect(ids(groupEventsByDay([late], window))).toEqual([['2026-10-23', ['late']]]);
    expect(ids(groupEventsByDay([late], { ...window, eventZones: true }))).toEqual([
      ['2026-10-24', ['late']],
    ]);
  });

  it('asks for a day more on each side', () => {
    const window = { from: '2026-10-21', days: 1, tzid: 'UTC' };
    expect(agendaDayTags({ ...window, eventZones: true })).toEqual(
      [day(2026, 10, 20), day(2026, 10, 21), day(2026, 10, 22)].map(String)
    );
  });
});

describe('formatAgendaDate', () => {
  it('formats a day heading in the locale', () => {
    expect(formatAgendaDate('2026-10-21', 'en-US')).toBe('Wednesday, October 21, 2026');
  });
});

describe('shiftWindow / formatWindowRange', () => {
  it('moves by whole windows', () => {
    const window = { from: '2026-10-21', days: 7, tzid: 'UTC' };
    expect(shiftWindow(window, 1)).toBe('2026-10-28');
    expect(shiftWindow(window, -1)).toBe('2026-10-14');
    expect(shiftWindow(window, 0)).toBe('2026-10-21');
  });

  it('formats the range in the locale', () => {
    expect(formatWindowRange({ from: '2026-10-21', days: 7 }, 'en-US')).toMatch(
      /^Oct 21\s–\s27, 2026$/
    );
    expect(formatWindowRange({ from: '2026-10-21', days: 1 }, 'en-US')).toBe('Oct 21, 2026');
  });
});
