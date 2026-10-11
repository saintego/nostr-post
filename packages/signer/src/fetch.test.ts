import { describe, expect, it } from 'vitest';
import { matchesFilter } from './fetch';
import type { SignedEvent } from './index';

const event: SignedEvent = {
  id: 'id1',
  pubkey: 'pk1',
  sig: 'sig',
  kind: 30818,
  created_at: 100,
  content: '',
  tags: [
    ['d', 'bitcoin'],
    ['i', 'untappd:beer:1'],
  ],
};

describe('matchesFilter', () => {
  it('matches exact tag values only', () => {
    expect(matchesFilter(event, { '#d': ['bitcoin'] })).toBe(true);
    expect(matchesFilter(event, { '#d': ['bitcoin-history'] })).toBe(false);
    expect(matchesFilter({ ...event, tags: [['d', 'rabbit']] }, { '#d': ['bitcoin'] })).toBe(false);
  });

  it('checks ids, kinds, authors and time range', () => {
    expect(matchesFilter(event, { kinds: [30818], authors: ['pk1'], ids: ['id1'] })).toBe(true);
    expect(matchesFilter(event, { kinds: [1] })).toBe(false);
    expect(matchesFilter(event, { authors: ['other'] })).toBe(false);
    expect(matchesFilter(event, { since: 101 })).toBe(false);
    expect(matchesFilter(event, { until: 99 })).toBe(false);
  });

  it('leaves search and limit to the relay', () => {
    expect(matchesFilter(event, { kinds: [30818], search: 'anything', limit: 1 })).toBe(true);
  });
});
