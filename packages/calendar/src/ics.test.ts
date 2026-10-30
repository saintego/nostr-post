import { describe, expect, it } from 'vitest';
import { eventsToIcs, icsDTag, icsToDrafts } from './ics';

const pubkey = 'a'.repeat(64);
const utc = (d: number, h: number) => String(Date.UTC(2026, 9, d, h) / 1000);

const allDay = {
  kind: 31922,
  pubkey,
  created_at: 1_760_000_000,
  content: 'Three days of punk; bring earplugs',
  tags: [
    ['d', 'fest'],
    ['title', 'Punk, Fest'],
    ['start', '2026-10-21'],
    ['end', '2026-10-24'],
    ['location', 'Old Town'],
    ['r', 'https://fest.example'],
  ],
};
const timed = {
  kind: 31923,
  pubkey,
  created_at: 1_760_000_000,
  content: '',
  tags: [
    ['d', 'gig'],
    ['title', 'Gig'],
    ['start', utc(21, 17)],
    ['end', utc(21, 19)],
    ['start_tzid', 'Europe/Prague'],
  ],
};

describe('eventsToIcs', () => {
  it('writes all-day and timed events as RFC 5545 entries', () => {
    // Unfolded: long lines continue on lines starting with a space
    const ics = eventsToIcs([allDay, timed], 'My gigs').replace(/\r\n /g, '');
    expect(ics).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n');
    expect(ics).toContain('X-WR-CALNAME:My gigs');
    expect(ics).toContain(`UID:31922:${pubkey}:fest`);
    // All-day ends are exclusive, as in NIP-52
    expect(ics).toContain('DTSTART;VALUE=DATE:20261021\r\nDTEND;VALUE=DATE:20261024');
    expect(ics).toContain('SUMMARY:Punk\\, Fest');
    expect(ics).toContain('DESCRIPTION:Three days of punk\\; bring earplugs');
    expect(ics).toContain('LOCATION:Old Town');
    expect(ics).toContain('URL:https://fest.example');
    expect(ics).toContain('DTSTART:20261021T170000Z\r\nDTEND:20261021T190000Z');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('folds long lines at 75 octets', () => {
    const long = { ...allDay, content: 'x'.repeat(200) };
    const lines = eventsToIcs([long]).split('\r\n');
    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(lines.some((line) => line.startsWith(' x'))).toBe(true);
  });
});

describe('icsToDrafts', () => {
  const facebookLike = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:e123456789@facebook.com',
    'DTSTART;TZID=America/Bogota:20261031T210000',
    'DTEND;TZID=America/Bogota:20261101T020000',
    'SUMMARY:Halloween Metal Night',
    'LOCATION:Barnaby Jones\\, Medellín',
    'DESCRIPTION:Bands: Doom\\nTickets at the door',
    'URL:https://www.facebook.com/events/123456789/',
    'CLASS:PUBLIC',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:e2@facebook.com',
    'DTSTART;VALUE=DATE:20261224',
    'DTEND;VALUE=DATE:20261226',
    'SUMMARY:Family thing that is very long and gets fol',
    ' ded here',
    'CLASS:PRIVATE',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:No uid',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  it('reads timed and all-day entries as drafts with a stable d-tag', () => {
    const [gig, family, ...rest] = icsToDrafts(facebookLike, 'Europe/Prague');
    expect(rest).toEqual([]);
    expect(gig).toEqual({
      uid: 'e123456789@facebook.com',
      dTag: 'ics:e123456789@facebook.com',
      allDay: false,
      private: false,
      formData: {
        title: 'Halloween Metal Night',
        when: { start: '2026-10-31T21:00', end: '2026-11-01T02:00', tzid: 'America/Bogota' },
        place: 'Barnaby Jones, Medellín',
        description: 'Bands: Doom\nTickets at the door',
        link: 'https://www.facebook.com/events/123456789/',
      },
    });
    expect(family).toMatchObject({
      allDay: true,
      private: true,
      formData: {
        title: 'Family thing that is very long and gets folded here',
        when: { start: '2026-12-24', end: '2026-12-25' },
      },
    });
    expect(icsDTag(' e2@facebook.com ')).toBe('ics:e2@facebook.com');
  });

  it('reads UTC times in the viewer zone, and round-trips its own export', () => {
    const [back] = icsToDrafts(eventsToIcs([timed]), 'Europe/Prague');
    expect(back?.formData.when).toEqual({
      start: '2026-10-21T19:00',
      end: '2026-10-21T21:00',
      tzid: 'Europe/Prague',
    });
    const [fest] = icsToDrafts(eventsToIcs([allDay]));
    expect(fest?.formData).toMatchObject({
      title: 'Punk, Fest',
      when: { start: '2026-10-21', end: '2026-10-23' },
      place: 'Old Town',
      link: 'https://fest.example',
    });
  });
});
