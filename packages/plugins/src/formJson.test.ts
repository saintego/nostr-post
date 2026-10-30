import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { formJsonSchema, parseFormJson } from './formJson';
import type { NostrUIPlugin } from './types';

const manifest: NostrPostManifest = {
  id: 'test-v1',
  version: '1.0.0',
  fields: [
    { id: 'title', type: 'string', uiPlugin: 'text', mapTo: { kind: 1, target: 'content' } },
    { id: 'when', type: 'date', uiPlugin: 'date', mapTo: { kind: 1, target: 'tag', tagName: 'd' } },
    { id: 'where', type: 'geo', uiPlugin: 'geo', mapTo: { kind: 1, target: 'tag', tagName: 'g' } },
    { id: 'who', type: 'ref', uiPlugin: 'who', mapTo: { kind: 1, target: 'tag', tagName: 'a' } },
  ],
};

const plugins: Record<string, NostrUIPlugin> = {
  date: { id: 'date', type: 'date', jsonSchema: () => ({ type: 'string' }) },
  geo: { id: 'geo', type: 'geo' },
  who: {
    id: 'who',
    type: 'ref',
    jsonSchema: () => ({ type: 'array', items: { type: 'string' } }),
    parseJson: async (value) => {
      const names = value as string[];
      return {
        value: names.filter((n) => n === 'Known').map((n) => ({ name: n })),
        suggestions: names
          .filter((n) => n !== 'Known')
          .map((n) => ({ label: n, action: 'create' as const, prefill: { name: n } })),
      };
    },
  },
};
const getPlugin = (id: string) => plugins[id];

describe('formJsonSchema', () => {
  it("uses plugins' value schemas and leaves out plugins without one", () => {
    const properties = formJsonSchema(manifest, getPlugin).properties as Record<string, unknown>;
    expect(Object.keys(properties)).toEqual(['title', 'when', 'who']);
  });
});

describe('parseFormJson', () => {
  it("applies plugins' parseJson and collects their suggestions", async () => {
    const result = await parseFormJson(
      manifest,
      { title: 'Hi', when: '2026-10-31', where: null, who: ['Known', 'Unknown'] },
      getPlugin
    );
    expect(result).toEqual({
      success: true,
      data: {
        formData: { title: 'Hi', when: '2026-10-31', who: [{ name: 'Known' }] },
        suggestions: {
          who: [{ label: 'Unknown', action: 'create', prefill: { name: 'Unknown' } }],
        },
      },
    });
  });
});
