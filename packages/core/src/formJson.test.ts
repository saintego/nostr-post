import { describe, expect, it } from 'vitest';
import { formJsonSchema, PUBLISH_FORMAT_KEY, parseFormJson } from './formJson';
import type { NostrPostManifest } from './types';

const manifest: NostrPostManifest = {
  id: 'test-v1',
  version: '1.0.0',
  publishFormats: [
    { id: 'short', label: 'Short', kinds: [1], default: true },
    { id: 'long', label: 'Long', description: 'An article', kinds: [30023] },
  ],
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: 1, target: 'tag', tagName: 'title' },
      metadata: { label: 'Title', description: 'Name of the thing' },
    },
    {
      id: 'score',
      type: 'number',
      uiPlugin: 'stars',
      mapTo: { kind: 1, target: 'tag', tagName: 'rating' },
    },
    {
      id: 'size',
      type: 'enum',
      uiPlugin: 'select',
      options: ['s', { value: 'm', label: 'Medium' }],
      mapTo: { kind: 1, target: 'tag', tagName: 'size' },
    },
    {
      id: 'where',
      type: 'geo',
      uiPlugin: 'geo',
      mapTo: { kind: 1, target: 'tag', tagName: 'g' },
    },
    {
      id: 'secret',
      type: 'string',
      uiPlugin: 'text',
      visibility: { edit: 'hidden' },
      mapTo: { kind: 1, target: 'tag', tagName: 'x' },
    },
  ],
  metadata: { description: 'A test post' },
};

describe('formJsonSchema', () => {
  it('describes the editable fields it knows, strictly', () => {
    const schema = formJsonSchema(manifest);
    expect(schema).toMatchObject({
      type: 'object',
      description: 'A test post',
      additionalProperties: false,
      required: ['title', 'score', 'size', PUBLISH_FORMAT_KEY],
    });
    const properties = schema.properties as Record<string, unknown>;
    expect(properties.title).toEqual({ type: 'string', description: 'Title: Name of the thing' });
    expect(properties.score).toEqual({
      anyOf: [{ type: 'number', description: 'score' }, { type: 'null' }],
    });
    expect(properties.size).toEqual({
      anyOf: [{ enum: ['s', 'm'], description: 'size. One of: s, m (Medium)' }, { type: 'null' }],
    });
    expect(properties[PUBLISH_FORMAT_KEY]).toEqual({
      enum: ['short', 'long'],
      description: 'How to publish: short: Short; long: An article',
    });
  });

  it("takes a value's schema from jsonSchema: null leaves the field out", () => {
    const schema = formJsonSchema(manifest, {
      fieldSchema: (field) =>
        field.id === 'where' ? { type: 'string' } : field.id === 'score' ? null : undefined,
    });
    const properties = schema.properties as Record<string, unknown>;
    expect(properties.where).toBeDefined();
    expect(properties.score).toBeUndefined();
    expect(properties.title).toBeDefined();
  });

  it('makes multiple fields arrays', () => {
    const schema = formJsonSchema({
      ...manifest,
      fields: [
        {
          id: 'title',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 1, target: 'content' },
          metadata: { multiple: true },
        },
      ],
    });
    expect((schema.properties as Record<string, unknown>).title).toEqual({
      anyOf: [{ type: 'array', items: { type: 'string' }, description: 'title' }, { type: 'null' }],
    });
  });
});

describe('parseFormJson', () => {
  it("keeps the manifest's fields without empty values, and a known format", () => {
    expect(
      parseFormJson(manifest, {
        title: 'Hi',
        score: null,
        size: '',
        where: { lat: 1, label: null },
        other: 'x',
        [PUBLISH_FORMAT_KEY]: 'long',
      })
    ).toEqual({
      success: true,
      data: { formatId: 'long', formData: { title: 'Hi', where: { lat: 1 } } },
    });
  });

  it('reads the JSON object out of text, also wrapped in prose or code fences', () => {
    const text = 'Sure! ```json\n{"title": "Hi", "score": 4}\n```';
    expect(parseFormJson(manifest, text)).toEqual({
      success: true,
      data: { formData: { title: 'Hi', score: 4 } },
    });
  });

  it('fails on text without a JSON object and on non-objects; ignores unknown formats', () => {
    expect(parseFormJson(manifest, 'no json here').success).toBe(false);
    expect(parseFormJson(manifest, '{ broken').success).toBe(false);
    expect(parseFormJson(manifest, [1]).success).toBe(false);
    expect(parseFormJson(manifest, { [PUBLISH_FORMAT_KEY]: 'nope' })).toEqual({
      success: true,
      data: { formData: {} },
    });
  });
});
