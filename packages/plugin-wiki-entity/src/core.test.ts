import type { PostField } from '@nostr-post/plugins/types';
import { describe, expect, it } from 'vitest';
import { type WikiEntityData, wikiEntityPickerPlugin } from './core';

// Minimal PostField stub
const makeField = (overrides: Partial<PostField> = {}): PostField =>
  ({
    id: 'beer',
    type: 'ref',
    uiPlugin: 'wiki-entity-picker',
    mapTo: { kind: 1, target: 'tag', tagName: 'a' },
    required: false,
    ...overrides,
  }) as PostField;

const validEntity: WikiEntityData = {
  dTag: 'pliny-the-elder',
  resolvedPubkey: 'abc123pubkey',
  externalIds: ['untappd:beer:4892', 'rb:beer:9'],
  displayName: 'Pliny the Elder',
};

// ── validate ────────────────────────────────────────────────────────────────

describe('wikiEntityPickerPlugin.validate', () => {
  it('returns success for a valid entity', () => {
    const result = wikiEntityPickerPlugin.validate!(validEntity, makeField());
    expect(result.success).toBe(true);
  });

  it('returns success for undefined when field is optional', () => {
    const result = wikiEntityPickerPlugin.validate!(undefined, makeField({ required: false }));
    expect(result.success).toBe(true);
  });

  it('returns error for undefined when field is required', () => {
    const result = wikiEntityPickerPlugin.validate!(undefined, makeField({ required: true }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('REQUIRED');
  });

  it('returns error for non-object value', () => {
    const result = wikiEntityPickerPlugin.validate!('not-an-object', makeField());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_TYPE');
  });

  it('returns error when dTag is missing', () => {
    const result = wikiEntityPickerPlugin.validate!({ ...validEntity, dTag: '' }, makeField());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_VALUE');
  });

  it('returns error when resolvedPubkey is missing', () => {
    const result = wikiEntityPickerPlugin.validate!(
      { ...validEntity, resolvedPubkey: '' },
      makeField()
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_VALUE');
  });
});

// ── serializeValue ──────────────────────────────────────────────────────────

describe('wikiEntityPickerPlugin.serializeValue', () => {
  it('returns a NIP-33 a-tag address string', () => {
    const result = wikiEntityPickerPlugin.serializeValue!(validEntity);
    expect(result).toBe('30818:abc123pubkey:pliny-the-elder');
  });

  it('returns empty string for null', () => {
    expect(wikiEntityPickerPlugin.serializeValue!(null)).toBe('');
  });

  it('returns empty string for a non-object', () => {
    expect(wikiEntityPickerPlugin.serializeValue!('bad')).toBe('');
  });
});

// ── extraTags ───────────────────────────────────────────────────────────────

describe('wikiEntityPickerPlugin.extraTags', () => {
  it('returns i-tags for each external ID', () => {
    const tags = wikiEntityPickerPlugin.extraTags!(validEntity, makeField());
    expect(tags).toEqual([
      ['i', 'untappd:beer:4892'],
      ['i', 'rb:beer:9'],
    ]);
  });

  it('does NOT emit an a-tag (handled by serializeValue)', () => {
    const tags = wikiEntityPickerPlugin.extraTags!(validEntity, makeField());
    const aTags = tags.filter((t) => t[0] === 'a');
    expect(aTags).toHaveLength(0);
  });

  it('returns empty array when externalIds is empty', () => {
    const tags = wikiEntityPickerPlugin.extraTags!(
      { ...validEntity, externalIds: [] },
      makeField()
    );
    expect(tags).toEqual([]);
  });

  it('returns empty array for null value', () => {
    const tags = wikiEntityPickerPlugin.extraTags!(null, makeField());
    expect(tags).toEqual([]);
  });
});
