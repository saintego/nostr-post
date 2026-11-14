import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachedEvents, clearEventCache } from './eventCache';
import { fetchEvents } from './fetch';
import type { SignedEvent } from './index';

const page = (id: string, created_at: number): SignedEvent => ({
  id: id.repeat(64).slice(0, 64),
  pubkey: 'p'.repeat(64),
  sig: 's',
  kind: 30818,
  created_at,
  content: '',
  tags: [['d', 'venue']],
});

/** A relay answering every REQ with `answer` (after `delayMs`), counting its connections */
const relayAnswering = (answer: () => SignedEvent[], delayMs = 0) => {
  const created: string[] = [];
  class Relay {
    onopen?: () => void;
    onmessage?: (message: { data: string }) => void;
    onerror?: () => void;
    onclose?: () => void;
    constructor(url: string) {
      created.push(url);
      setTimeout(() => this.onopen?.(), 0);
    }
    send(data: string) {
      const [type, subId] = JSON.parse(data) as [string, string];
      if (type !== 'REQ') return;
      setTimeout(() => {
        for (const ev of answer()) this.onmessage?.({ data: JSON.stringify(['EVENT', subId, ev]) });
        this.onmessage?.({ data: JSON.stringify(['EOSE', subId]) });
      }, delayMs);
    }
    close() {}
  }
  return { Relay, created };
};

afterEach(() => {
  vi.unstubAllGlobals();
  clearEventCache();
});

describe('core loading', () => {
  it('shares one connection per relay between queries', async () => {
    const { Relay, created } = relayAnswering(() => []);
    vi.stubGlobal('WebSocket', Relay);
    await fetchEvents({ kinds: [1] }, ['wss://shared.example']);
    await fetchEvents({ kinds: [7] }, ['wss://shared.example']);
    expect(created).toEqual(['wss://shared.example']);
  });

  it('answers particular events from the cache at once, still asking the relay', async () => {
    const v1 = page('a', 100);
    const v2 = page('b', 200);
    let answer = [v1];
    const { Relay } = relayAnswering(() => answer, 50);
    vi.stubGlobal('WebSocket', Relay);
    const filter = { kinds: [30818], authors: [v1.pubkey], '#d': ['venue'] };
    expect(await fetchEvents(filter, ['wss://cache.example'])).toEqual([v1]);
    expect(cachedEvents([filter])).toEqual([v1]);

    // A newer version on the relay: the cached one answers first, the newer follows
    answer = [v2];
    const updates: SignedEvent[][] = [];
    const first = await fetchEvents(filter, ['wss://cache.example'], {
      onUpdate: (events) => updates.push(events),
    });
    expect(first).toEqual([v1]);
    await vi.waitFor(() => expect(updates.at(-1)?.[0]).toEqual(v2));
    expect(cachedEvents([filter]).map((e) => e.created_at)).toEqual([200, 100]);
  });

  it("waiting for all relays doesn't wait for one that never answers", async () => {
    const quick = page('q', 1);
    class Relays {
      onopen?: () => void;
      onmessage?: (message: { data: string }) => void;
      constructor(private url: string) {
        setTimeout(() => this.onopen?.(), 0);
      }
      send(data: string) {
        const [type, subId] = JSON.parse(data) as [string, string];
        // The slow relay never answers
        if (type !== 'REQ' || this.url.includes('slow')) return;
        setTimeout(() => {
          this.onmessage?.({ data: JSON.stringify(['EVENT', subId, quick]) });
          this.onmessage?.({ data: JSON.stringify(['EOSE', subId]) });
        }, 0);
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', Relays);
    const started = Date.now();
    const events = await fetchEvents(
      { kinds: [30818] },
      ['wss://quick.example', 'wss://slow.example'],
      {
        waitForAll: true,
        settleMs: 100,
      }
    );
    expect(events).toEqual([quick]);
    expect(Date.now() - started).toBeLessThan(1000);

    // `complete`: the slow relay is waited for, up to its timeout
    const completeStarted = Date.now();
    await fetchEvents({ kinds: [30818] }, ['wss://quick.example', 'wss://slow.example'], {
      waitForAll: true,
      complete: true,
      settleMs: 50,
      relayTimeoutMs: 400,
    });
    expect(Date.now() - completeStarted).toBeGreaterThanOrEqual(350);
  });
});
