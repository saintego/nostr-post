import { describe, expect, it } from 'vitest';
import { formDataFromAnswer, formDataSchema, PUBLISH_FORMAT_KEY } from './formDataSchema';
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

describe('formDataSchema', () => {
  it('describes the editable fields it knows, strictly', () => {
    const schema = formDataSchema(manifest);
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

  it("takes a value's schema from valueSchema: null leaves the field out", () => {
    const schema = formDataSchema(manifest, {
      valueSchema: (field) =>
        field.id === 'where' ? { type: 'string' } : field.id === 'score' ? null : undefined,
    });
    const properties = schema.properties as Record<string, unknown>;
    expect(properties.where).toBeDefined();
    expect(properties.score).toBeUndefined();
    expect(properties.title).toBeDefined();
  });

  it('makes multiple fields arrays', () => {
    const schema = formDataSchema({
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

describe('formDataFromAnswer', () => {
  it("keeps the manifest's fields without empty values, and a known format", () => {
    expect(
      formDataFromAnswer(manifest, {
        title: 'Hi',
        score: null,
        size: '',
        where: { lat: 1, label: null },
        other: 'x',
        [PUBLISH_FORMAT_KEY]: 'long',
      })
    ).toEqual({ formatId: 'long', formData: { title: 'Hi', where: { lat: 1 } } });
  });

  it('ignores unknown formats and non-objects', () => {
    expect(formDataFromAnswer(manifest, { [PUBLISH_FORMAT_KEY]: 'nope' })).toEqual({
      formData: {},
    });
    expect(formDataFromAnswer(manifest, [1])).toEqual({ formData: {} });
  });
});
