/**
 * Unit tests for EventCoordinator
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { coordinateEvents, validateFormData } from './coordinator';
import type { CoordinatorConfig, FormData, NostrPostManifest } from './types';

describe('validateFormData', () => {
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
        required: true,
      },
      {
        id: 'rating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        required: false,
      },
      {
        id: 'category',
        type: 'enum',
        uiPlugin: 'select',
        mapTo: { kind: 1, target: 'tag', tagName: 'category' },
        options: ['food', 'tech', 'art'],
      },
    ],
  };

  it('should validate correct form data', () => {
    const formData: FormData = {
      content: 'This is a test post',
      rating: 5,
      category: 'food',
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(true);
  });

  it('should reject missing required field', () => {
    const formData: FormData = {
      rating: 5,
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    }
  });

  it('should reject unknown field', () => {
    const formData: FormData = {
      content: 'Test',
      unknownField: 'value',
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'UNKNOWN_FIELD')).toBe(true);
    }
  });

  it('should validate string type', () => {
    const formData: FormData = {
      content: 'Valid string',
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(true);
  });

  it('should accept string array for string type', () => {
    const formData: FormData = {
      content: ['string1', 'string2'],
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid string type', () => {
    const formData: FormData = {
      content: 123,
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'INVALID_TYPE')).toBe(true);
    }
  });

  it('should validate number type', () => {
    const formData: FormData = {
      content: 'Test',
      rating: 5,
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(true);
  });

  it('should reject NaN for number type', () => {
    const formData: FormData = {
      content: 'Test',
      rating: Number.NaN,
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(false);
  });

  it('should validate enum type', () => {
    const formData: FormData = {
      content: 'Test',
      category: 'tech',
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid enum value', () => {
    const formData: FormData = {
      content: 'Test',
      category: 'invalid',
    };
    const result = validateFormData(manifest, formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'INVALID_ENUM_VALUE')).toBe(true);
    }
  });

  it('should validate boolean type', () => {
    const boolManifest: NostrPostManifest = {
      ...manifest,
      fields: [
        ...manifest.fields,
        {
          id: 'published',
          type: 'boolean',
          uiPlugin: 'checkbox',
          mapTo: { kind: 1, target: 'tag', tagName: 'published' },
        },
      ],
    };
    const formData: FormData = {
      content: 'Test',
      published: true,
    };
    const result = validateFormData(boolManifest, formData);
    expect(result.success).toBe(true);
  });

  it('should validate geohash', () => {
    const geoManifest: NostrPostManifest = {
      ...manifest,
      fields: [
        ...manifest.fields,
        {
          id: 'location',
          type: 'geo',
          uiPlugin: 'geo',
          mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        },
      ],
    };
    const formData: FormData = {
      content: 'Test',
      location: 'u09tvw',
    };
    const result = validateFormData(geoManifest, formData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid geohash', () => {
    const geoManifest: NostrPostManifest = {
      ...manifest,
      fields: [
        ...manifest.fields,
        {
          id: 'location',
          type: 'geo',
          uiPlugin: 'geo',
          mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        },
      ],
    };
    const formData: FormData = {
      content: 'Test',
      location: 'invalid!@#',
    };
    const result = validateFormData(geoManifest, formData);
    expect(result.success).toBe(false);
  });

  it('should validate geohash object', () => {
    const geoManifest: NostrPostManifest = {
      ...manifest,
      fields: [
        ...manifest.fields,
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        },
      ],
    };
    const formData: FormData = {
      content: 'Test',
      venue: { geohash: 'u09tvw', name: 'Test Location' },
    };
    const result = validateFormData(geoManifest, formData);
    expect(result.success).toBe(true);
  });

  it('should validate ref type', () => {
    const refManifest: NostrPostManifest = {
      ...manifest,
      fields: [
        ...manifest.fields,
        {
          id: 'parentId',
          type: 'ref',
          uiPlugin: 'hidden',
          mapTo: { kind: 1, target: 'tag', tagName: 'e' },
        },
      ],
    };
    const formData: FormData = {
      content: 'Test',
      parentId: 'abc123def456',
    };
    const result = validateFormData(refManifest, formData);
    expect(result.success).toBe(true);
  });
});

describe('coordinateEvents', () => {
  let timestamp: number;

  beforeEach(() => {
    timestamp = Math.floor(Date.now() / 1000);
  });

  it('should create a simple Kind 1 event', () => {
    const manifest: NostrPostManifest = {
      id: 'simple-note',
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
      content: 'Hello Nostr!',
    };
    const config: CoordinatorConfig = {
      pubkey: 'testpubkey123',
      createdAt: timestamp,
    };

    const result = coordinateEvents(manifest, formData, config);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toHaveLength(1);
      const event = result.data.events[0];
      expect(event.kind).toBe(1);
      expect(event.content).toBe('Hello Nostr!');
      expect(event.pubkey).toBe('testpubkey123');
      expect(event.created_at).toBe(timestamp);
    }
  });

  it('should create tag target events', () => {
    const manifest: NostrPostManifest = {
      id: 'hashtag-note',
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
    const formData: FormData = {
      content: 'Test post',
      hashtags: ['nostr', 'testing'],
    };

    const result = coordinateEvents(manifest, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      expect(event.tags).toContainEqual(['t', 'nostr']);
      expect(event.tags).toContainEqual(['t', 'testing']);
    }
  });

  it('should create NIP-78 structured event', () => {
    const manifest: NostrPostManifest = {
      id: 'nip78-test',
      version: '1.0.0',
      requiredKinds: [30078],
      fields: [
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 30078, target: 'content', path: 'venue.location' },
        },
        {
          id: 'rating',
          type: 'number',
          uiPlugin: 'stars',
          mapTo: { kind: 30078, target: 'content', path: 'rating' },
        },
      ],
    };
    const formData: FormData = {
      venue: 'u09tvw',
      rating: 5,
    };
    const config: CoordinatorConfig = {
      dTag: 'my-review',
      createdAt: timestamp,
    };

    const result = coordinateEvents(manifest, formData, config);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      expect(event.kind).toBe(30078);
      const content = JSON.parse(event.content);
      expect(content.venue.location).toBe('u09tvw');
      expect(content.rating).toBe(5);
      expect(event.tags).toContainEqual(['d', 'my-review']);
    }
  });

  it('should add manifest reference tag when configured', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
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
    const formData: FormData = { content: 'Test' };
    const config: CoordinatorConfig = {
      manifestRef: '30078:pubkey123:nostr-post:test',
    };

    const result = coordinateEvents(manifest, formData, config);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      expect(event.tags).toContainEqual(['a', '30078:pubkey123:nostr-post:test']);
    }
  });

  it('should not add manifest reference when linkManifest is false', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
      version: '1.0.0',
      requiredKinds: [1],
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
    const formData: FormData = { content: 'Test' };
    const config: CoordinatorConfig = {
      manifestRef: '30078:pubkey123:nostr-post:test',
    };

    const result = coordinateEvents(manifest, formData, config);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      expect(event.tags.find((t) => t[0] === 'a')).toBeUndefined();
    }
  });

  it('should handle geohash with NIP-52 prefix emission', () => {
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
        },
      ],
    };
    const formData: FormData = {
      location: 'u09tvw',
    };

    const result = coordinateEvents(manifest, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      // Should emit all prefixes: u09tvw, u09tv, u09t, u09, u0
      expect(event.tags).toContainEqual(['g', 'u09tvw']);
      expect(event.tags).toContainEqual(['g', 'u09tv']);
      expect(event.tags).toContainEqual(['g', 'u09t']);
      expect(event.tags).toContainEqual(['g', 'u09']);
      expect(event.tags).toContainEqual(['g', 'u0']);
    }
  });

  it('should handle geohash object with NIP-52 prefix emission', () => {
    const manifest: NostrPostManifest = {
      id: 'venue-test',
      version: '1.0.0',
      requiredKinds: [1],
      fields: [
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 1, target: 'tag', tagName: 'g' },
        },
      ],
    };
    const formData: FormData = {
      venue: { geohash: 'u09tvw', name: 'Test Venue' },
    };

    const result = coordinateEvents(manifest, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      expect(event.tags).toContainEqual(['g', 'u09tvw']);
      expect(event.tags).toContainEqual(['g', 'u09tv']);
    }
  });

  it('should create multi-kind event bundle', () => {
    const manifest: NostrPostManifest = {
      id: 'multi-kind',
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
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 30078, target: 'content', path: 'venue' },
        },
      ],
    };
    const formData: FormData = {
      review: 'Great place!',
      rating: 5,
      venue: 'u09tvw',
    };

    const result = coordinateEvents(manifest, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toHaveLength(2);
      const kind1 = result.data.events.find((e) => e.kind === 1);
      const kind30078 = result.data.events.find((e) => e.kind === 30078);

      expect(kind1).toBeDefined();
      expect(kind30078).toBeDefined();
      expect(kind1?.content).toBe('Great place!');
      expect(kind1?.tags).toContainEqual(['r', '5']);
    }
  });

  it('should use custom tagSerializer', () => {
    const manifest: NostrPostManifest = {
      id: 'custom-serializer',
      version: '1.0.0',
      requiredKinds: [1],
      fields: [
        {
          id: 'tags',
          type: 'string',
          uiPlugin: 'hashtag',
          mapTo: { kind: 1, target: 'tag', tagName: 't' },
        },
      ],
    };
    const formData: FormData = {
      tags: ['NoStr', 'Bitcoin'],
    };
    const config: CoordinatorConfig = {
      tagSerializer: (value: unknown) => {
        if (typeof value === 'string') {
          return value.toLowerCase();
        }
        return undefined;
      },
    };

    const result = coordinateEvents(manifest, formData, config);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      expect(event.tags).toContainEqual(['t', 'nostr']);
      expect(event.tags).toContainEqual(['t', 'bitcoin']);
    }
  });

  it('should add default d-tag for parameterized replaceable events', () => {
    const manifest: NostrPostManifest = {
      id: 'replaceable-test',
      version: '1.0.0',
      requiredKinds: [30000],
      fields: [
        {
          id: 'data',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 30000, target: 'content' },
        },
      ],
    };
    const formData: FormData = { data: 'test' };

    const result = coordinateEvents(manifest, formData);

    expect(result.success).toBe(true);
    if (result.success) {
      const event = result.data.events[0];
      expect(event.tags).toContainEqual(['d', '']);
    }
  });

  it('should reject invalid manifest', () => {
    const manifest: NostrPostManifest = {
      id: '',
      version: '1.0.0',
      requiredKinds: [1],
      fields: [],
    };
    const formData: FormData = {};

    const result = coordinateEvents(manifest, formData);

    expect(result.success).toBe(false);
  });

  it('should reject invalid form data', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
      version: '1.0.0',
      requiredKinds: [1],
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
          required: true,
        },
      ],
    };
    const formData: FormData = {}; // Missing required field

    const result = coordinateEvents(manifest, formData);

    expect(result.success).toBe(false);
  });
});
