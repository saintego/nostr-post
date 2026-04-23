/**
 * Unit tests for NIP-33 utilities
 */
import { describe, expect, it } from 'vitest';
import { filterLatestAddressableEvents, selectLatestByAddress } from './nip33';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeEvent = (
  kind: number,
  pubkey: string,
  created_at: number,
  dTag?: string
): { kind: number; pubkey: string; created_at: number; tags: string[][] } => ({
  kind,
  pubkey,
  created_at,
  tags: dTag !== undefined ? [['d', dTag]] : [],
});

// ---------------------------------------------------------------------------
// filterLatestAddressableEvents
// ---------------------------------------------------------------------------

describe('filterLatestAddressableEvents', () => {
  it('passes through non-addressable events unchanged', () => {
    const events = [makeEvent(1, 'alice', 100), makeEvent(0, 'alice', 200)];
    expect(filterLatestAddressableEvents(events)).toEqual(events);
  });

  it('keeps only the latest addressable event per kind:pubkey:d-tag', () => {
    const old = makeEvent(30023, 'alice', 100, 'my-post');
    const latest = makeEvent(30023, 'alice', 200, 'my-post');
    const result = filterLatestAddressableEvents([old, latest]);
    expect(result).toContain(latest);
    expect(result).not.toContain(old);
  });

  it('treats a missing d tag as an empty string key', () => {
    const old = makeEvent(30023, 'alice', 100); // no d tag
    const latest = makeEvent(30023, 'alice', 200); // no d tag
    const result = filterLatestAddressableEvents([old, latest]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(latest);
  });

  it('keeps distinct d-tags as separate events', () => {
    const a = makeEvent(30023, 'alice', 100, 'post-a');
    const b = makeEvent(30023, 'alice', 100, 'post-b');
    const result = filterLatestAddressableEvents([a, b]);
    expect(result).toHaveLength(2);
  });

  it('keeps distinct authors as separate events', () => {
    const alice = makeEvent(30023, 'alice', 100, 'post');
    const bob = makeEvent(30023, 'bob', 100, 'post');
    const result = filterLatestAddressableEvents([alice, bob]);
    expect(result).toHaveLength(2);
  });

  it('keeps distinct kinds as separate events', () => {
    const a = makeEvent(30023, 'alice', 100, 'post');
    const b = makeEvent(30024, 'alice', 100, 'post');
    const result = filterLatestAddressableEvents([a, b]);
    expect(result).toHaveLength(2);
  });

  it('preserves relative order of surviving events', () => {
    const e1 = makeEvent(1, 'alice', 300); // non-addressable – passes through
    const e2 = makeEvent(30023, 'alice', 200, 'post');
    const e3 = makeEvent(30023, 'alice', 100, 'post'); // older – filtered
    const result = filterLatestAddressableEvents([e1, e2, e3]);
    expect(result).toEqual([e1, e2]);
  });

  it('handles ties on created_at by keeping whichever was seen first in input', () => {
    const first = makeEvent(30023, 'alice', 100, 'post');
    const second = makeEvent(30023, 'alice', 100, 'post');
    const result = filterLatestAddressableEvents([first, second]);
    expect(result).toHaveLength(1);
    // The first one encountered wins (no update when timestamps are equal)
    expect(result[0]).toBe(first);
  });

  it('returns empty array for empty input', () => {
    expect(filterLatestAddressableEvents([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectLatestByAddress
// ---------------------------------------------------------------------------

describe('selectLatestByAddress', () => {
  const makeItem = (pubkey: string, dTag: string, createdAt: number) => ({
    pubkey,
    dTag,
    createdAt,
  });

  it('returns the single newest item per pubkey+dTag', () => {
    const items = [
      makeItem('alice', 'a', 100),
      makeItem('alice', 'a', 200),
      makeItem('alice', 'a', 50),
    ];
    const result = selectLatestByAddress(items);
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBe(200);
  });

  it('keeps distinct dTags separate', () => {
    const items = [makeItem('alice', 'a', 100), makeItem('alice', 'b', 100)];
    const result = selectLatestByAddress(items);
    expect(result).toHaveLength(2);
  });

  it('keeps distinct pubkeys separate', () => {
    const items = [makeItem('alice', 'a', 100), makeItem('bob', 'a', 100)];
    const result = selectLatestByAddress(items);
    expect(result).toHaveLength(2);
  });

  it('sorts results by createdAt descending', () => {
    const items = [
      makeItem('alice', 'a', 100),
      makeItem('bob', 'b', 300),
      makeItem('carol', 'c', 200),
    ];
    const result = selectLatestByAddress(items);
    expect(result.map((i) => i.createdAt)).toEqual([300, 200, 100]);
  });

  it('returns empty array for empty input', () => {
    expect(selectLatestByAddress([])).toEqual([]);
  });

  it('handles empty dTag string', () => {
    const items = [makeItem('alice', '', 100), makeItem('alice', '', 200)];
    const result = selectLatestByAddress(items);
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBe(200);
  });
});
