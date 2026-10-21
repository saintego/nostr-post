import { describe, expect, it } from 'vitest';
import {
  dayNumbers,
  endsBeforeStart,
  isDateValue,
  MAX_DAY_TAGS,
  parseStoredAllDayEnd,
  parseStoredDate,
  serializeAllDayEnd,
  serializeWall,
  unixToWall,
  wallForPrecision,
  wallToUnix,
} from './dateValue';

const utc = (...args: [number, number, number, number?, number?]) =>
  Date.UTC(args[0], args[1] - 1, args[2], args[3] ?? 0, args[4] ?? 0) / 1000;
const day = (year: number, month: number, date: number) => String(utc(year, month, date) / 86400);

describe('wallToUnix / unixToWall', () => {
  it('converts wall time in a time zone to unix seconds', () => {
    // Prague is UTC+2 in summer time
    expect(wallToUnix('2026-10-21T19:00', 'Europe/Prague')).toBe(utc(2026, 10, 21, 17));
    expect(wallToUnix('2026-10-21T19:00', 'UTC')).toBe(utc(2026, 10, 21, 19));
    expect(wallToUnix('2026-10-21T19:00', 'America/New_York')).toBe(utc(2026, 10, 21, 23));
  });

  it('uses the offset in force on the day around a DST switch', () => {
    // Summer time starts 2026-03-29 01:00 UTC in Europe
    expect(wallToUnix('2026-03-28T12:00', 'Europe/Prague')).toBe(utc(2026, 3, 28, 11));
    expect(wallToUnix('2026-03-29T12:00', 'Europe/Prague')).toBe(utc(2026, 3, 29, 10));
  });

  it('reads a date without time as midnight', () => {
    expect(wallToUnix('2026-10-21', 'UTC')).toBe(utc(2026, 10, 21));
  });

  it('round-trips through unixToWall', () => {
    const unix = wallToUnix('2026-12-31T23:45', 'Asia/Tokyo');
    expect(unix).toBeDefined();
    expect(unixToWall(unix ?? 0, 'Asia/Tokyo')).toBe('2026-12-31T23:45');
  });

  it('rejects invalid dates and unknown time zones', () => {
    expect(wallToUnix('2026-02-30', 'UTC')).toBeUndefined();
    expect(wallToUnix('2026-10-21T24:00', 'UTC')).toBeUndefined();
    expect(wallToUnix('21.10.2026', 'UTC')).toBeUndefined();
    expect(wallToUnix('2026-10-21T19:00', 'Mars/Olympus')).toBeUndefined();
  });
});

describe('serializeWall', () => {
  it('writes a date at day precision and unix seconds at time precision', () => {
    expect(serializeWall('2026-10-21T19:00', 'day')).toBe('2026-10-21');
    expect(serializeWall('2026-10-21T19:00', 'time', 'Europe/Prague')).toBe(
      String(utc(2026, 10, 21, 17))
    );
    expect(serializeWall('2026-10-21', 'time')).toBe(String(utc(2026, 10, 21)));
  });
});

describe('all-day ends', () => {
  it('stores the day after the last day (NIP-52 ends are exclusive) and reads it back', () => {
    expect(serializeAllDayEnd('2026-10-23')).toBe('2026-10-24');
    expect(serializeAllDayEnd('2026-12-31')).toBe('2027-01-01');
    expect(parseStoredAllDayEnd('2026-10-24')).toBe('2026-10-23');
  });
});

describe('parseStoredDate', () => {
  it('keeps dates and turns unix seconds into wall time in the zone', () => {
    expect(parseStoredDate('2026-10-21')).toBe('2026-10-21');
    expect(parseStoredDate(String(utc(2026, 10, 21, 17)), 'Europe/Prague')).toBe(
      '2026-10-21T19:00'
    );
    expect(parseStoredDate('tomorrow')).toBeUndefined();
  });
});

describe('dayNumbers', () => {
  it('lists the calendar days of an all-day range, last day included', () => {
    expect(dayNumbers({ start: '2026-10-21' }, 'day')).toEqual([day(2026, 10, 21)]);
    expect(dayNumbers({ start: '2026-10-21', end: '2026-10-23' }, 'day')).toEqual([
      day(2026, 10, 21),
      day(2026, 10, 22),
      day(2026, 10, 23),
    ]);
  });

  it('lists the UTC days a timed event covers', () => {
    // 23:00–01:00 in Prague is 21:00–23:00 UTC: one UTC day
    expect(
      dayNumbers(
        { start: '2026-10-21T23:00', end: '2026-10-22T01:00', tzid: 'Europe/Prague' },
        'time'
      )
    ).toEqual([day(2026, 10, 21)]);
    // Ending at midnight UTC doesn't cover the next day
    expect(
      dayNumbers({ start: '2026-10-21T22:00', end: '2026-10-22T00:00', tzid: 'UTC' }, 'time')
    ).toEqual([day(2026, 10, 21)]);
    expect(
      dayNumbers({ start: '2026-10-21T22:00', end: '2026-10-22T00:30', tzid: 'UTC' }, 'time')
    ).toEqual([day(2026, 10, 21), day(2026, 10, 22)]);
  });

  it('caps the number of days', () => {
    expect(dayNumbers({ start: '2026-01-01', end: '2030-01-01' }, 'day')).toHaveLength(
      MAX_DAY_TAGS
    );
  });
});

describe('isDateValue / endsBeforeStart', () => {
  it('accepts well-formed values only', () => {
    expect(isDateValue({ start: '2026-10-21' })).toBe(true);
    expect(isDateValue({ start: '2026-10-21T19:00', tzid: 'Europe/Prague' })).toBe(true);
    expect(isDateValue({ start: '' })).toBe(false);
    expect(isDateValue({ start: '2026-10-21', tzid: 'Nowhere/City' })).toBe(false);
    expect(isDateValue('2026-10-21')).toBe(false);
  });

  it('compares at the precision', () => {
    expect(endsBeforeStart({ start: '2026-10-21', end: '2026-10-20' }, 'day')).toBe(true);
    expect(endsBeforeStart({ start: '2026-10-21T19:00', end: '2026-10-21T18:00' }, 'day')).toBe(
      false
    );
    expect(endsBeforeStart({ start: '2026-10-21T19:00', end: '2026-10-21T18:00' }, 'time')).toBe(
      true
    );
  });
});

describe('wallForPrecision', () => {
  it('drops or adds the time of day', () => {
    expect(wallForPrecision('2026-10-21T19:00', 'day')).toBe('2026-10-21');
    expect(wallForPrecision('2026-10-21', 'time')).toBe('2026-10-21T00:00');
    expect(wallForPrecision('2026-10-21T19:00', 'time')).toBe('2026-10-21T19:00');
  });
});
