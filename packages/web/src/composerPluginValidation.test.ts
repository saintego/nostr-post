import { pluginRegistry } from '@nostr-post/plugins/registry';
import { describe, expect, it } from 'vitest';
import { validateWithPlugins } from './composerSubmit';

const manifest = {
  id: 'event',
  version: '1.0.0',
  publishFormats: [
    { id: 'all-day', label: 'All-day', kinds: [31922], default: true, userSelectable: true },
    { id: 'timed', label: 'Timed', kinds: [31923], userSelectable: true },
  ],
  fields: [
    {
      id: 'when',
      type: 'date' as const,
      uiPlugin: 'test-date',
      mapTo: [
        { kind: 31922, target: 'tag' as const, tagName: 'start' },
        { kind: 31923, target: 'tag' as const, tagName: 'start' },
      ],
    },
  ],
};

// Records the kinds it was checked for, and rejects an end before the start
const seenKinds: number[][] = [];
pluginRegistry.register({
  id: 'test-date',
  type: 'date',
  validate: (value, field) => {
    const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
    seenKinds.push(targets.map((t) => t.kind));
    const { start, end } = value as { start: string; end?: string };
    return end && end < start
      ? { success: false, error: { field: field.id, message: 'End before start', code: 'X' } }
      : { success: true, data: undefined };
  },
});

describe('validateWithPlugins', () => {
  it("returns the plugins' errors by field", () => {
    expect(
      validateWithPlugins(manifest, { when: { start: '2026-10-22', end: '2026-10-21' } })
    ).toEqual({
      when: 'End before start',
    });
    expect(validateWithPlugins(manifest, { when: { start: '2026-10-22' } })).toEqual({});
    expect(validateWithPlugins(manifest, {})).toEqual({});
  });

  it('checks a field as written for the selected format', () => {
    seenKinds.length = 0;
    validateWithPlugins(manifest, { when: { start: '2026-10-22' } }, 'timed');
    expect(seenKinds).toEqual([[31923]]);
  });
});
