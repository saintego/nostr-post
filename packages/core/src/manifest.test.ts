/**
 * Unit tests for manifest validation and utilities
 */
import { describe, expect, it } from 'vitest';
import {
  findFieldById,
  getFieldsByKind,
  getRequiredFields,
  getUsedKinds,
  validateManifest,
  validateNostrTarget,
  validatePostField,
} from './manifest';
import {
  getActiveKinds,
  getDefaultPublishFormat,
  getManifestAvailableKinds,
  getFieldsByKind as getResolvedFieldsByKind,
} from './manifestMappings';
import type { NostrPostManifest, NostrTarget, PostField } from './types';

describe('validateNostrTarget', () => {
  it('should validate a valid content target', () => {
    const target: NostrTarget = {
      kind: 1,
      target: 'content',
    };
    const result = validateNostrTarget(target);
    expect(result.success).toBe(true);
  });

  it('should validate a valid tag target with tagName', () => {
    const target: NostrTarget = {
      kind: 1,
      target: 'tag',
      tagName: 't',
    };
    const result = validateNostrTarget(target);
    expect(result.success).toBe(true);
  });

  it('should reject tag target without tagName', () => {
    const target: NostrTarget = {
      kind: 1,
      target: 'tag',
    };
    const result = validateNostrTarget(target);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MISSING_TAG_NAME');
    }
  });

  it('should reject invalid kind numbers', () => {
    const target: NostrTarget = {
      kind: -1,
      target: 'content',
    };
    const result = validateNostrTarget(target);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_KIND');
    }
  });

  it('should reject kind numbers above 65535', () => {
    const target: NostrTarget = {
      kind: 70000,
      target: 'content',
    };
    const result = validateNostrTarget(target);
    expect(result.success).toBe(false);
  });
});

describe('validatePostField', () => {
  it('should validate a complete valid field', () => {
    const field: PostField = {
      id: 'content',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 1, target: 'content' },
      required: true,
    };
    const result = validatePostField(field);
    expect(result.success).toBe(true);
  });

  it('should reject field without id', () => {
    const field = {
      id: '',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 1, target: 'content' },
    } as PostField;
    const result = validatePostField(field);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MISSING_FIELD_ID');
    }
  });

  it('should reject field without uiPlugin', () => {
    const field = {
      id: 'test',
      type: 'string',
      uiPlugin: '',
      mapTo: { kind: 1, target: 'content' },
    } as PostField;
    const result = validatePostField(field);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MISSING_UI_PLUGIN');
    }
  });

  it('should reject enum type without options', () => {
    const field: PostField = {
      id: 'category',
      type: 'enum',
      uiPlugin: 'select',
      mapTo: { kind: 1, target: 'tag', tagName: 'category' },
    };
    const result = validatePostField(field);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('MISSING_ENUM_OPTIONS');
    }
  });

  it('should accept enum type with options', () => {
    const field: PostField = {
      id: 'category',
      type: 'enum',
      uiPlugin: 'select',
      mapTo: { kind: 1, target: 'tag', tagName: 'category' },
      options: ['food', 'tech', 'art'],
    };
    const result = validatePostField(field);
    expect(result.success).toBe(true);
  });
});

describe('validateManifest', () => {
  it('should validate a complete valid manifest', () => {
    const manifest: NostrPostManifest = {
      id: 'test-manifest',
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
      ],
    };
    const result = validateManifest(manifest);
    expect(result.success).toBe(true);
  });

  it('should reject manifest without id', () => {
    const manifest = {
      id: '',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [],
    } as NostrPostManifest;
    const result = validateManifest(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'MISSING_MANIFEST_ID')).toBe(true);
    }
  });

  it('should reject manifest without version', () => {
    const manifest = {
      id: 'test',
      version: '',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [],
    } as NostrPostManifest;
    const result = validateManifest(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'MISSING_VERSION')).toBe(true);
    }
  });

  it('should allow manifest without publishFormats and derive kinds from mappings', () => {
    const manifest = {
      id: 'test',
      version: '1.0.0',
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
      ],
    } as NostrPostManifest;
    const result = validateManifest(manifest);
    expect(result.success).toBe(true);
  });

  it('should allow manifest with empty publishFormats and derive kinds from mappings', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
      version: '1.0.0',
      publishFormats: [],
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
      ],
    };

    const result = validateManifest(manifest);
    expect(result.success).toBe(true);
  });

  it('should reject manifest without fields', () => {
    const manifest = {
      id: 'test',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [],
    } as NostrPostManifest;
    const result = validateManifest(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'MISSING_FIELDS')).toBe(true);
    }
  });

  it('should reject attachTo when target field does not exist', () => {
    const manifest: NostrPostManifest = {
      id: 'test-manifest',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [
        {
          id: 'title',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
          required: true,
        },
        {
          id: 'refs',
          type: 'string',
          uiPlugin: 'reference',
          attachTo: 'body',
          mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        },
      ],
    };

    const result = validateManifest(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'UNKNOWN_ATTACH_TARGET')).toBe(true);
    }
  });

  it('should reject attachTo when a field attaches to itself', () => {
    const manifest: NostrPostManifest = {
      id: 'test-manifest',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1], default: true }],
      fields: [
        {
          id: 'body',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
          required: true,
        },
        {
          id: 'tags',
          type: 'string',
          uiPlugin: 'hashtag',
          attachTo: 'tags',
          mapTo: { kind: 1, target: 'tag', tagName: 't' },
        },
      ],
    };

    const result = validateManifest(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'INVALID_ATTACH_TARGET')).toBe(true);
    }
  });

  it('should detect duplicate field IDs', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
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
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'tag', tagName: 't' },
        },
      ],
    };
    const result = validateManifest(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'DUPLICATE_FIELD_ID')).toBe(true);
    }
  });

  it('should detect publish format kinds without field mappings', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
      version: '1.0.0',
      publishFormats: [{ id: 'default', label: 'Default', kinds: [1, 30078], default: true }],
      fields: [
        {
          id: 'content',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
      ],
    };
    const result = validateManifest(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.some((e) => e.code === 'UNUSED_PUBLISH_FORMAT_KIND')).toBe(true);
    }
  });

  it('should validate complex multi-kind manifest', () => {
    const manifest: NostrPostManifest = {
      id: 'restaurant-review',
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
          id: 'stars',
          type: 'number',
          uiPlugin: 'stars',
          mapTo: { kind: 1, target: 'tag', tagName: 'r' },
          required: true,
        },
        {
          id: 'venue',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 30078, target: 'content', path: 'venue' },
        },
      ],
      metadata: {
        name: 'Restaurant Review',
        description: 'A manifest for restaurant reviews',
      },
    };
    const result = validateManifest(manifest);
    expect(result.success).toBe(true);
  });

  it('should validate manifest using publishFormats only', () => {
    const manifest: NostrPostManifest = {
      id: 'format-test',
      version: '1.0.0',
      publishFormats: [
        { id: 'kind1', label: 'Public note', kinds: [1], default: true },
        { id: 'nip78', label: 'Structured only', kinds: [30078] },
      ],
      fields: [
        {
          id: 'review',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: [
            { kind: 1, target: 'content' },
            { kind: 30078, target: 'content', path: 'review' },
          ],
        },
      ],
    };

    const result = validateManifest(manifest);
    expect(result.success).toBe(true);
  });
});

describe('getFieldsByKind', () => {
  const manifest: NostrPostManifest = {
    id: 'test',
    version: '1.0.0',
    publishFormats: [{ id: 'default', label: 'Default', kinds: [1, 30078], default: true }],
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
      {
        id: 'venue',
        type: 'geo',
        uiPlugin: 'venue',
        mapTo: { kind: 30078, target: 'content', path: 'venue' },
      },
    ],
  };

  it('should get fields for kind 1', () => {
    const fields = getFieldsByKind(manifest, 1);
    expect(fields).toHaveLength(2);
    expect(fields.map((f) => f.id)).toEqual(['content', 'hashtags']);
  });

  it('should get fields for kind 30078', () => {
    const fields = getFieldsByKind(manifest, 30078);
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe('venue');
  });

  it('should return empty array for unused kind', () => {
    const fields = getFieldsByKind(manifest, 999);
    expect(fields).toHaveLength(0);
  });

  it('should resolve first-active fields to the selected kind only', () => {
    const formatManifest: NostrPostManifest = {
      id: 'formats',
      version: '1.0.0',
      publishFormats: [
        { id: 'kind1', label: 'Kind 1', kinds: [1], default: true },
        { id: 'nip78', label: 'NIP-78', kinds: [30078] },
      ],
      fields: [
        {
          id: 'review',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: [
            { kind: 1, target: 'content' },
            { kind: 30078, target: 'content', path: 'review' },
          ],
        },
      ],
    };

    const fields = getResolvedFieldsByKind(
      formatManifest,
      30078,
      getActiveKinds(formatManifest, { selectedFormatId: 'nip78' })
    );
    expect(fields).toHaveLength(1);
    expect(Array.isArray(fields[0].mapTo)).toBe(false);
    if (!Array.isArray(fields[0].mapTo)) {
      expect(fields[0].mapTo.kind).toBe(30078);
    }
  });
});

describe('getUsedKinds', () => {
  it('should return all unique kinds used in manifest', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
      version: '1.0.0',
      fields: [
        {
          id: 'field1',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
        {
          id: 'field2',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'tag', tagName: 't' },
        },
        {
          id: 'field3',
          type: 'geo',
          uiPlugin: 'venue',
          mapTo: { kind: 30078, target: 'content' },
        },
      ],
    };
    const kinds = getUsedKinds(manifest);
    expect(kinds).toEqual([1, 30078]);
  });

  it('should return sorted kinds', () => {
    const manifest: NostrPostManifest = {
      id: 'test',
      version: '1.0.0',
      fields: [
        {
          id: 'field1',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 30078, target: 'content' },
        },
        {
          id: 'field2',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 1, target: 'content' },
        },
        {
          id: 'field3',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: { kind: 30023, target: 'content' },
        },
      ],
    };
    const kinds = getUsedKinds(manifest);
    expect(kinds).toEqual([1, 30023, 30078]);
  });

  it('should expose default and available kinds from publish formats', () => {
    const manifest: NostrPostManifest = {
      id: 'formats',
      version: '1.0.0',
      publishFormats: [
        { id: 'kind1', label: 'Kind 1', kinds: [1], default: true },
        { id: 'hybrid', label: 'Hybrid', kinds: [1, 30078] },
      ],
      fields: [
        {
          id: 'review',
          type: 'string',
          uiPlugin: 'textarea',
          mapTo: [
            { kind: 1, target: 'content' },
            { kind: 30078, target: 'content', path: 'review' },
          ],
        },
      ],
    };

    expect(getDefaultPublishFormat(manifest)?.id).toBe('kind1');
    expect(getManifestAvailableKinds(manifest)).toEqual([1, 30078]);
  });
});

describe('findFieldById', () => {
  const manifest: NostrPostManifest = {
    id: 'test',
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
        id: 'rating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
      },
    ],
  };

  it('should find existing field by ID', () => {
    const field = findFieldById(manifest, 'content');
    expect(field).toBeDefined();
    expect(field?.id).toBe('content');
  });

  it('should return undefined for non-existent field', () => {
    const field = findFieldById(manifest, 'nonexistent');
    expect(field).toBeUndefined();
  });
});

describe('getRequiredFields', () => {
  const manifest: NostrPostManifest = {
    id: 'test',
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
        required: true,
      },
      {
        id: 'optional',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 1, target: 'tag', tagName: 'optional' },
        required: false,
      },
    ],
  };

  it('should return only required fields', () => {
    const required = getRequiredFields(manifest);
    expect(required).toHaveLength(2);
    expect(required.map((f) => f.id)).toEqual(['content', 'rating']);
  });

  it('should return empty array when no required fields', () => {
    const manifestNoRequired: NostrPostManifest = {
      ...manifest,
      fields: manifest.fields.map((f) => ({ ...f, required: false })),
    };
    const required = getRequiredFields(manifestNoRequired);
    expect(required).toHaveLength(0);
  });
});
