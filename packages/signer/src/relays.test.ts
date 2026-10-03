import type { NostrTag } from '@nostr-post/core/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import {
  clearRelayListCache,
  fetchUserRelays,
  getPublishRelays,
  publishRelayListUrls,
  relayListUrls,
} from './relays';

vi.mock('./fetch', () => ({
  DEFAULT_RELAYS: ['wss://default.example'],
  fetchEvents: vi.fn(),
}));

import { fetchEvents } from './fetch';
import type { SignedEvent } from './index';

const relayList = (created_at: number, tags: NostrTag[], pubkey = 'pk'): SignedEvent => ({
  id: `${pubkey}${created_at}`,
  pubkey,
  sig: 'sig',
  kind: 10002,
  created_at,
  content: '',
  tags,
});

describe('relayListUrls', () => {
  it('uses the newest list, read and write relays, without trailing slashes', () => {
    const urls = relayListUrls([
      relayList(1, [['r', 'wss://old.example']]),
      relayList(2, [
        ['r', 'wss://a.example/', 'read'],
        ['r', 'wss://b.example', 'write'],
        ['r', 'wss://a.example'],
        ['client', 'x'],
      ]),
    ]);
    expect(urls).toEqual(['wss://a.example', 'wss://b.example']);
  });

  it('merges the newest list of each author', () => {
    const urls = relayListUrls([
      relayList(1, [['r', 'wss://a.example']], 'alice'),
      relayList(1, [['r', 'wss://b.example']], 'bob'),
    ]);
    expect(urls).toEqual(['wss://a.example', 'wss://b.example']);
  });

  it('returns [] without a relay list', () => {
    expect(relayListUrls([])).toEqual([]);
  });
});

describe('fetchUserRelays', () => {
  beforeEach(() => {
    clearRelayListCache();
    (fetchEvents as Mock).mockReset();
  });

  it('puts user relays first, then the given relays', async () => {
    (fetchEvents as Mock).mockResolvedValue([relayList(1, [['r', 'wss://mine.example/', 'read']])]);
    expect(await fetchUserRelays('pk', ['wss://x.example'])).toEqual([
      'wss://mine.example',
      'wss://x.example',
    ]);
  });

  it('caches lookups per pubkey', async () => {
    (fetchEvents as Mock).mockResolvedValue([relayList(1, [['r', 'wss://mine.example']])]);
    await fetchUserRelays('pk');
    await fetchUserRelays(['pk']);
    expect(fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('falls back to the given relays on error', async () => {
    (fetchEvents as Mock).mockRejectedValue(new Error('offline'));
    expect(await fetchUserRelays('pk')).toEqual(['wss://default.example']);
  });
});

describe('publishRelayListUrls', () => {
  it('uses write and unmarked relays', () => {
    const urls = publishRelayListUrls([
      relayList(1, [
        ['r', 'wss://read.example', 'read'],
        ['r', 'wss://write.example/', 'write'],
        ['r', 'wss://both.example'],
      ]),
    ]);
    expect(urls).toEqual(['wss://write.example', 'wss://both.example']);
  });

  it('uses all relays when every relay is marked read', () => {
    const urls = publishRelayListUrls([
      relayList(1, [
        ['r', 'wss://a.example', 'read'],
        ['r', 'wss://b.example', 'read'],
      ]),
    ]);
    expect(urls).toEqual(['wss://a.example', 'wss://b.example']);
  });
});

describe('getPublishRelays', () => {
  beforeEach(() => {
    clearRelayListCache();
    (fetchEvents as Mock).mockReset();
  });

  it('puts the user write relays first, then the given relays', async () => {
    (fetchEvents as Mock).mockResolvedValue([
      relayList(1, [
        ['r', 'wss://read.example', 'read'],
        ['r', 'wss://write.example', 'write'],
      ]),
    ]);
    expect(await getPublishRelays('pk', ['wss://x.example'])).toEqual([
      'wss://write.example',
      'wss://x.example',
    ]);
  });

  it('merges the signer relays with the relay list', async () => {
    (fetchEvents as Mock).mockResolvedValue([relayList(1, [['r', 'wss://list.example']])]);
    vi.stubGlobal('window', {
      nostr: {
        getRelays: async () => ({
          'wss://signer.example/': { read: true, write: true },
          'wss://readonly.example': { read: true, write: false },
        }),
      },
    });
    try {
      expect(await getPublishRelays('pk', ['wss://x.example'])).toEqual([
        'wss://signer.example',
        'wss://list.example',
        'wss://x.example',
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('falls back to the given relays without a relay list', async () => {
    (fetchEvents as Mock).mockResolvedValue([]);
    expect(await getPublishRelays('pk')).toEqual(['wss://default.example']);
  });
});
