import { describe, expect, it, vi } from 'vitest';

const author = 'b'.repeat(64);
const other = 'c'.repeat(64);
const calendar = `31924:${author}:nostr-post:prague-tech`;

vi.mock('@nostr-post/signer', () => ({
  DEFAULT_RELAYS: ['wss://default'],
  fetchEvents: vi.fn(async () => [
    {
      kind: 31924,
      pubkey: author,
      created_at: 1,
      content: '',
      tags: [
        ['d', 'nostr-post:prague-tech'],
        ['title', 'Prague tech'],
        ['a', `31923:${other}:meetup`],
        ['a', `30818:${other}:some-page`],
      ],
    },
    {
      kind: 31924,
      pubkey: author,
      created_at: 2,
      content: '',
      tags: [
        ['d', 'nostr-post:prague-tech'],
        ['a', `31923:${other}:meetup`],
        ['a', `31922:${author}:fest`],
      ],
    },
  ]),
  getPublicKey: vi.fn(),
  getPublishRelays: vi.fn(),
  signAndPublish: vi.fn(),
  fetchUserRelays: vi.fn(),
}));

import { CALENDAR_EVENT_MANIFEST } from './calendarManifest';
import { calendarEventFilters, fetchCalendarItems, publishesCalendarEvents } from './calendars';

describe('calendars', () => {
  it("reads the newest version's calendar events", async () => {
    expect(await fetchCalendarItems(calendar)).toEqual([
      `31923:${other}:meetup`,
      `31922:${author}:fest`,
    ]);
    expect(await fetchCalendarItems(`30003:${author}:list`)).toEqual([]);
  });

  it('asks for events by address, one filter per kind and author', () => {
    expect(
      calendarEventFilters([`31923:${other}:a`, `31923:${other}:b`, `31922:${author}:c`, 'junk'])
    ).toEqual([
      { kinds: [31923], authors: [other], '#d': ['a', 'b'] },
      { kinds: [31922], authors: [author], '#d': ['c'] },
    ]);
  });

  it('knows manifests that publish calendar events', () => {
    expect(publishesCalendarEvents(CALENDAR_EVENT_MANIFEST)).toBe(true);
    expect(publishesCalendarEvents({ ...CALENDAR_EVENT_MANIFEST, fields: [] })).toBe(false);
  });
});
