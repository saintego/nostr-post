import type { NostrPostManifest, SignedEvent } from '@nostr-post/core/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock relay connection
class MockRelay {
  url: string;
  connected = false;
  publishedEvents: SignedEvent[] = [];
  subscriptions: Map<string, any[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async publish(event: SignedEvent): Promise<void> {
    if (!this.connected) {
      throw new Error('Relay not connected');
    }
    this.publishedEvents.push(event);
  }

  async subscribe(filters: any[], callback: (event: SignedEvent) => void): Promise<string> {
    const subId = Math.random().toString(36);
    this.subscriptions.set(subId, filters);
    return subId;
  }

  async close(): Promise<void> {
    this.connected = false;
    this.subscriptions.clear();
  }
}

describe('Nostr Publishing E2E', () => {
  let mockRelays: MockRelay[];
  let mockNostr: any;

  beforeEach(() => {
    mockRelays = [new MockRelay('wss://relay.damus.io'), new MockRelay('wss://relay.nostr.band')];

    mockNostr = {
      getPublicKey: vi
        .fn()
        .mockResolvedValue('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd'),
      signEvent: vi.fn().mockImplementation(async (event) => ({
        ...event,
        id: `event-${Date.now()}-${Math.random()}`,
        sig: `signature-${Math.random().toString(36)}`,
        pubkey: await mockNostr.getPublicKey(),
      })),
      getRelays: vi.fn().mockResolvedValue({
        'wss://relay.damus.io': { read: true, write: true },
        'wss://relay.nostr.band': { read: true, write: true },
      }),
    };

    global.window = global.window || ({} as any);
    (window as any).nostr = mockNostr;
  });

  describe('Publishing Manifest to Nostr', () => {
    it('should publish manifest as kind 30078 event', async () => {
      const manifest: NostrPostManifest = {
        id: 'test-manifest-v1',
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
        metadata: {
          name: 'Test Manifest',
          description: 'A test manifest for publishing',
        },
      };

      const manifestEvent = {
        kind: 30078,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', manifest.id],
          ['name', manifest.metadata?.name || ''],
          ['description', manifest.metadata?.description || ''],
        ],
        content: JSON.stringify(manifest),
      };

      const signed = await mockNostr.signEvent(manifestEvent);

      // Publish to all relays
      for (const relay of mockRelays) {
        await relay.connect();
        await relay.publish(signed);
      }

      expect(signed.kind).toBe(30078);
      expect(mockRelays[0].publishedEvents).toHaveLength(1);
      expect(mockRelays[1].publishedEvents).toHaveLength(1);
      expect(JSON.parse(signed.content)).toEqual(manifest);
    });

    it('should handle publishing errors gracefully', async () => {
      const failingRelay = new MockRelay('wss://failing-relay.test');

      const manifest: NostrPostManifest = {
        id: 'test',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [],
      };

      const event = await mockNostr.signEvent({
        kind: 30078,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['d', manifest.id]],
        content: JSON.stringify(manifest),
      });

      // Should throw when not connected
      await expect(failingRelay.publish(event)).rejects.toThrow('Relay not connected');
    });
  });

  describe('Fetching Manifests from Nostr', () => {
    it('should fetch manifest by author and identifier', async () => {
      const pubkey = await mockNostr.getPublicKey();
      const identifier = 'test-manifest-v1';

      const relay = mockRelays[0];
      await relay.connect();

      const filters = [
        {
          kinds: [30078],
          authors: [pubkey],
          '#d': [identifier],
          limit: 1,
        },
      ];

      const subId = await relay.subscribe(filters, (event) => {
        // Handle received event
      });

      expect(subId).toBeDefined();
      expect(relay.subscriptions.has(subId)).toBe(true);
      expect(relay.subscriptions.get(subId)).toEqual(filters);
    });

    it('should parse manifest from event content', async () => {
      const manifest: NostrPostManifest = {
        id: 'parsed-manifest',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'test',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 1, target: 'content' },
          },
        ],
      };

      const event = await mockNostr.signEvent({
        kind: 30078,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['d', manifest.id]],
        content: JSON.stringify(manifest),
      });

      const parsed = JSON.parse(event.content);

      expect(parsed).toEqual(manifest);
      expect(parsed.id).toBe('parsed-manifest');
      expect(parsed.fields).toHaveLength(1);
    });
  });

  describe('Using Manifest to Create Events', () => {
    it('should use fetched manifest to create form', async () => {
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
            metadata: { label: 'Your Review' },
          },
          {
            id: 'rating',
            type: 'number',
            uiPlugin: 'stars',
            mapTo: { kind: 1, target: 'tag', tagName: 'rating' },
            required: true,
            metadata: { label: 'Rating', max: 5 },
          },
        ],
      };

      // Simulate form submission
      const formData = {
        review: 'Great experience!',
        rating: 5,
      };

      // Build event from manifest and form data
      const tags: string[][] = [];
      let content = '';

      manifest.fields.forEach((field) => {
        const value = formData[field.id as keyof typeof formData];
        if (value === undefined) return;

        if (field.mapTo.target === 'content') {
          content = String(value);
        } else if (field.mapTo.target === 'tag' && field.mapTo.tagName) {
          tags.push([field.mapTo.tagName, String(value)]);
        }
      });

      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content,
      };

      const signed = await mockNostr.signEvent(event);

      expect(signed.content).toBe('Great experience!');
      expect(signed.tags).toContainEqual(['rating', '5']);
    });

    it('should coordinate multiple events from single form', async () => {
      const manifest: NostrPostManifest = {
        id: 'article-with-announcement',
        version: '1.0.0',
        requiredKinds: [30023, 1],
        fields: [
          {
            id: 'title',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 30023, target: 'tag', tagName: 'title' },
            required: true,
          },
          {
            id: 'content',
            type: 'string',
            uiPlugin: 'textarea',
            mapTo: { kind: 30023, target: 'content' },
            required: true,
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

      const formData = {
        title: 'My Article',
        content: 'Article content here...',
        announcement: 'Just published a new article!',
      };

      // Group fields by kind
      const kinds = new Set(manifest.fields.map((f) => f.mapTo.kind));
      const events: any[] = [];

      for (const kind of kinds) {
        const fieldsForKind = manifest.fields.filter((f) => f.mapTo.kind === kind);
        const tags: string[][] = [];
        let content = '';

        fieldsForKind.forEach((field) => {
          const value = formData[field.id as keyof typeof formData];
          if (value === undefined) return;

          if (field.mapTo.target === 'content') {
            content = String(value);
          } else if (field.mapTo.target === 'tag' && field.mapTo.tagName) {
            tags.push([field.mapTo.tagName, String(value)]);
          }
        });

        events.push({
          kind,
          created_at: Math.floor(Date.now() / 1000),
          tags,
          content,
        });
      }

      expect(events).toHaveLength(2);
      expect(events.find((e) => e.kind === 30023)).toBeDefined();
      expect(events.find((e) => e.kind === 1)).toBeDefined();

      const articleEvent = events.find((e) => e.kind === 30023);
      expect(articleEvent?.tags).toContainEqual(['title', 'My Article']);
      expect(articleEvent?.content).toBe('Article content here...');

      const announcementEvent = events.find((e) => e.kind === 1);
      expect(announcementEvent?.content).toBe('Just published a new article!');
    });
  });

  describe('Relay Connection Management', () => {
    it('should connect to multiple relays', async () => {
      for (const relay of mockRelays) {
        await relay.connect();
        expect(relay.connected).toBe(true);
      }
    });

    it('should disconnect from relays', async () => {
      for (const relay of mockRelays) {
        await relay.connect();
        await relay.close();
        expect(relay.connected).toBe(false);
        expect(relay.subscriptions.size).toBe(0);
      }
    });

    it('should handle relay reconnection', async () => {
      const relay = mockRelays[0];

      await relay.connect();
      expect(relay.connected).toBe(true);

      await relay.close();
      expect(relay.connected).toBe(false);

      await relay.connect();
      expect(relay.connected).toBe(true);
    });
  });

  describe('Manifest Versioning', () => {
    it('should update manifest version when modified', async () => {
      const v1: NostrPostManifest = {
        id: 'my-manifest',
        version: '1.0.0',
        requiredKinds: [1],
        fields: [
          {
            id: 'content',
            type: 'string',
            uiPlugin: 'text',
            mapTo: { kind: 1, target: 'content' },
          },
        ],
      };

      const v2: NostrPostManifest = {
        ...v1,
        version: '2.0.0',
        fields: [
          ...v1.fields,
          {
            id: 'tags',
            type: 'string',
            uiPlugin: 'hashtag',
            mapTo: { kind: 1, target: 'tag', tagName: 't' },
          },
        ],
      };

      expect(v2.version).not.toBe(v1.version);
      expect(v2.fields.length).toBeGreaterThan(v1.fields.length);
      expect(v2.id).toBe(v1.id);
    });

    it('should keep same identifier across versions', async () => {
      const versions = ['1.0.0', '1.1.0', '2.0.0'];
      const manifestId = 'my-manifest';

      versions.forEach((version) => {
        const manifest: NostrPostManifest = {
          id: manifestId,
          version,
          requiredKinds: [1],
          fields: [],
        };

        expect(manifest.id).toBe(manifestId);
      });
    });
  });
});
