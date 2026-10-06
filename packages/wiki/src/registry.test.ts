import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@nostr-post/signer', () => ({
  fetchManifestByATag: vi.fn(),
  fetchEvents: vi.fn(),
  fetchEventsFromRelay: vi.fn(),
}));

import { fetchManifestByATag } from '@nostr-post/signer';
import { getEntityManifest, registerEntityManifest, resolveEntityManifest } from './registry';

const manifest = (id: string) => ({ id, version: '1.0.0', fields: [] }) as never;

describe('entity manifest references', () => {
  it('resolves registered ids and inline manifests', async () => {
    registerEntityManifest(manifest('registered-v1'));
    expect((await resolveEntityManifest('registered-v1'))?.id).toBe('registered-v1');
    expect((await resolveEntityManifest(manifest('inline-v1')))?.id).toBe('inline-v1');
  });

  it('fetches a published manifest by address once and remembers it', async () => {
    const address = '30078:pk:nostr-post:custom-entity-v1';
    (fetchManifestByATag as Mock).mockResolvedValue({ manifest: manifest('custom-entity-v1') });
    const [a, b] = await Promise.all([
      resolveEntityManifest(address),
      resolveEntityManifest(address),
    ]);
    expect(a?.id).toBe('custom-entity-v1');
    expect(b).toBe(a);
    expect(fetchManifestByATag).toHaveBeenCalledTimes(1);
    expect(getEntityManifest(address)?.id).toBe('custom-entity-v1');
  });

  it('is undefined for an unknown id', async () => {
    expect(await resolveEntityManifest('unknown-v1')).toBeUndefined();
  });
});
