import { encodeNaddr } from '@nostr-post/core/nip19';
import { describe, expect, it } from 'vitest';
import { eventsToIcs } from './ics';
import { icsDescription, pageName, roleAddresses } from './icsText';

const pk = 'a'.repeat(64);
const inspirative = `30818:${pk}:inspirative-musician`;
const faustus = `30818:${pk}:faustus-musician`;
const content = [
  'Schedule:',
  '20:00 Summer Dress',
  '',
  'No Age Restrictions',
  `Performers: nostr:${encodeNaddr(inspirative)}`,
  `Performers: nostr:${encodeNaddr(faustus)}`,
  'Performers: Summer Dress',
].join('\n');
const refs = new Map([
  [inspirative, { name: 'Inspirative', links: ['https://open.spotify.com/artist/5Q3l'] }],
  [faustus, { name: 'Faustus', links: [] }],
]);

describe('icsDescription', () => {
  it('writes the linked pages as names with a link, one line per role', () => {
    expect(icsDescription(content, refs)).toBe(
      [
        'Schedule:',
        '20:00 Summer Dress',
        '',
        'No Age Restrictions',
        'Performers: Inspirative (https://open.spotify.com/artist/5Q3l), Faustus, Summer Dress',
      ].join('\n')
    );
  });

  it('leaves out pages it has no name for, and other labelled lines stay as they are', () => {
    const text = `Doors: 19:30\nDoors: 20:00\nPerformers: nostr:${encodeNaddr(faustus)}`;
    expect(icsDescription(text, new Map())).toBe('Doors: 19:30\nDoors: 20:00');
  });

  it('finds the addresses and page names', () => {
    expect(roleAddresses(content)).toEqual([inspirative, faustus]);
    expect(pageName('Faustus (musician)')).toBe('Faustus');
  });

  it('is the .ics description, without nostr addresses', () => {
    const ics = eventsToIcs(
      [
        {
          kind: 31923,
          pubkey: pk,
          created_at: 1,
          content,
          tags: [
            ['d', 'x'],
            ['title', 'Gig'],
            ['start', '1794142800'],
          ],
        },
      ],
      undefined,
      refs
    ).replace(/\r\n /g, '');
    expect(ics).toContain(
      'Performers: Inspirative (https://open.spotify.com/artist/5Q3l)\\, Faustus\\, Summer Dress'
    );
    expect(ics).not.toContain('naddr');
  });
});
