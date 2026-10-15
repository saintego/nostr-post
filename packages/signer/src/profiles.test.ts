import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearProfileCache,
  fetchProfile,
  fetchProfiles,
  getCachedProfile,
  newestProfiles,
} from './profiles';

vi.mock('./fetch', () => ({
  DEFAULT_RELAYS: ['wss://default.example'],
  fetchEvents: vi.fn(),
}));

import { fetchEvents } from './fetch';
import type { SignedEvent } from './index';

const profileEvent = (pubkey: string, created_at: number, name: string): SignedEvent => ({
  id: `${pubkey}${created_at}`,
  pubkey,
  sig: 'sig',
  kind: 0,
  created_at,
  content: JSON.stringify({ name }),
  tags: [],
});

const mockFetch = fetchEvents as Mock;

describe('newestProfiles', () => {
  it('keeps the newest profile per pubkey and skips malformed ones', () => {
    const broken = { ...profileEvent('bob', 5, ''), content: '{' };
    const profiles = newestProfiles([
      profileEvent('alice', 2, 'new'),
      profileEvent('alice', 1, 'old'),
      broken,
    ]);
    expect([...profiles]).toEqual([['alice', { name: 'new' }]]);
  });
});

describe('fetchProfiles', () => {
  beforeEach(() => {
    clearProfileCache();
    mockFetch.mockReset();
  });

  it('batches lookups of one tick into one request, a filter per pubkey', async () => {
    mockFetch.mockResolvedValue([profileEvent('alice', 1, 'Alice'), profileEvent('bob', 1, 'Bob')]);
    const [alice, bob] = await Promise.all([fetchProfile('alice'), fetchProfile('bob')]);
    expect(alice?.name).toBe('Alice');
    expect(bob?.name).toBe('Bob');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toEqual([
      { kinds: [0], authors: ['alice'], limit: 1 },
      { kinds: [0], authors: ['bob'], limit: 1 },
    ]);
  });

  it('asks the relays, the indexers and wss:// hints', async () => {
    mockFetch.mockResolvedValue([]);
    await fetchProfiles(['alice'], {
      relays: ['wss://app.example'],
      hints: ['wss://hint.example', 'ws://insecure.example', 'wss://app.example'],
    });
    expect(mockFetch.mock.calls[0]?.[1]).toEqual([
      'wss://app.example',
      'wss://purplepag.es',
      'wss://hint.example',
    ]);
  });

  it('serves found profiles from the cache and shares a lookup in flight', async () => {
    mockFetch.mockResolvedValue([profileEvent('alice', 1, 'Alice')]);
    const first = fetchProfile('alice');
    const second = fetchProfile('alice');
    expect(await first).toBe(await second);
    expect(getCachedProfile('alice')?.name).toBe('Alice');
    expect((await fetchProfiles(['alice', 'alice'])).get('alice')?.name).toBe('Alice');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('tries a pubkey again when it was not found', async () => {
    mockFetch.mockResolvedValueOnce([]);
    expect(await fetchProfile('carol')).toBeUndefined();
    mockFetch.mockResolvedValueOnce([profileEvent('carol', 1, 'Carol')]);
    expect((await fetchProfile('carol'))?.name).toBe('Carol');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('splits many pubkeys into requests of 10 filters', async () => {
    mockFetch.mockResolvedValue([]);
    const pubkeys = Array.from({ length: 12 }, (_, i) => `pk${i}`);
    expect((await fetchProfiles(pubkeys)).size).toBe(0);
    expect(mockFetch.mock.calls.map((call) => (call[0] as unknown[]).length)).toEqual([10, 2]);
  });
});
