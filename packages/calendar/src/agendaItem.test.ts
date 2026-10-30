import { describe, expect, it } from 'vitest';
import { agendaItem } from './agendaItem';

const pubkey = 'a'.repeat(64);
const utc = (d: number, h: number) => String(Date.UTC(2026, 9, d, h) / 1000);

describe('agendaItem', () => {
  it('shows a timed event with its local start, place and topics', () => {
    const gig = {
      kind: 31923,
      pubkey,
      created_at: 1,
      tags: [
        ['d', 'gig'],
        ['title', 'Metal night'],
        ['start', utc(21, 17)],
        ['location', 'Barnaby Jones'],
        ['location', 'Medellín'],
        ['t', 'metal'],
      ],
    };
    expect(agendaItem(gig, '2026-10-21', 'Europe/Prague')).toEqual({
      address: `31923:${pubkey}:gig`,
      title: 'Metal night',
      allDay: false,
      time: '19:00',
      continued: false,
      place: 'Barnaby Jones, Medellín',
      topics: ['metal'],
    });
  });

  it('marks the later days of a multi-day event', () => {
    const fest = {
      kind: 31922,
      pubkey,
      created_at: 1,
      tags: [
        ['d', 'fest'],
        ['title', 'Fest'],
        ['start', '2026-10-24'],
        ['end', '2026-10-26'],
      ],
    };
    expect(agendaItem(fest, '2026-10-24')).toMatchObject({ allDay: true, continued: false });
    expect(agendaItem(fest, '2026-10-25')).toMatchObject({ allDay: true, continued: true });
  });
});
