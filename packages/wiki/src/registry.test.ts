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

  it('merges a registered parent named in extends', async () => {
    const field = (id: string) => ({
      id,
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30818, target: 'table' },
    });
    registerEntityManifest({ ...manifest('base-v1'), fields: [field('style')] });
    registerEntityManifest({
      ...manifest('child-v1'),
      extends: 'base-v1',
      fields: [field('name')],
    });
    const resolved = getEntityManifest('child-v1');
    expect(resolved?.fields.map((f) => f.id).sort()).toEqual(['name', 'style']);
    expect(resolved?.extends).toBeUndefined();
    expect(getEntityManifest('child-v1')).toBe(resolved);
  });

  it('looks up an unregistered parent on relays, and works without it when missing', async () => {
    const field = (id: string) => ({
      id,
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 30818, target: 'table' },
    });
    (fetchManifestByATag as Mock).mockReset();
    (fetchManifestByATag as Mock).mockImplementation(async (ref: string) =>
      ref === 'remote-base-v1'
        ? { manifest: { ...manifest('remote-base-v1'), fields: [field('style')] } }
        : undefined
    );
    registerEntityManifest({
      ...manifest('remote-child-v1'),
      extends: 'remote-base-v1',
      fields: [field('name')],
    });
    expect(getEntityManifest('remote-child-v1')).toBeUndefined();
    const resolved = await resolveEntityManifest('remote-child-v1');
    expect(resolved?.fields.map((f) => f.id).sort()).toEqual(['name', 'style']);

    registerEntityManifest({
      ...manifest('orphan-v1'),
      extends: 'missing-v1',
      fields: [field('name')],
    });
    expect((await resolveEntityManifest('orphan-v1'))?.fields.map((f) => f.id)).toEqual(['name']);
  });
});
