import { describe, expect, it } from 'vitest';
import { validateFieldType } from './fieldTypeValidation';
import type { PostField } from './types';

const field = (type: PostField['type']): PostField => ({
  id: 'f',
  type,
  uiPlugin: 'test',
  mapTo: { kind: 30078, target: 'content', path: 'f' },
});

describe("validateFieldType: 'object'", () => {
  it('accepts an object or a list of objects', () => {
    expect(validateFieldType(field('object'), { type: 'link', value: 'https://a.b' }).success).toBe(
      true
    );
    expect(validateFieldType(field('object'), [{ a: 1 }, { b: 2 }]).success).toBe(true);
  });

  it('rejects text, null and nested lists', () => {
    expect(validateFieldType(field('object'), 'text').success).toBe(false);
    expect(validateFieldType(field('object'), [{ a: 1 }, null]).success).toBe(false);
    expect(validateFieldType(field('object'), [[{ a: 1 }]]).success).toBe(false);
  });

  it("still keeps 'string' fields to text", () => {
    expect(validateFieldType(field('string'), [{ a: 1 }]).success).toBe(false);
  });
});
