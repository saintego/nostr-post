/**
 * E2E tests for manifest publishing and retrieval workflow
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { coordinateEvents } from '../../packages/core/src/coordinator';
import { buildManifestATag, eventToManifest, manifestToEvent } from '../../packages/core/src/nip78';
import type { FormData, NostrPostManifest } from '../../packages/core/src/types';
import { MockNostrRelay, generateMockKeypair, mockSignEvent } from '../helpers/mock-relay';

describe('E2E: Manifest Publishing and Retrieval', () => {
  let relay: MockNostrRelay;
  let keypair: { pubkey: string; privkey: string };

  beforeEach(() => {
    relay = new MockNostrRelay();
    keypair = generateMockKeypair();
  });

  it('should publish a manifest to relay', async () => {
    const manifest: NostrPostManifest = {
      id: 'restaurant-review-v1',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1, 30078], default: true }],
      fields: [
        {
          id: 'review',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
          required: true,
        },
        {
          id: 'rating',
          type: 'number',
          uiPlugin: 'stars',
          mapTo: { kind: 1, target: 'tag', tagName: 'r' },
          required: true,
        },
      ],
      metadata: {
        name: 'Restaurant Review',
        description: 'A manifest for restaurant reviews',
        tags: ['food', 'reviews'],
      },
    };

    // Create manifest event
    const unsignedEvent = manifestToEvent(manifest, keypair.pubkey);
    const signedEvent = mockSignEvent(unsignedEvent, keypair.privkey);

    // Publish to relay
    const result = await relay.publish(signedEvent);
    expect(result.success).toBe(true);

    // Query back from relay
    const events = await relay.query([{ kinds: [30078], authors: [keypair.pubkey] }]);

    expect(events).toHaveLength(1);
    const retrieved = eventToManifest(events[0]);
    expect(retrieved?.manifest).toEqual(manifest);
  });

  it('should publish a post using a manifest and link them', async () => {
    // First, publish the manifest
    const manifest: NostrPostManifest = {
      id: 'simple-review',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
          required: true,
        },
        {
          id: 'rating',
          type: 'number',
          uiPlugin: 'stars',
          mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        },
      ],
    };

    const manifestEvent = manifestToEvent(manifest, keypair.pubkey);
    await relay.publish(mockSignEvent(manifestEvent, keypair.privkey));

    // Create form data
    const formData: FormData = {
      content: 'Great restaurant! The food was amazing.',
      rating: 5,
    };

    // Build manifest reference
    const manifestRef = buildManifestATag(keypair.pubkey, manifest.id);

    // Coordinate events with manifest reference
    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
      manifestRef,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Publish the post event
    const postEvent = result.data.events[0];
    const signedPost = mockSignEvent(postEvent, keypair.privkey);
    await relay.publish(signedPost);

    // Query the post
    const posts = await relay.query([{ kinds: [1], authors: [keypair.pubkey] }]);

    expect(posts).toHaveLength(1);
    expect(posts[0].content).toBe('Great restaurant! The food was amazing.');
    expect(posts[0].tags).toContainEqual(['r', '5']);
    expect(posts[0].tags).toContainEqual(['a', manifestRef]);
  });

  it('should handle multi-kind event bundles', async () => {
    const manifest: NostrPostManifest = {
      id: 'full-review',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1, 30078], default: true }],
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
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 30078, target: 'content', path: 'venue' },
        },
      ],
    };

    const formData: FormData = {
      review: 'Amazing experience!',
      rating: 5,
      venue: 'u09tvw',
    };

    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
      dTag: 'my-review-123',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Publish both events
    for (const event of result.data.events) {
      const signed = mockSignEvent(event, keypair.privkey);
      await relay.publish(signed);
    }

    // Query kind 1 (review text)
    const kind1Events = await relay.query([{ kinds: [1], authors: [keypair.pubkey] }]);
    expect(kind1Events).toHaveLength(1);
    expect(kind1Events[0].content).toBe('Amazing experience!');
    expect(kind1Events[0].tags).toContainEqual(['r', '5']);

    // Query kind 30078 (structured data)
    const kind30078Events = await relay.query([{ kinds: [30078], authors: [keypair.pubkey] }]);
    expect(kind30078Events).toHaveLength(1);
    const content = JSON.parse(kind30078Events[0].content);
    expect(content.venue).toBe('u09tvw');
  });

  it('should handle geohash prefix queries (NIP-52)', async () => {
    const manifest: NostrPostManifest = {
      id: 'geo-test',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
        {
          id: 'location',
          type: 'geo',
          uiPlugin: 'geo',
          mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        },
      ],
    };

    const formData: FormData = {
      content: 'Posting from this location',
      location: 'u09tvw',
    };

    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
    });

    if (!result.success) return;

    const event = result.data.events[0];
    const signed = mockSignEvent(event, keypair.privkey);
    await relay.publish(signed);

    // Query by full geohash
    let events = await relay.query([{ kinds: [1], '#g': ['u09tvw'] }]);
    expect(events).toHaveLength(1);

    // Query by prefix (should still match due to coordinator emitting all prefixes)
    events = await relay.query([{ kinds: [1], '#g': ['u09tv'] }]);
    expect(events).toHaveLength(1);

    events = await relay.query([{ kinds: [1], '#g': ['u09'] }]);
    expect(events).toHaveLength(1);
  });

  it('should handle hashtag queries', async () => {
    const manifest: NostrPostManifest = {
      id: 'hashtag-test',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
        {
          id: 'hashtags',
          type: 'string',
          uiPlugin: 'hashtag',
          mapTo: { kind: 1, target: 'tag', tagName: 't' },
        },
      ],
    };

    const formData: FormData = {
      content: 'Testing #nostr integration',
      hashtags: ['nostr', 'testing', 'bitcoin'],
    };

    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
    });

    if (!result.success) return;

    const event = result.data.events[0];
    const signed = mockSignEvent(event, keypair.privkey);
    await relay.publish(signed);

    // Query by hashtag
    const events = await relay.query([{ kinds: [1], '#t': ['nostr'] }]);
    expect(events).toHaveLength(1);

    // Auto-extracted hashtags should also be present
    expect(events[0].tags.filter((t) => t[0] === 't').map((t) => t[1])).toContain('nostr');
  });

  it('should replace parameterized replaceable events', async () => {
    const manifest: NostrPostManifest = {
      id: 'profile-data',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [30078], default: true }],
      fields: [
        {
          id: 'bio',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 30078, target: 'content', path: 'bio' },
        },
      ],
    };

    // Publish first version
    const formData1: FormData = { bio: 'First bio' };
    const result1 = coordinateEvents(manifest, formData1, {
      pubkey: keypair.pubkey,
      dTag: 'profile',
    });

    if (!result1.success) return;
    await relay.publish(mockSignEvent(result1.data.events[0], keypair.privkey));

    // Publish updated version (should replace)
    const formData2: FormData = { bio: 'Updated bio' };
    const result2 = coordinateEvents(manifest, formData2, {
      pubkey: keypair.pubkey,
      dTag: 'profile',
    });

    if (!result2.success) return;
    await relay.publish(mockSignEvent(result2.data.events[0], keypair.privkey));

    // Query - should only have one event (the latest)
    const events = await relay.query([{ kinds: [30078], authors: [keypair.pubkey] }]);

    expect(events).toHaveLength(1);
    const content = JSON.parse(events[0].content);
    expect(content.bio).toBe('Updated bio');
  });

  it('should handle manifest without linkManifest', async () => {
    const manifest: NostrPostManifest = {
      id: 'no-link-manifest',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      linkManifest: false,
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
      ],
    };

    const formData: FormData = {
      content: 'This post should not reference the manifest',
    };

    const manifestRef = buildManifestATag(keypair.pubkey, manifest.id);
    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
      manifestRef,
    });

    if (!result.success) return;

    const event = result.data.events[0];
    const signed = mockSignEvent(event, keypair.privkey);
    await relay.publish(signed);

    const events = await relay.query([{ kinds: [1], authors: [keypair.pubkey] }]);

    expect(events).toHaveLength(1);
    // Should not have 'a' tag even though manifestRef was provided
    expect(events[0].tags.find((t) => t[0] === 'a')).toBeUndefined();
  });
});
