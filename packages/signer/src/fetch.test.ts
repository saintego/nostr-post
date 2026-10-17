import { describe, expect, it, vi } from 'vitest';
import { fetchEventsFromRelay, matchesFilter } from './fetch';
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

describe('fetchEventsFromRelay', () => {
  it('stops when the relay closes the subscription instead of waiting for the timeout', async () => {
    // A relay that refuses every REQ (e.g. an unsupported filter)
    class RefusingRelay {
      onopen?: () => void;
      onmessage?: (message: { data: string }) => void;
      onerror?: () => void;
      constructor() {
        setTimeout(() => this.onopen?.(), 0);
      }
      send(data: string) {
        const [type, subId] = JSON.parse(data) as [string, string];
        if (type !== 'REQ') return;
        setTimeout(
          () => this.onmessage?.({ data: JSON.stringify(['CLOSED', subId, 'unsupported']) }),
          0
        );
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', RefusingRelay);
    const started = Date.now();
    await expect(fetchEventsFromRelay('wss://r', { kinds: [1] })).resolves.toEqual([]);
    expect(Date.now() - started).toBeLessThan(1000);
    vi.unstubAllGlobals();
  });
});
