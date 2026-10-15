import { describe, expect, it } from 'vitest';
import type { EventBundle, NostrPostManifest } from '../../packages/core/src/types';
import type { NostrUIPlugin } from '../../packages/plugins/src/types';
import { runBeforePublish, withTags } from '../../packages/web/src/composerSubmit';

const manifest = {
  id: 'hook-test',
  version: '1.0.0',
  fields: [
    {
      id: 'place',
      type: 'string',
      uiPlugin: 'hook-test-plugin',
      mapTo: { kind: 1, target: 'content' },
    },
    {
      id: 'empty',
      type: 'string',
      uiPlugin: 'hook-test-plugin',
      mapTo: { kind: 1, target: 'content' },
    },
    { id: 'text', type: 'string', uiPlugin: 'text', mapTo: { kind: 1, target: 'content' } },
  ],
} as unknown as NostrPostManifest;

const hookPlugin = {
  id: 'hook-test-plugin',
  type: 'string',
  beforePublish: async (value, field, ctx) => [['a', `30818:${ctx.pubkey}:${field.id}-${value}`]],
} as unknown as NostrUIPlugin;
const getPlugin = (id: string) => (id === 'hook-test-plugin' ? hookPlugin : undefined);

describe('beforePublish hooks', () => {
  it('runs hooks of fields with a value and collects their tags', async () => {
    const tags = await runBeforePublish(
      manifest,
      { place: 'louvre', empty: '', text: 'hi' },
      'pk',
      getPlugin
    );
    expect(tags).toEqual([['a', '30818:pk:place-louvre']]);
  });

  it('adds the tags to every event of the bundle', () => {
    const bundle = {
      events: [
        { kind: 1, content: '', created_at: 1, pubkey: 'pk', tags: [['t', 'x']] },
        { kind: 30078, content: '', created_at: 1, pubkey: 'pk', tags: [] },
      ],
    } as unknown as EventBundle;
    const result = withTags(bundle, [['a', '30818:pk:x']]);
    expect(result.events.map((e) => e.tags)).toEqual([
      [
        ['t', 'x'],
        ['a', '30818:pk:x'],
      ],
      [['a', '30818:pk:x']],
    ]);
    expect(withTags(bundle, [])).toBe(bundle);
  });
});
