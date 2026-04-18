import { buildManifestATag } from '@nostr-post/core/nip78';
import { manifestToEvent } from '@nostr-post/core/nip78';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The module under test
import { clearManifestCache, fetchManifestByATag, getCachedManifest } from './manifest';

// Mock the fetch module which provides fetchEvents
vi.mock('./fetch', () => ({
  fetchEvents: vi.fn(),
}));

import { fetchEvents } from './fetch';

describe('manifest helper', () => {
  const manifest: NostrPostManifest = {
    id: 'test-manifest',
    version: '1.0.0',
    publishFormats: [
      {
        id: 'hybrid',
        label: 'Hybrid',
        kinds: [1, 30078],
        default: true,
        userSelectable: true,
      },
    ],
    fields: [
      {
        id: 'content',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
      },
    ],
  };

  beforeEach(() => {
    // clear cache and reset mocks
    clearManifestCache();
    vi.clearAllMocks();
  });

  it('fetches manifest by a-tag and caches result', async () => {
    const pubkey = 'pubkey123';
    const aTag = buildManifestATag(pubkey, manifest.id);

    const event = manifestToEvent(manifest, pubkey);
    const signed = { ...event, id: 'evt1', pubkey } as any;

    (fetchEvents as any).mockResolvedValueOnce([signed]);

    const stored = await fetchManifestByATag(aTag, ['wss://relay.test']);
    expect(stored).toBeDefined();
    expect(stored?.manifest.id).toBe(manifest.id);

    // should be cached
    const cached = getCachedManifest(aTag);
    expect(cached).toBeDefined();
    expect(cached?.manifest.id).toBe(manifest.id);
  });

  it('dedupes concurrent fetches', async () => {
    const pubkey = 'pubkey123';
    const aTag = buildManifestATag(pubkey, manifest.id);

    const event = manifestToEvent(manifest, pubkey);
    const signed = { ...event, id: 'evt1', pubkey } as any;

    // Delay the resolution so concurrent calls overlap
    let resolver: (v: any) => void;
    const p = new Promise((res) => (resolver = res));
    (fetchEvents as any).mockImplementationOnce(() => p as any);

    const p1 = fetchManifestByATag(aTag);
    const p2 = fetchManifestByATag(aTag);

    // resolve underlying fetch
    resolver!([signed]);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();

    // fetchEvents should have been called only once
    expect((fetchEvents as any).mock.calls.length).toBe(1);
  });
});
