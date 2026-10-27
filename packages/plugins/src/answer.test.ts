import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { answerSchema, answerToFormData } from './answer';
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
  date: { id: 'date', type: 'date', valueSchema: () => ({ type: 'string' }) },
  geo: { id: 'geo', type: 'geo' },
  who: {
    id: 'who',
    type: 'ref',
    valueSchema: () => ({ type: 'array', items: { type: 'string' } }),
    fromAnswer: async (value) => {
      const names = value as string[];
      return {
        value: names.filter((n) => n === 'Known').map((n) => ({ name: n })),
        unresolved: names.filter((n) => n !== 'Known'),
      };
    },
  },
};
const getPlugin = (id: string) => plugins[id];

describe('answerSchema', () => {
  it("uses plugins' value schemas and leaves out plugins without one", () => {
    const properties = answerSchema(manifest, getPlugin).properties as Record<string, unknown>;
    expect(Object.keys(properties)).toEqual(['title', 'when', 'who']);
  });
});

describe('answerToFormData', () => {
  it("applies plugins' fromAnswer and reports what they couldn't resolve", async () => {
    const result = await answerToFormData(
      manifest,
      { title: 'Hi', when: '2026-10-31', where: null, who: ['Known', 'Unknown'] },
      getPlugin
    );
    expect(result).toEqual({
      formData: { title: 'Hi', when: '2026-10-31', who: [{ name: 'Known' }] },
      unresolved: { who: ['Unknown'] },
    });
  });
});
