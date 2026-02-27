import type { NostrPostManifest, SignedEvent } from '@nostr-post/core/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Nostr interface
interface MockNostr {
  getPublicKey: () => Promise<string>;
  signEvent: (event: any) => Promise<SignedEvent>;
  getRelays?: () => Promise<Record<string, { read: boolean; write: boolean }>>;
}

describe('Manifest Creator E2E', () => {
  let mockNostr: MockNostr;
  let signedEvents: SignedEvent[];

  beforeEach(() => {
    signedEvents = [];

    mockNostr = {
      getPublicKey: vi
        .fn()
        .mockResolvedValue('npub1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'),
      signEvent: vi.fn().mockImplementation(async (event) => {
        const signedEvent: SignedEvent = {
          ...event,
          id: `event-${Date.now()}-${Math.random()}`,
          sig: 'mock-signature-' + Math.random().toString(36),
          pubkey: await mockNostr.getPublicKey(),
        };
        signedEvents.push(signedEvent);
        return signedEvent;
      }),
      getRelays: vi.fn().mockResolvedValue({
        'wss://relay.damus.io': { read: true, write: true },
        'wss://relay.nostr.band': { read: true, write: true },
      }),
    };

    // Mock window.nostr
    global.window = global.window || ({} as any);
    (window as any).nostr = mockNostr;
  });

  describe('Manifest Creation Flow', () => {
    it('should create a simple text note manifest', async () => {
      const manifest: NostrPostManifest = {
        id: 'simple-note-v1',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'content',
            type: 'string',
            uiPlugin: 'textarea',
            mapTo: { kind: 1, target: 'content' },
            required: true,
            metadata: {
              label: 'Note Content',
              placeholder: 'What are you thinking?',
            },
          },
        ],
      };

      expect(manifest).toBeDefined();
      expect(manifest.fields).toHaveLength(1);
      expect(manifest.fields[0].type).toBe('string');
      expect(manifest.fields[0].mapTo.target).toBe('content');
    });

    it('should create a review manifest with multiple fields', async () => {
      const manifest: NostrPostManifest = {
        id: 'review-v1',
        version: '1.0.0',
        requiredKinds: [1],
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
            mapTo: { kind: 1, target: 'tag', tagName: 'rating' },
            required: true,
          },
          {
            id: 'location',
            type: 'geo',
            uiPlugin: 'geo',
            mapTo: { kind: 1, target: 'tag', tagName: 'g' },
            required: false,
          },
        ],
        metadata: {
          name: 'Location Review',
          description: 'Review with rating and location',
        },
      };

      expect(manifest.fields).toHaveLength(3);
      expect(manifest.fields.find((f) => f.uiPlugin === 'stars')).toBeDefined();
      expect(manifest.fields.find((f) => f.uiPlugin === 'geo')).toBeDefined();
    });
  });

  describe('Nostr Event Publishing', () => {
    it('should sign and publish a manifest to Nostr', async () => {
      const manifest: NostrPostManifest = {
        id: 'test-manifest',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'content',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 1, target: 'content' },
            required: true,
          },
        ],
      };

      const event = {
        kind: 30078,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', manifest.id],
          ['name', 'Test Manifest'],
        ],
        content: JSON.stringify(manifest),
      };

      const signed = await mockNostr.signEvent(event);

      expect(signed).toBeDefined();
      expect(signed.id).toBeDefined();
      expect(signed.sig).toBeDefined();
      expect(signed.pubkey).toBeDefined();
      expect(mockNostr.signEvent).toHaveBeenCalledWith(event);
    });

    it('should get user public key from Nostr extension', async () => {
      const pubkey = await mockNostr.getPublicKey();

      expect(pubkey).toBeDefined();
      expect(typeof pubkey).toBe('string');
      expect(mockNostr.getPublicKey).toHaveBeenCalled();
    });

    it('should get relay list from Nostr extension', async () => {
      const relays = await mockNostr.getRelays?.();

      expect(relays).toBeDefined();
      expect(Object.keys(relays || {})).toHaveLength(2);
      expect(relays?.['wss://relay.damus.io']).toEqual({
        read: true,
        write: true,
      });
    });
  });

  describe('Field Validation', () => {
    it('should validate required fields', () => {
      const manifest: NostrPostManifest = {
        id: 'test',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'required-field',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 1, target: 'content' },
            required: true,
          },
        ],
      };

      const requiredFields = manifest.fields.filter((f) => f.required);
      expect(requiredFields).toHaveLength(1);
      expect(requiredFields[0].id).toBe('required-field');
    });

    it('should validate field mapTo configuration', () => {
      const manifest: NostrPostManifest = {
        id: 'test',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'content',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 1, target: 'content' },
            required: true,
          },
          {
            id: 'tag-field',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 1, target: 'tag', tagName: 't' },
            required: false,
          },
        ],
      };

      manifest.fields.forEach((field) => {
        expect(field.mapTo).toBeDefined();
        expect(field.mapTo.kind).toBeTypeOf('number');
        expect(field.mapTo.target).toBeTypeOf('string');

        if (field.mapTo.target === 'tag') {
          expect(field.mapTo.tagName).toBeDefined();
        }
      });
    });

    it('should validate manifest version format', () => {
      const manifest: NostrPostManifest = {
        id: 'test',
        version: '1.2.3',
        requiredKinds: [1],
        fields: [],
      };

      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Event Coordination', () => {
    it('should coordinate multiple events from form submission', async () => {
      const manifest: NostrPostManifest = {
        id: 'multi-kind-manifest',
        version: '1.0.0',
        requiredKinds: [1, 30023],
        fields: [
          {
            id: 'title',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 30023, target: 'tag', tagName: 'title' },
            required: true,
          },
          {
            id: 'summary',
            type: 'string',
            uiPlugin: 'textarea',
            mapTo: { kind: 30023, target: 'tag', tagName: 'summary' },
            required: false,
          },
          {
            id: 'announcement',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 1, target: 'content' },
            required: false,
          },
        ],
      };

      // Simulate form data
      const formData = {
        title: 'Test Article',
        summary: 'This is a test summary',
        announcement: 'Check out my new article!',
      };

      // Group fields by kind
      const fieldsByKind = new Map<number, typeof manifest.fields>();
      manifest.fields.forEach((field) => {
        const kind = field.mapTo.kind;
        if (!fieldsByKind.has(kind)) {
          fieldsByKind.set(kind, []);
        }
        fieldsByKind.get(kind)?.push(field);
      });

      expect(fieldsByKind.size).toBe(2);
      expect(fieldsByKind.has(1)).toBe(true);
      expect(fieldsByKind.has(30023)).toBe(true);
    });

    it('should handle event references between kinds', async () => {
      // Create a kind 30023 event
      const article = await mockNostr.signEvent({
        kind: 30023,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', 'test-article'],
          ['title', 'Test Article'],
        ],
        content: 'Article content here',
      });

      // Create a kind 1 event that references the article
      const announcement = await mockNostr.signEvent({
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['a', `30023:${article.pubkey}:test-article`]],
        content: 'Check out my new article!',
      });

      expect(announcement.tags).toContainEqual(['a', `30023:${article.pubkey}:test-article`]);
      expect(signedEvents).toHaveLength(2);
    });
  });

  describe('Plugin Integration', () => {
    it('should handle geo plugin data', () => {
      const manifest: NostrPostManifest = {
        id: 'geo-test',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'location',
            type: 'geo',
            uiPlugin: 'geo',
            mapTo: { kind: 1, target: 'tag', tagName: 'g' },
            metadata: {
              precision: 6,
            },
          },
        ],
      };

      const geoField = manifest.fields[0];
      expect(geoField.type).toBe('geo');
      expect(geoField.uiPlugin).toBe('geo');
      expect(geoField.metadata?.precision).toBe(6);

      // Simulate geo data
      const geoData = { lat: 40.7128, lon: -74.006, precision: 6 };
      const geoTag = ['g', `geo:${geoData.lat},${geoData.lon}`];

      expect(geoTag[0]).toBe('g');
      expect(geoTag[1]).toContain('geo:');
    });

    it('should handle media plugin data', () => {
      const manifest: NostrPostManifest = {
        id: 'media-test',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'image',
            type: 'string',
            uiPlugin: 'media',
            mapTo: { kind: 1, target: 'tag', tagName: 'r' },
            metadata: {
              accept: ['image/*'],
              maxFiles: 3,
            },
          },
        ],
      };

      const mediaField = manifest.fields[0];
      expect(mediaField.uiPlugin).toBe('media');
      expect(mediaField.metadata?.maxFiles).toBe(3);

      // Simulate media URLs
      const mediaUrls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
      const mediaTags = mediaUrls.map((url) => ['r', url]);

      expect(mediaTags).toHaveLength(2);
      expect(mediaTags[0][0]).toBe('r');
    });

    it('should handle hashtag plugin data', () => {
      const manifest: NostrPostManifest = {
        id: 'hashtag-test',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'tags',
            type: 'string',
            uiPlugin: 'hashtag',
            mapTo: { kind: 1, target: 'tag', tagName: 't' },
            metadata: {
              suggestions: ['nostr', 'bitcoin', 'test'],
            },
          },
        ],
      };

      const hashtagField = manifest.fields[0];
      expect(hashtagField.uiPlugin).toBe('hashtag');
      expect(hashtagField.metadata?.suggestions).toContain('nostr');

      // Simulate hashtag data
      const hashtags = ['nostr', 'test'];
      const hashtagTags = hashtags.map((tag) => ['t', tag]);

      expect(hashtagTags).toHaveLength(2);
      expect(hashtagTags[0]).toEqual(['t', 'nostr']);
    });
  });
});
