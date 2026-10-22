import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { renderTagPlugins } from './viewTagPlugins';

const manifest: NostrPostManifest = {
  id: 'event',
  version: '1.0.0',
  fields: [
    {
      id: 'mood',
      type: 'enum',
      uiPlugin: 'select',
      options: [{ value: 'calm', label: 'Calm' }],
      mapTo: { kind: 31922, target: 'tag', tagName: 'mood' },
      metadata: { label: 'Mood' },
    },
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 31922, target: 'tag', tagName: 'title' },
    },
    {
      id: 'secret',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: 31922, target: 'tag', tagName: 'x' },
      visibility: { view: 'hidden' },
    },
  ],
};

/** A template's text, nested templates included */
const text = (part: unknown): string => {
  if (Array.isArray(part)) return part.map(text).join('');
  if (part && typeof part === 'object' && 'strings' in part && 'values' in part) {
    const { strings, values } = part as { strings: readonly string[]; values: unknown[] };
    return strings.map((s, i) => s + (i < values.length ? text(values[i]) : '')).join('');
  }
  return part === undefined || part === null ? '' : String(part);
};

const texts = (results: ReturnType<typeof renderTagPlugins>) => results.map(text);

describe('renderTagPlugins', () => {
  it('shows built-in input fields as text, the title first', () => {
    const results = renderTagPlugins({
      kind: 31922,
      manifest,
      tags: [
        ['mood', 'calm'],
        ['title', 'Festival'],
        ['x', 'hidden'],
      ],
      tokens: [],
    });
    expect(results).toHaveLength(2);
    const [title, mood] = texts(results);
    expect(title).toContain('tag-title');
    expect(title).toContain('Festival');
    expect(mood).toContain('Mood:');
    expect(mood).toContain('Calm');
  });

  it('makes web links in text fields clickable', () => {
    const linkManifest: NostrPostManifest = {
      id: 'event',
      version: '1.0.0',
      fields: [
        {
          id: 'link',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 31922, target: 'tag', tagName: 'r' },
          metadata: { label: 'Link' },
        },
      ],
    };
    const [row] = renderTagPlugins({
      kind: 31922,
      manifest: linkManifest,
      tags: [['r', 'https://meet.example/abc']],
      tokens: [],
    });
    expect(text(row)).toContain('<a href=https://meet.example/abc');
  });
});
