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

const texts = (results: ReturnType<typeof renderTagPlugins>) =>
  results.map((result) => [...result.strings].join('|') + result.values.join('|'));

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
    expect(mood).toContain('Mood');
    expect(mood).toContain('Calm');
  });
});
