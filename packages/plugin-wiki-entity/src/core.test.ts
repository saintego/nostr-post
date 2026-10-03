import type { NostrUIPlugin, PostField } from '@nostr-post/plugins/types';
import { describe, expect, it } from 'vitest';
import {
  type WikiEntityData,
  entityTypeAffixes,
  entityTypeDTag,
  matchesEntityQuery,
  matchesEntityType,
  wikiEntityPickerPlugin,
} from './core';

// Resolve optional plugin hooks once, failing loudly if one is missing.
function hook<K extends keyof NostrUIPlugin>(name: K): NonNullable<NostrUIPlugin[K]> {
  const fn = wikiEntityPickerPlugin[name];
  if (!fn) throw new Error(`wikiEntityPickerPlugin.${String(name)} is not defined`);
  return fn as NonNullable<NostrUIPlugin[K]>;
}
const validate = hook('validate');
const serializeValue = hook('serializeValue');
const extraTags = hook('extraTags');
const resolveFromTags = hook('resolveFromTags');

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
    const result = validate(validEntity, makeField());
    expect(result.success).toBe(true);
  });

  it('returns success for undefined when field is optional', () => {
    const result = validate(undefined, makeField({ required: false }));
    expect(result.success).toBe(true);
  });

  it('returns error for undefined when field is required', () => {
    const result = validate(undefined, makeField({ required: true }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('REQUIRED');
  });

  it('returns error for non-object value', () => {
    const result = validate('not-an-object', makeField());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_TYPE');
  });

  it('returns error when dTag is missing', () => {
    const result = validate({ ...validEntity, dTag: '' }, makeField());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_VALUE');
  });

  it('returns error when resolvedPubkey is missing', () => {
    const result = validate({ ...validEntity, resolvedPubkey: '' }, makeField());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_VALUE');
  });
});

// ── serializeValue ──────────────────────────────────────────────────────────

describe('wikiEntityPickerPlugin.serializeValue', () => {
  it('returns a NIP-33 a-tag address string', () => {
    const result = serializeValue(validEntity);
    expect(result).toBe('30818:abc123pubkey:pliny-the-elder');
  });

  it('returns empty string for null', () => {
    expect(serializeValue(null)).toBe('');
  });

  it('returns empty string for a non-object', () => {
    expect(serializeValue('bad')).toBe('');
  });
});

// ── extraTags ───────────────────────────────────────────────────────────────

describe('wikiEntityPickerPlugin.extraTags', () => {
  it('returns i-tags for each external ID', () => {
    const tags = extraTags(validEntity, makeField());
    expect(tags).toEqual([
      ['i', 'untappd:beer:4892'],
      ['i', 'rb:beer:9'],
    ]);
  });

  it('does NOT emit an a-tag (handled by serializeValue)', () => {
    const tags = extraTags(validEntity, makeField());
    const aTags = tags.filter((t) => t[0] === 'a');
    expect(aTags).toHaveLength(0);
  });

  it('returns empty array when externalIds is empty', () => {
    const tags = extraTags({ ...validEntity, externalIds: [] }, makeField());
    expect(tags).toEqual([]);
  });

  it('returns empty array for null value', () => {
    const tags = extraTags(null, makeField());
    expect(tags).toEqual([]);
  });
});

// ── resolveFromTags ─────────────────────────────────────────────────────────

describe('wikiEntityPickerPlugin.resolveFromTags', () => {
  const tags = [
    ['a', '30818:abc123pubkey:pliny-the-elder'],
    ['i', 'untappd:beer:4892'],
    ['i', 'rb:beer:9'],
  ];

  it('restores the entity including its i-tags', () => {
    expect(resolveFromTags(tags, makeField())).toEqual({
      dTag: 'pliny-the-elder',
      resolvedPubkey: 'abc123pubkey',
      externalIds: ['untappd:beer:4892', 'rb:beer:9'],
    });
  });

  it('ignores a-tags that are not wiki addresses', () => {
    const other = [['a', '30023:pk:article'], ...tags];
    const result = resolveFromTags(other, makeField()) as WikiEntityData;
    expect(result.dTag).toBe('pliny-the-elder');
  });

  it('does not attach i-tags when emitExtraTags is false', () => {
    const field = makeField({ metadata: { emitExtraTags: false } });
    const result = resolveFromTags(tags, field) as WikiEntityData;
    expect(result.externalIds).toEqual([]);
  });

  it('returns undefined when no wiki a-tag is present', () => {
    expect(resolveFromTags([['i', 'x']], makeField())).toBeUndefined();
  });

  it('round-trips with serializeValue + extraTags', () => {
    const field = makeField();
    const emitted = [['a', serializeValue(validEntity)], ...extraTags(validEntity, field)];
    const restored = resolveFromTags(emitted, field) as WikiEntityData;
    expect(restored.externalIds).toEqual(validEntity.externalIds);
    expect(serializeValue(restored)).toBe(serializeValue(validEntity));
  });
});

// ── matchesEntityQuery ──────────────────────────────────────────────────────

describe('matchesEntityQuery', () => {
  const tags = [
    ['d', 'pliny-the-elder'],
    ['title', 'Pliny the Elder'],
  ];

  it('matches on title, case-insensitive', () => {
    expect(matchesEntityQuery(tags, 'ELDER')).toBe(true);
  });

  it('matches on d-tag via the normalized slug', () => {
    expect(matchesEntityQuery(tags, 'pliny the')).toBe(true);
    expect(matchesEntityQuery([['d', 'pliny-the-elder']], 'Pliny The')).toBe(true);
  });

  it('rejects unrelated events (relays that ignore NIP-50 search)', () => {
    expect(
      matchesEntityQuery(
        [
          ['d', 'bitcoin'],
          ['title', 'Bitcoin'],
        ],
        'pliny'
      )
    ).toBe(false);
  });

  it('rejects an empty query', () => {
    expect(matchesEntityQuery(tags, '   ')).toBe(false);
  });
});

describe('entity type scoping', () => {
  const manifest = (wikiConfig: Record<string, string>) =>
    ({ id: 'm', version: '1', fields: [], wikiConfig }) as never;

  it('derives the suffix from dTagTemplate', () => {
    const affixes = entityTypeAffixes(
      manifest({ titleTemplate: '{title} (Beer)', dTagTemplate: '{title}-(beer)' })
    );
    expect(affixes).toEqual({ prefix: '', suffix: '-beer' });
    expect(entityTypeDTag('Bitcoin', affixes)).toBe('bitcoin-beer');
  });

  it('falls back to titleTemplate and supports prefixes', () => {
    expect(entityTypeAffixes(manifest({ titleTemplate: 'Brewery: {name}' }))).toEqual({
      prefix: 'brewery-',
      suffix: '',
    });
  });

  it('uses the text after the last placeholder', () => {
    expect(entityTypeAffixes(manifest({ dTagTemplate: '{title}-{brewery}-beer' }))).toEqual({
      prefix: '',
      suffix: '-beer',
    });
  });

  it('is unscoped without templates or placeholders', () => {
    expect(entityTypeAffixes(manifest({}))).toEqual({ prefix: '', suffix: '' });
    expect(entityTypeAffixes(manifest({ dTagTemplate: 'fixed' }))).toEqual({
      prefix: '',
      suffix: '',
    });
  });

  it('matches only d-tags of the type with a name part', () => {
    const affixes = { prefix: '', suffix: '-beer' };
    expect(matchesEntityType('bitcoin-beer', affixes)).toBe(true);
    expect(matchesEntityType('bitcoin', affixes)).toBe(false);
    expect(matchesEntityType('bitcoin-brewery', affixes)).toBe(false);
    expect(matchesEntityType('-beer', affixes)).toBe(false);
    expect(matchesEntityType('bitcoin', { prefix: '', suffix: '' })).toBe(true);
  });
});
