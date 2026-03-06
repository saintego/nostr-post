import type { PostField } from '@nostr-post/plugins/types';
/**
 * Unit tests for hashtag plugin core
 */
import { describe, expect, it } from 'vitest';
import { extractHashtags, hashtagPlugin, normalizeTag } from './core';

describe('normalizeTag', () => {
  it('should lowercase tags', () => {
    expect(normalizeTag('NoStr')).toBe('nostr');
  });

  it('should remove leading #', () => {
    expect(normalizeTag('#bitcoin')).toBe('bitcoin');
    expect(normalizeTag('###bitcoin')).toBe('bitcoin');
  });

  it('should remove special characters', () => {
    expect(normalizeTag('hello@world')).toBe('helloworld');
  });

  it('should preserve hyphens and unicode', () => {
    expect(normalizeTag('web-3')).toBe('web-3');
    expect(normalizeTag('café')).toBe('café');
  });

  it('should trim whitespace', () => {
    expect(normalizeTag('  nostr  ')).toBe('nostr');
  });
});

describe('extractHashtags', () => {
  it('should extract hashtags from text', () => {
    const tags = extractHashtags('Check out #nostr and #bitcoin!');
    expect(tags).toEqual(['nostr', 'bitcoin']);
  });

  it('should handle no hashtags', () => {
    const tags = extractHashtags('No tags here');
    expect(tags).toEqual([]);
  });

  it('should deduplicate tags', () => {
    const tags = extractHashtags('#nostr #bitcoin #NOSTR #Bitcoin');
    expect(tags).toEqual(['nostr', 'bitcoin']);
  });

  it('should handle unicode hashtags', () => {
    const tags = extractHashtags('Testing #café and #日本語');
    expect(tags.length).toBeGreaterThan(0);
  });

  it('should handle hashtags at start and end', () => {
    const tags = extractHashtags('#start middle #end');
    expect(tags).toEqual(['start', 'end']);
  });

  it('should handle multiple # symbols', () => {
    const tags = extractHashtags('###nostr');
    expect(tags).toContain('nostr');
  });
});

describe('hashtagPlugin.validate', () => {
  const field: PostField = {
    id: 'hashtags',
    type: 'string',
    uiPlugin: 'hashtag',
    mapTo: { kind: 1, target: 'tag', tagName: 't' },
  };

  it('should validate array of strings', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!(['nostr', 'bitcoin'], field);
    expect(result.success).toBe(true);
  });

  it('should reject non-array values', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!('not-an-array', field);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_TYPE');
    }
  });

  it('should reject arrays with non-string values', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!(['valid', 123, 'tags'], field);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_TAG');
    }
  });

  it('should reject empty string tags', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!(['valid', '', 'tags'], field);
    expect(result.success).toBe(false);
  });

  it('should enforce maxTags limit', () => {
    const fieldWithLimit: PostField = {
      ...field,
      metadata: { maxTags: 3 },
    };
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!(['tag1', 'tag2', 'tag3', 'tag4'], fieldWithLimit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('TOO_MANY_TAGS');
    }
  });

  it('should accept up to maxTags', () => {
    const fieldWithLimit: PostField = {
      ...field,
      metadata: { maxTags: 3 },
    };
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!(['tag1', 'tag2', 'tag3'], fieldWithLimit);
    expect(result.success).toBe(true);
  });

  it('should use default maxTags of 20', () => {
    const manyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!(manyTags, field);
    expect(result.success).toBe(false);
  });

  it('should accept empty array', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.validate!([], field);
    expect(result.success).toBe(true);
  });
});

describe('hashtagPlugin.serializeValue', () => {
  it('should serialize array to comma-separated string', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.serializeValue!(['nostr', 'bitcoin', 'web3']);
    expect(result).toBe('nostr,bitcoin,web3');
  });

  it('should handle empty array', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.serializeValue!([]);
    expect(result).toBe('');
  });

  it('should stringify non-array values', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.serializeValue!('single-tag');
    expect(result).toBe('single-tag');
  });
});

describe('hashtagPlugin.deserializeValue', () => {
  const field: PostField = {
    id: 'hashtags',
    type: 'string',
    uiPlugin: 'hashtag',
    mapTo: { kind: 1, target: 'tag', tagName: 't' },
  };

  it('should deserialize comma-separated string to array', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.deserializeValue!('nostr,bitcoin,web3', field);
    expect(result).toEqual(['nostr', 'bitcoin', 'web3']);
  });

  it('should return empty array for empty string', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.deserializeValue!('', field);
    expect(result).toEqual([]);
  });

  it('should normalize tags during deserialization', () => {
    // biome-ignore lint/style/noNonNullAssertion: test helper
    const result = hashtagPlugin.deserializeValue!('NoStr,#Bitcoin,WEB-3', field);
    expect(result).toEqual(['nostr', 'bitcoin', 'web-3']);
  });
});
