import { describe, expect, it } from 'vitest';
import {
  formatMonth,
  monthGrid,
  monthOf,
  monthWindow,
  shiftMonth,
  weekdayNames,
  weekStartOf,
} from './month';

describe('months', () => {
  it('makes a month window and moves by months', () => {
    expect(monthWindow('2026-02')).toEqual({ from: '2026-02-01', days: 28 });
    expect(monthWindow('2028-02', 'UTC')).toEqual({ from: '2028-02-01', days: 29, tzid: 'UTC' });
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthOf('2026-10-21')).toBe('2026-10');
  });

  it('lays a month out in weeks from Monday or Sunday', () => {
    // October 2026 starts on a Thursday
    const weeks = monthGrid('2026-10', 1);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weeks.at(-1)?.at(-1)).toBe('2026-11-01');
    expect(monthGrid('2026-10', 0)[0]?.[0]).toBe('2026-09-27');
  });

  it("starts weeks on the locale's first day", () => {
    expect(weekStartOf('en-US')).toBe(0);
    expect(weekStartOf('cs-CZ')).toBe(1);
    expect(weekStartOf('de-DE')).toBe(1);
  });

  it('names months and weekdays in the locale', () => {
    expect(formatMonth('2026-10', 'en-US')).toBe('October 2026');
    expect(weekdayNames(1, 'en-US')).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayNames(0, 'en-US')[0]).toBe('Sun');
  });
});
