import type { NostrTag } from '@nostr-post/core/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDryRunEntries, getDryRunEntries, isDryRun, setDryRun } from './dryRun';
import { fetchEvents, fetchEventsFromRelay } from './fetch';
import { publishToRelay, publishToRelays, type SignedEvent } from './index';

const event = (id: string, kind = 1, tags: NostrTag[] = []): SignedEvent => ({
  id,
  pubkey: 'pk',
  sig: 'sig',
  kind,
  created_at: 100,
  content: '',
  tags,
});

/** Relay stub: answers every REQ with EOSE (no events); records what was sent */
const sent: string[] = [];
class FakeWebSocket {
  onopen?: () => void;
  onmessage?: (msg: { data: string }) => void;
  onerror?: () => void;
  onclose?: () => void;
  constructor() {
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data: string) {
    sent.push(data);
    const [type, subId] = JSON.parse(data) as [string, string];
    if (type === 'REQ') {
      setTimeout(() => this.onmessage?.({ data: JSON.stringify(['EOSE', subId]) }), 0);
    }
  }
  close() {}
}

beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal('WebSocket', FakeWebSocket);
  setDryRun(true);
  clearDryRunEntries();
});

afterEach(() => {
  setDryRun(false);
  clearDryRunEntries();
  vi.unstubAllGlobals();
});

describe('dry-run publishing', () => {
  it('logs events instead of sending them, newest first', async () => {
    const results = await publishToRelays(event('a'), ['wss://r1', 'wss://r2']);
    await publishToRelay(event('b'), 'wss://r3');

    expect(sent).toEqual([]);
    expect(results).toEqual({
      success: 2,
      failed: 0,
      results: [
        { relay: 'wss://r1', ok: true },
        { relay: 'wss://r2', ok: true },
      ],
    });
    expect(getDryRunEntries()).toEqual([
      { event: event('b'), relays: ['wss://r3'] },
      { event: event('a'), relays: ['wss://r1', 'wss://r2'] },
    ]);
  });

  it('reports success without relays', async () => {
    const results = await publishToRelays(event('a'), []);
    expect(results.success).toBe(1);
  });

  it('sends events when turned off', async () => {
    setDryRun(false);
    expect(isDryRun()).toBe(false);
    void publishToRelays(event('a'), ['wss://r1']).catch(() => {});
    await new Promise((r) => setTimeout(r, 5));
    expect(sent).toEqual([JSON.stringify(['EVENT', event('a')])]);
    expect(getDryRunEntries()).toEqual([]);
  });
});

describe('dry-run reads', () => {
  it('returns logged events matching the filter', async () => {
    await publishToRelays(event('a', 30818, [['d', 'x']]), []);
    await publishToRelays(event('b', 1), []);

    const events = await fetchEventsFromRelay('wss://r1', { kinds: [30818], '#d': ['x'] });
    expect(events.map((e) => e.id)).toEqual(['a']);
  });

  it('dedupes logged events across relays', async () => {
    await publishToRelays(event('a'), []);
    const events = await fetchEvents({ kinds: [1] }, ['wss://r1', 'wss://r2'], {
      waitForAll: true,
    });
    expect(events.map((e) => e.id)).toEqual(['a']);
  });

  it('ignores the log when turned off', async () => {
    await publishToRelays(event('a'), []);
    setDryRun(false);
    const events = await fetchEventsFromRelay('wss://r1', { kinds: [1] });
    expect(events).toEqual([]);
  });
});
