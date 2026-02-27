/**
 * Unit tests for NIP-78 utilities
 */
import { describe, expect, it } from 'vitest';
import {
  MANIFEST_D_TAG_PREFIX,
  NIP78_KIND,
  buildManifestATag,
  buildManifestDTag,
  eventToManifest,
  manifestDeleteEvent,
  manifestToEvent,
  parseManifestATag,
  parseManifestDTag,
} from './nip78';
import type { NostrPostManifest } from './types';

describe('NIP-78 Constants', () => {
  it('should have correct NIP-78 kind', () => {
    expect(NIP78_KIND).toBe(30078);
  });

  it('should have correct manifest prefix', () => {
    expect(MANIFEST_D_TAG_PREFIX).toBe('nostr-post:');
  });
});

describe('buildManifestDTag', () => {
  it('should build d-tag with prefix', () => {
    const dTag = buildManifestDTag('restaurant-review-v1');
    expect(dTag).toBe('nostr-post:restaurant-review-v1');
  });

  it('should handle manifest IDs with special characters', () => {
    const dTag = buildManifestDTag('my-manifest_v1.0');
    expect(dTag).toBe('nostr-post:my-manifest_v1.0');
  });
});

describe('parseManifestDTag', () => {
  it('should parse valid d-tag', () => {
    const manifestId = parseManifestDTag('nostr-post:restaurant-review-v1');
    expect(manifestId).toBe('restaurant-review-v1');
  });

  it('should return undefined for invalid prefix', () => {
    const manifestId = parseManifestDTag('other-app:manifest-id');
    expect(manifestId).toBeUndefined();
  });

  it('should handle d-tags with colons in the ID', () => {
    const manifestId = parseManifestDTag('nostr-post:namespace:manifest:v1');
    expect(manifestId).toBe('namespace:manifest:v1');
  });
});

describe('buildManifestATag', () => {
  it('should build a-tag in correct format', () => {
    const aTag = buildManifestATag('pubkey123', 'restaurant-review-v1');
    expect(aTag).toBe('30078:pubkey123:nostr-post:restaurant-review-v1');
  });

  it('should handle long pubkeys', () => {
    const longPubkey = 'a'.repeat(64);
    const aTag = buildManifestATag(longPubkey, 'test-manifest');
    expect(aTag).toBe(`30078:${longPubkey}:nostr-post:test-manifest`);
  });
});

describe('parseManifestATag', () => {
  it('should parse valid a-tag', () => {
    const ref = parseManifestATag('30078:pubkey123:nostr-post:restaurant-review-v1');
    expect(ref).toEqual({
      pubkey: 'pubkey123',
      dTag: 'nostr-post:restaurant-review-v1',
    });
  });

  it('should return undefined for wrong kind', () => {
    const ref = parseManifestATag('30023:pubkey123:nostr-post:test');
    expect(ref).toBeUndefined();
  });

  it('should return undefined for invalid prefix', () => {
    const ref = parseManifestATag('30078:pubkey123:other-app:test');
    expect(ref).toBeUndefined();
  });

  it('should return undefined for malformed a-tag', () => {
    const ref = parseManifestATag('invalid');
    expect(ref).toBeUndefined();
  });

  it('should handle a-tags with colons in d-tag', () => {
    const ref = parseManifestATag('30078:pubkey123:nostr-post:namespace:manifest:v1');
    expect(ref).toEqual({
      pubkey: 'pubkey123',
      dTag: 'nostr-post:namespace:manifest:v1',
    });
  });
});

describe('manifestToEvent', () => {
  const manifest: NostrPostManifest = {
    id: 'restaurant-review-v1',
    version: '1.0.0',
    requiredKinds: [1, 30078],
    fields: [
      {
        id: 'review',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
      },
      {
        id: 'rating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
      },
    ],
    metadata: {
      name: 'Restaurant Review',
      description: 'A manifest for restaurant reviews',
      tags: ['food', 'reviews'],
    },
  };

  it('should create a valid NIP-78 event', () => {
    const event = manifestToEvent(manifest, 'testpubkey');

    expect(event.kind).toBe(30078);
    expect(event.pubkey).toBe('testpubkey');
    expect(event.tags).toContainEqual(['d', 'nostr-post:restaurant-review-v1']);
    expect(event.tags).toContainEqual(['name', 'Restaurant Review']);
    expect(event.tags).toContainEqual(['t', 'food']);
    expect(event.tags).toContainEqual(['t', 'reviews']);
    expect(event.tags).toContainEqual(['t', 'nostr-post']);
  });

  it('should serialize manifest to JSON content', () => {
    const event = manifestToEvent(manifest);
    const parsed = JSON.parse(event.content);

    expect(parsed).toEqual(manifest);
  });

  it('should work without pubkey', () => {
    const event = manifestToEvent(manifest);
    expect(event.pubkey).toBe('');
  });

  it('should work without metadata', () => {
    const minimalManifest: NostrPostManifest = {
      id: 'minimal',
      version: '1.0.0',
      requiredKinds: [1],
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
      ],
    };

    const event = manifestToEvent(minimalManifest);
    expect(event.tags).toContainEqual(['d', 'nostr-post:minimal']);
    expect(event.tags).toContainEqual(['t', 'nostr-post']);
    expect(event.tags.find((t) => t[0] === 'name')).toBeUndefined();
  });

  it('should include created_at timestamp', () => {
    const beforeTime = Math.floor(Date.now() / 1000);
    const event = manifestToEvent(manifest);
    const afterTime = Math.floor(Date.now() / 1000);

    expect(event.created_at).toBeGreaterThanOrEqual(beforeTime);
    expect(event.created_at).toBeLessThanOrEqual(afterTime);
  });
});

describe('eventToManifest', () => {
  const manifest: NostrPostManifest = {
    id: 'test-manifest',
    version: '1.0.0',
    requiredKinds: [1],
    fields: [
      {
        id: 'content',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
      },
    ],
  };

  it('should parse a valid NIP-78 event', () => {
    const event = {
      kind: 30078,
      content: JSON.stringify(manifest),
      tags: [['d', 'nostr-post:test-manifest']],
      pubkey: 'testpubkey',
      created_at: 1234567890,
      id: 'eventid123',
    };

    const stored = eventToManifest(event);

    expect(stored).toBeDefined();
    expect(stored?.manifest).toEqual(manifest);
    expect(stored?.pubkey).toBe('testpubkey');
    expect(stored?.createdAt).toBe(1234567890);
    expect(stored?.dTag).toBe('nostr-post:test-manifest');
    expect(stored?.eventId).toBe('eventid123');
  });

  it('should return undefined for wrong kind', () => {
    const event = {
      kind: 1,
      content: JSON.stringify(manifest),
      tags: [['d', 'nostr-post:test-manifest']],
      pubkey: 'testpubkey',
      created_at: 1234567890,
    };

    const stored = eventToManifest(event);
    expect(stored).toBeUndefined();
  });

  it('should return undefined for missing d-tag', () => {
    const event = {
      kind: 30078,
      content: JSON.stringify(manifest),
      tags: [],
      pubkey: 'testpubkey',
      created_at: 1234567890,
    };

    const stored = eventToManifest(event);
    expect(stored).toBeUndefined();
  });

  it('should return undefined for invalid d-tag prefix', () => {
    const event = {
      kind: 30078,
      content: JSON.stringify(manifest),
      tags: [['d', 'other-app:manifest']],
      pubkey: 'testpubkey',
      created_at: 1234567890,
    };

    const stored = eventToManifest(event);
    expect(stored).toBeUndefined();
  });

  it('should return undefined for invalid JSON content', () => {
    const event = {
      kind: 30078,
      content: 'not valid json',
      tags: [['d', 'nostr-post:test']],
      pubkey: 'testpubkey',
      created_at: 1234567890,
    };

    const stored = eventToManifest(event);
    expect(stored).toBeUndefined();
  });

  it('should return undefined for malformed manifest', () => {
    const event = {
      kind: 30078,
      content: JSON.stringify({ invalid: 'manifest' }),
      tags: [['d', 'nostr-post:test']],
      pubkey: 'testpubkey',
      created_at: 1234567890,
    };

    const stored = eventToManifest(event);
    expect(stored).toBeUndefined();
  });

  it('should work without event id', () => {
    const event = {
      kind: 30078,
      content: JSON.stringify(manifest),
      tags: [['d', 'nostr-post:test-manifest']],
      pubkey: 'testpubkey',
      created_at: 1234567890,
    };

    const stored = eventToManifest(event);

    expect(stored).toBeDefined();
    expect(stored?.eventId).toBeUndefined();
  });
});

describe('manifestDeleteEvent', () => {
  it('should create a delete event', () => {
    const event = manifestDeleteEvent('test-manifest', 'testpubkey');

    expect(event.kind).toBe(30078);
    expect(event.pubkey).toBe('testpubkey');
    expect(event.content).toBe('');
    expect(event.tags).toContainEqual(['d', 'nostr-post:test-manifest']);
  });

  it('should work without pubkey', () => {
    const event = manifestDeleteEvent('test-manifest');
    expect(event.pubkey).toBe('');
  });

  it('should have timestamp', () => {
    const beforeTime = Math.floor(Date.now() / 1000);
    const event = manifestDeleteEvent('test-manifest');
    const afterTime = Math.floor(Date.now() / 1000);

    expect(event.created_at).toBeGreaterThanOrEqual(beforeTime);
    expect(event.created_at).toBeLessThanOrEqual(afterTime);
  });
});

describe('Round-trip event/manifest conversion', () => {
  it('should survive round-trip conversion', () => {
    const originalManifest: NostrPostManifest = {
      id: 'roundtrip-test',
      version: '2.0.0',
      requiredKinds: [1, 30078],
      fields: [
        {
          id: 'title',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 1, target: 'content' },
          required: true,
        },
        {
          id: 'rating',
          type: 'number',
          uiPlugin: 'stars',
          mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        },
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 30078, target: 'content', path: 'venue' },
        },
      ],
      metadata: {
        name: 'Round Trip Test',
        description: 'Testing serialization',
        author: 'test@example.com',
        tags: ['test', 'roundtrip'],
      },
    };

    const event = manifestToEvent(originalManifest, 'testpubkey');
    const stored = eventToManifest({ ...event, id: 'test-event-id' });

    expect(stored).toBeDefined();
    expect(stored?.manifest).toEqual(originalManifest);
    expect(stored?.pubkey).toBe('testpubkey');
    expect(stored?.dTag).toBe('nostr-post:roundtrip-test');
    expect(stored?.eventId).toBe('test-event-id');
  });
});
