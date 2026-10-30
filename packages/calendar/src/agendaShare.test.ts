import { describe, expect, it } from 'vitest';
import { formatWindowRange } from './agenda';
import { agendaSummary, agendaText } from './agendaShare';

const timed = (d: string, title: string, start: string, place?: string) => ({
  kind: 31923,
  pubkey: 'p',
  created_at: 1,
  tags: [
    ['d', d],
    ['title', title],
    ['start', String(Date.parse(start) / 1000)],
    ...(place ? [['location', place]] : []),
  ],
});

const allDay = (d: string, title: string, start: string, end: string) => ({
  kind: 31922,
  pubkey: 'p',
  created_at: 1,
  tags: [
    ['d', d],
    ['title', title],
    ['start', start],
    ['end', end],
  ],
});

const week = { from: '2026-10-26', days: 7, tzid: 'UTC' };
/** "Oct 26 – Nov 1, 2026", with the locale's spaces */
const range = formatWindowRange(week, 'en-US');
const events = [
  timed('b', 'Heavy Halloween', '2026-10-31T20:00:00Z', 'JAM'),
  timed('a', 'Early show', '2026-10-31T18:00:00Z'),
  allDay('f', 'Fest', '2026-10-29', '2026-10-31'),
  timed('x', 'Next month', '2026-11-20T20:00:00Z'),
];

describe('agendaSummary', () => {
  it('lists the events by day, a festival once on its first day', () => {
    const summary = agendaSummary(events, week, { locale: 'en-US' });
    expect(summary.days.map((d) => [d.label, d.items])).toEqual([
      ['Thu, Oct 29', [{ title: 'Fest' }]],
      [
        'Sat, Oct 31',
        [
          { time: '18:00', title: 'Early show' },
          { time: '20:00', title: 'Heavy Halloween', place: 'JAM' },
        ],
      ],
    ]);
    expect(summary.more).toBe(0);
  });

  it('counts the events left out', () => {
    const summary = agendaSummary(events, week, { maxItems: 2 });
    expect(summary.days.flatMap((d) => d.items).length).toBe(2);
    expect(summary.more).toBe(1);
  });
});

describe('agendaText', () => {
  it('has the title, dates, a line per event and the link', () => {
    expect(
      agendaText(events, week, {
        locale: 'en-US',
        title: 'Metal gigs in Bangkok',
        link: 'https://gigs.example/#/?g=w4rq',
      })
    ).toBe(
      [
        `Metal gigs in Bangkok, ${range}`,
        '',
        'Thu, Oct 29',
        '• Fest',
        '',
        'Sat, Oct 31',
        '• 18:00 Early show',
        '• 20:00 Heavy Halloween @ JAM',
        '',
        'https://gigs.example/#/?g=w4rq',
      ].join('\n')
    );
  });

  it('says when there is nothing', () => {
    expect(agendaText([], week, { locale: 'en-US', emptyText: 'No gigs yet' })).toBe(
      `${range}\n\nNo gigs yet`
    );
  });
});
