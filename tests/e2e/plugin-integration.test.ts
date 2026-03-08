/**
 * E2E tests for plugin integration with coordinator
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { coordinateEvents } from '../../packages/core/src/coordinator';
import type { FormData, NostrPostManifest } from '../../packages/core/src/types';
import { encodeGeohash, geoPlugin } from '../../packages/plugin-geo/src/core';
import { hashtagPlugin, normalizeTag } from '../../packages/plugin-hashtag/src/core';
import { MockNostrRelay, generateMockKeypair, mockSignEvent } from '../helpers/mock-relay';

describe('E2E: Plugin Integration', () => {
  let relay: MockNostrRelay;
  let keypair: { pubkey: string; privkey: string };

  beforeEach(() => {
    relay = new MockNostrRelay();
    keypair = generateMockKeypair();
  });

  it('should validate hashtag plugin data before publishing', () => {
    const manifest: NostrPostManifest = {
      id: 'hashtag-post',
      version: '1.0.0',
      requiredKinds: [1],
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
          metadata: { maxTags: 5 },
        },
      ],
    };

    // Valid data
    const validData: FormData = {
      content: 'Test post',
      hashtags: ['nostr', 'bitcoin', 'web3'],
    };

    const result1 = coordinateEvents(manifest, validData, {
      pubkey: keypair.pubkey,
    });
    expect(result1.success).toBe(true);

    // Invalid data - too many tags
    const invalidData: FormData = {
      content: 'Test post',
      hashtags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
    };

    const result2 = coordinateEvents(manifest, invalidData, {
      pubkey: keypair.pubkey,
    });
    // This should pass coordinator validation because it only checks types, not plugin-specific rules
    // Plugin validation would happen at the UI layer
    expect(result2.success).toBe(true);

    // But the plugin's validate function should catch it
    const pluginValidation = hashtagPlugin.validate(invalidData.hashtags, manifest.fields[1]);
    expect(pluginValidation.success).toBe(false);
  });

  it('should normalize hashtags before publishing', () => {
    const manifest: NostrPostManifest = {
      id: 'hashtag-normalize',
      version: '1.0.0',
      requiredKinds: [1],
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

    // Use custom tag serializer to normalize
    const formData: FormData = {
      content: 'Test post',
      hashtags: ['NoStr', '#Bitcoin', 'WEB-3'],
    };

    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
      tagSerializer: (value: unknown) => {
        if (typeof value === 'string') {
          return normalizeTag(value);
        }
        return undefined;
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const event = result.data.events[0];
    expect(event.tags).toContainEqual(['t', 'nostr']);
    expect(event.tags).toContainEqual(['t', 'bitcoin']);
    expect(event.tags).toContainEqual(['t', 'web-3']);
  });

  it('should encode coordinates to geohash using geo plugin', () => {
    const manifest: NostrPostManifest = {
      id: 'geo-post',
      version: '1.0.0',
      requiredKinds: [1],
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

    // Encode coordinates before submitting
    const lat = 37.7749;
    const lon = -122.4194;
    const geohash = encodeGeohash(lat, lon, 6);

    const formData: FormData = {
      content: 'Posting from San Francisco',
      location: geohash,
    };

    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // Validate the geohash
    const field = manifest.fields.find((f) => f.id === 'location');
    expect(field).toBeDefined();
    if (!field) return;
    const validation = geoPlugin.validate(geohash, field);
    expect(validation.success).toBe(true);

    const event = result.data.events[0];
    // Should have multiple g tags for NIP-52 prefix queries
    const gTags = event.tags.filter((t) => t[0] === 'g');
    expect(gTags.length).toBeGreaterThan(1);
  });

  it('should create complex multi-plugin post', async () => {
    const manifest: NostrPostManifest = {
      id: 'complex-post',
      version: '1.0.0',
      requiredKinds: [1, 30078],
      fields: [
        {
          id: 'review',
          type: 'string',
          uiPlugin: 'markdown',
          mapTo: { kind: 1, target: 'content' },
          required: true,
        },
        {
          id: 'hashtags',
          type: 'string',
          uiPlugin: 'hashtag',
          mapTo: { kind: 1, target: 'tag', tagName: 't' },
        },
        {
          id: 'rating',
          type: 'number',
          uiPlugin: 'stars',
          mapTo: { kind: 1, target: 'tag', tagName: 'r' },
          required: true,
        },
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 30078, target: 'content', path: 'venue.location' },
        },
        {
          id: 'venueName',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 30078, target: 'content', path: 'venue.name' },
        },
      ],
    };

    const formData: FormData = {
      review: '# Amazing Restaurant\n\nThe food was incredible!',
      hashtags: ['food', 'restaurant', 'sanfrancisco'],
      rating: 5,
      venue: encodeGeohash(37.7749, -122.4194, 6),
      venueName: 'The Golden Gate Bistro',
    };

    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
      dTag: 'restaurant-review-001',
      tagSerializer: (value: unknown) => {
        if (typeof value === 'string') {
          return normalizeTag(value);
        }
        return undefined;
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.events).toHaveLength(2);

    // Publish both events
    for (const event of result.data.events) {
      const signed = mockSignEvent(event, keypair.privkey);
      await relay.publish(signed);
    }

    // Query Kind 1 - review text
    const kind1Events = await relay.query([{ kinds: [1], authors: [keypair.pubkey] }]);

    expect(kind1Events).toHaveLength(1);
    expect(kind1Events[0].content).toContain('Amazing Restaurant');
    expect(kind1Events[0].tags).toContainEqual(['r', '5']);
    expect(kind1Events[0].tags).toContainEqual(['t', 'food']);

    // Query Kind 30078 - structured venue data
    const kind30078Events = await relay.query([{ kinds: [30078], authors: [keypair.pubkey] }]);

    expect(kind30078Events).toHaveLength(1);
    const venueData = JSON.parse(kind30078Events[0].content);
    expect(venueData.venue.name).toBe('The Golden Gate Bistro');
    expect(venueData.venue.location).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]+$/);

    // Query by hashtag
    const foodPosts = await relay.query([{ kinds: [1], '#t': ['food'] }]);
    expect(foodPosts).toHaveLength(1);

    // Query by location prefix
    const locationPosts = await relay.query([
      { kinds: [1], '#g': [formData.venue.substring(0, 4)] },
    ]);
    expect(locationPosts).toHaveLength(1);
  });

  it('should auto-extract hashtags from content', async () => {
    const manifest: NostrPostManifest = {
      id: 'auto-extract-test',
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

    const formData: FormData = {
      content: 'Testing #nostr and #bitcoin integration! #web3',
    };

    const result = coordinateEvents(manifest, formData, {
      pubkey: keypair.pubkey,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const event = result.data.events[0];
    const signed = mockSignEvent(event, keypair.privkey);
    await relay.publish(signed);

    // Auto-extracted tags should be present
    expect(event.tags).toContainEqual(['t', 'nostr']);
    expect(event.tags).toContainEqual(['t', 'bitcoin']);
    expect(event.tags).toContainEqual(['t', 'web3']);

    // Should be queryable by hashtags
    const events = await relay.query([{ kinds: [1], '#t': ['nostr'] }]);
    expect(events).toHaveLength(1);
  });

  it('should handle plugin serialize/deserialize round-trip', () => {
    // Test hashtag plugin
    const hashtags = ['nostr', 'bitcoin', 'web3'];
    const serialized = hashtagPlugin.serializeValue(hashtags);
    const deserialized = hashtagPlugin.deserializeValue(serialized as string);
    expect(deserialized).toEqual(hashtags);

    // Test geo plugin
    const geohash = 'u09tvw';
    const geoSerialized = geoPlugin.serializeValue(geohash);
    const geoDeserialized = geoPlugin.deserializeValue(geoSerialized);
    expect(geoDeserialized).toBe(geohash);
  });

  it('should format plugin values for display', () => {
    // Test hashtag formatting
    const hashtags = ['nostr', 'bitcoin'];
    const formatted = hashtagPlugin.formatValue(hashtags);
    expect(formatted).toBe('#nostr #bitcoin');

    // Test geo formatting
    const geohash = 'u09tvw';
    const geoFormatted = geoPlugin.formatValue(geohash);
    expect(geoFormatted).toContain('📍');
    expect(geoFormatted).toMatch(/\d+\.\d+, -?\d+\.\d+/);
  });
});
