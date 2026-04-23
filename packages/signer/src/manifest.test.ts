import { buildManifestATag } from '@nostr-post/core/nip78';
import { manifestToEvent } from '@nostr-post/core/nip78';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

// The module under test
import { clearManifestCache, fetchManifestByATag, getCachedManifest } from './manifest';

// Mock the fetch module which provides fetchEvents
vi.mock('./fetch', () => ({
  fetchEvents: vi.fn(),
}));

import { fetchEvents } from './fetch';

type ManifestEvent = ReturnType<typeof manifestToEvent> & { id: string };

const fetchEventsMock = fetchEvents as Mock;

const buildSignedManifestEvent = (
  nextManifest: NostrPostManifest,
  pubkey: string,
  id: string,
  createdAt?: number
): ManifestEvent => {
  const event = manifestToEvent(nextManifest, pubkey);

  return {
    ...event,
    id,
    created_at: createdAt ?? event.created_at,
  };
};

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

    const signed = buildSignedManifestEvent(manifest, pubkey, 'evt1');

    fetchEventsMock.mockResolvedValueOnce([signed]);

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

    const signed = buildSignedManifestEvent(manifest, pubkey, 'evt1');

    // Delay the resolution so concurrent calls overlap
    let resolver: ((value: ManifestEvent[]) => void) | undefined;
    const p = new Promise<ManifestEvent[]>((resolve) => {
      resolver = resolve;
    });
    fetchEventsMock.mockImplementationOnce(() => p);

    const p1 = fetchManifestByATag(aTag);
    const p2 = fetchManifestByATag(aTag);

    // resolve underlying fetch
    if (!resolver) {
      throw new Error('Expected manifest fetch promise resolver to be assigned.');
    }
    resolver([signed]);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();

    // fetchEvents should have been called only once
    expect(fetchEventsMock.mock.calls.length).toBe(1);
  });

  it('prefers the latest manifest event when relays return stale versions too', async () => {
    const pubkey = 'pubkey123';
    const aTag = buildManifestATag(pubkey, manifest.id);

    const older = buildSignedManifestEvent(
      { ...manifest, version: '1.0.0' },
      pubkey,
      'evt-old',
      100
    );

    const latest = buildSignedManifestEvent(
      { ...manifest, version: '2.0.0' },
      pubkey,
      'evt-new',
      200
    );

    fetchEventsMock.mockResolvedValueOnce([older, latest]);

    const stored = await fetchManifestByATag(aTag, ['wss://relay.test']);

    expect(stored?.manifest.version).toBe('2.0.0');
    expect(stored?.eventId).toBe('evt-new');
  });
});
