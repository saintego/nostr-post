/**
 * Unit tests for the nip50Search utility.
 */
import { describe, expect, it, vi } from 'vitest';
import { nip50Search } from './nip50';

type FakeEvent = { id: string };

const makeEvent = (id: string): FakeEvent => ({ id });

describe('nip50Search', () => {
  it('returns NIP-50 results first, then deduped fallback-only events', async () => {
    const nip50Results = [makeEvent('a'), makeEvent('b')];
    const fallbackResults = [makeEvent('b'), makeEvent('c')]; // 'b' is already in NIP-50

    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(nip50Results)
      .mockResolvedValueOnce(fallbackResults);

    const result = await nip50Search<FakeEvent>({
      fetchFn,
      query: 'test',
      baseFilter: { kinds: [1] },
      fallbackFilter: { '#d': ['test'] },
      relays: ['wss://relay.example.com'],
    });

    // 'a' and 'b' from NIP-50 come first; 'c' appended from fallback
    expect(result).toEqual([makeEvent('a'), makeEvent('b'), makeEvent('c')]);
  });

  it('returns fallback results when NIP-50 query returns an empty array', async () => {
    const fallbackResults = [makeEvent('x'), makeEvent('y')];

    const fetchFn = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(fallbackResults);

    const result = await nip50Search<FakeEvent>({
      fetchFn,
      query: 'test',
      baseFilter: { kinds: [1] },
      fallbackFilter: { '#d': ['test'] },
      relays: ['wss://relay.example.com'],
    });

    expect(result).toEqual(fallbackResults);
  });

  it('returns fallback results when the NIP-50 query rejects', async () => {
    const fallbackResults = [makeEvent('x')];

    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('NIP-50 not supported'))
      .mockResolvedValueOnce(fallbackResults);

    const result = await nip50Search<FakeEvent>({
      fetchFn,
      query: 'test',
      baseFilter: { kinds: [1] },
      fallbackFilter: { '#d': ['test'] },
      relays: ['wss://relay.example.com'],
    });

    expect(result).toEqual(fallbackResults);
  });

  it('skips the fallback query when fallbackFilter is undefined', async () => {
    const nip50Results = [makeEvent('a')];
    const fetchFn = vi.fn().mockResolvedValueOnce(nip50Results);

    const result = await nip50Search<FakeEvent>({
      fetchFn,
      query: 'test',
      baseFilter: { kinds: [1] },
      relays: ['wss://relay.example.com'],
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result).toEqual(nip50Results);
  });

  it('deduplicates using a custom getId function', async () => {
    type CustomEvent = { eventId: string };
    const ev: CustomEvent = { eventId: 'abc' };

    const fetchFn = vi.fn().mockResolvedValueOnce([ev]).mockResolvedValueOnce([ev]); // same event from both queries

    const result = await nip50Search<CustomEvent>({
      fetchFn,
      query: 'test',
      baseFilter: {},
      fallbackFilter: { '#d': ['test'] },
      relays: ['wss://relay.example.com'],
      getId: (e) => e.eventId,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(ev);
  });

  it('passes the correct filters to fetchFn', async () => {
    const fetchFn = vi.fn().mockResolvedValue([]);

    await nip50Search<FakeEvent>({
      fetchFn,
      query: 'pliny',
      baseFilter: { kinds: [30818] },
      fallbackFilter: { '#d': ['pliny'] },
      nip50Limit: 10,
      fallbackLimit: 5,
      relays: ['wss://relay.example.com'],
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn).toHaveBeenNthCalledWith(1, { kinds: [30818], search: 'pliny', limit: 10 }, [
      'wss://relay.example.com',
    ]);
    expect(fetchFn).toHaveBeenNthCalledWith(2, { kinds: [30818], '#d': ['pliny'], limit: 5 }, [
      'wss://relay.example.com',
    ]);
  });
});
