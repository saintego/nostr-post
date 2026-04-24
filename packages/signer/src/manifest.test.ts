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

describe('fetchManifestByATag (inheritance)', () => {
  const pubkey = 'pubkey123';

  const parentManifest: NostrPostManifest = {
    id: 'base-review',
    version: '1.0.0',
    publishFormats: [{ id: 'kind1', label: 'Note', kinds: [1], default: true }],
    fields: [
      {
        id: 'body',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: { label: 'Review', placeholder: 'Write your review...' },
      },
    ],
    metadata: { name: 'Base Review' },
  };

  const childManifest: NostrPostManifest = {
    id: 'restaurant-review',
    version: '2.0.0',
    extends: buildManifestATag(pubkey, 'base-review'),
    fields: [
      {
        id: 'body',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
        metadata: { label: 'Restaurant Review' }, // overrides parent label
      },
    ],
    metadata: { name: 'Restaurant Review' },
  };

  beforeEach(() => {
    clearManifestCache();
    vi.clearAllMocks();
  });

  it('returns the manifest as-is when there is no extends', async () => {
    const aTag = buildManifestATag(pubkey, parentManifest.id);
    fetchEventsMock.mockResolvedValueOnce([
      buildSignedManifestEvent(parentManifest, pubkey, 'evt-parent'),
    ]);

    const stored = await fetchManifestByATag(aTag, ['wss://relay.test']);
    expect(stored?.manifest.id).toBe('base-review');
    expect(stored?.manifest.extends).toBeUndefined();
  });

  it('resolves child onto parent when extends is set', async () => {
    const childATag = buildManifestATag(pubkey, childManifest.id);
    const parentATag = buildManifestATag(pubkey, parentManifest.id);

    // First call: child; second call: parent
    fetchEventsMock
      .mockResolvedValueOnce([buildSignedManifestEvent(childManifest, pubkey, 'evt-child')])
      .mockResolvedValueOnce([buildSignedManifestEvent(parentManifest, pubkey, 'evt-parent')]);

    const stored = await fetchManifestByATag(childATag, ['wss://relay.test']);

    expect(stored).toBeDefined();
    // Child id/version preserved
    expect(stored?.manifest.id).toBe('restaurant-review');
    expect(stored?.manifest.version).toBe('2.0.0');
    // extends stripped from resolved manifest
    expect(stored?.manifest.extends).toBeUndefined();
    // Parent-only metadata preserved (shallow merge)
    expect(stored?.manifest.metadata?.name).toBe('Restaurant Review'); // child wins
    // Field metadata shallow-merged: child label wins, parent placeholder preserved
    const bodyField = stored?.manifest.fields.find((f) => f.id === 'body');
    expect(bodyField?.metadata?.label).toBe('Restaurant Review');
    expect(bodyField?.metadata?.placeholder).toBe('Write your review...');

    void parentATag; // parentATag used implicitly via extends
  });

  it('stops and warns when a cycle is detected', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const selfRef = buildManifestATag(pubkey, 'cyclic');
    const cyclicManifest: NostrPostManifest = {
      id: 'cyclic',
      version: '1.0.0',
      extends: selfRef,
      fields: [
        {
          id: 'body',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
      ],
    };

    fetchEventsMock.mockResolvedValue([
      buildSignedManifestEvent(cyclicManifest, pubkey, 'evt-cyclic'),
    ]);

    const stored = await fetchManifestByATag(selfRef, ['wss://relay.test']);

    // Returns the child as-is (not undefined), cycle was broken
    expect(stored?.manifest.id).toBe('cyclic');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('cyclic'));

    warnSpy.mockRestore();
  });

  it('returns child as-is when parent cannot be fetched', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const childATag = buildManifestATag(pubkey, childManifest.id);

    // Child found, parent not found
    fetchEventsMock
      .mockResolvedValueOnce([buildSignedManifestEvent(childManifest, pubkey, 'evt-child')])
      .mockResolvedValue([]); // parent fetch returns nothing

    const stored = await fetchManifestByATag(childATag, ['wss://relay.test']);

    expect(stored?.manifest.id).toBe('restaurant-review');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not fetch any parent'));

    warnSpy.mockRestore();
  });

  it('returns undefined when the root manifest cannot be fetched', async () => {
    fetchEventsMock.mockResolvedValue([]);

    const stored = await fetchManifestByATag(buildManifestATag(pubkey, 'missing'), [
      'wss://relay.test',
    ]);
    expect(stored).toBeUndefined();
  });

  it('merges multiple parents when extends is an array (rightmost wins on conflict)', async () => {
    const coffeeManifest: NostrPostManifest = {
      id: 'coffee-review',
      version: '1.0.0',
      fields: [
        {
          id: 'notes',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
          metadata: { label: 'Tasting Notes', placeholder: 'From coffee parent' },
        },
        {
          id: 'origin',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 1, target: 'tag', tagName: 'origin' },
          metadata: { label: 'Origin' },
        },
      ],
    };

    const cafeManifest: NostrPostManifest = {
      id: 'cafe-visit',
      version: '1.0.0',
      fields: [
        {
          id: 'notes',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
          // conflicts with coffee's 'notes' — cafe is rightmost so its placeholder wins
          metadata: { label: 'Notes', placeholder: 'From cafe parent' },
        },
        {
          id: 'location',
          type: 'geo',
          uiPlugin: 'geo',
          mapTo: { kind: 1, target: 'tag', tagName: 'g' },
          metadata: { label: 'Location' },
        },
      ],
    };

    const combinedManifest: NostrPostManifest = {
      id: 'coffee-in-cafe',
      version: '1.0.0',
      extends: [
        buildManifestATag(pubkey, 'coffee-review'),
        buildManifestATag(pubkey, 'cafe-visit'),
      ],
      fields: [], // no extra fields of its own
    };

    const combinedATag = buildManifestATag(pubkey, 'coffee-in-cafe');
    const coffeeATag = buildManifestATag(pubkey, 'coffee-review');
    const cafeATag = buildManifestATag(pubkey, 'cafe-visit');

    fetchEventsMock
      // combined manifest fetch
      .mockResolvedValueOnce([buildSignedManifestEvent(combinedManifest, pubkey, 'evt-combined')])
      // coffee-review fetch (first parent)
      .mockResolvedValueOnce([buildSignedManifestEvent(coffeeManifest, pubkey, 'evt-coffee')])
      // cafe-visit fetch (second parent)
      .mockResolvedValueOnce([buildSignedManifestEvent(cafeManifest, pubkey, 'evt-cafe')]);

    const stored = await fetchManifestByATag(combinedATag, ['wss://relay.test']);

    expect(stored?.manifest.id).toBe('coffee-in-cafe');
    expect(stored?.manifest.extends).toBeUndefined();

    const fieldIds = stored?.manifest.fields.map((f) => f.id);
    // Both parent-only fields are present
    expect(fieldIds).toContain('origin'); // from coffee
    expect(fieldIds).toContain('location'); // from cafe

    // 'notes' field exists once (not duplicated)
    expect(fieldIds?.filter((id) => id === 'notes')).toHaveLength(1);

    // Rightmost parent (cafe-visit) wins on the conflicting placeholder
    const notesField = stored?.manifest.fields.find((f) => f.id === 'notes');
    expect(notesField?.metadata?.placeholder).toBe('From cafe parent');

    void coffeeATag;
    void cafeATag;
  });
});
