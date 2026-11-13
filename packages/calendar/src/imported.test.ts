import { describe, expect, it } from 'vitest';
import { fromSource, importedFilter, sameUrl } from './imported';

const event = (pubkey: string, d: string, created_at: number, tags: string[][]) => ({
  kind: 31923,
  pubkey,
  created_at,
  tags: [['d', d], ...tags],
});

describe('events imported from a page', () => {
  it('asks relays by the pages as links (#r: relays index single-letter tags only)', () => {
    expect(
      importedFilter(['https://fb.com/events/1', null, 'not a url', 'https://fb.com/events/1'])
    ).toEqual({
      kinds: [31922, 31923],
      '#r': ['https://fb.com/events/1'],
    });
    expect(importedFilter([undefined])).toBeUndefined();
  });

  it('compares URLs without www., trailing slash or fragment', () => {
    expect(sameUrl('HTTPS://www.Facebook.com/events/1/#x')).toBe('https://facebook.com/events/1');
  });

  it('finds the newest version of events naming the page in their proxy tag or links', () => {
    const page = 'https://www.facebook.com/events/1/';
    const events = [
      event('a', 'x', 1, [['proxy', page, 'web']]),
      event('a', 'x', 2, [['proxy', 'https://facebook.com/events/1', 'web']]),
      event('b', 'y', 1, [['r', 'https://facebook.com/events/1']]),
      event('c', 'z', 1, [['r', 'https://facebook.com/events/2']]),
    ];
    expect(fromSource(events, page).map((e) => [e.pubkey, e.created_at])).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });
});
