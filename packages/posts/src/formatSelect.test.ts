import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { describe, expect, it } from 'vitest';
import { selectedFormatFor } from './formatSelect';

// Files as `<media>[:portrait]`, the way a media plugin would describe them
pluginRegistry.register({
  id: 'test-media',
  validate: () => ({ success: true, data: undefined }),
  formatValue: () => '',
  describeMedia: (value: unknown) =>
    (value as string[]).map((file) => {
      const [media, shape] = file.split(':');
      return { media: media as 'image' | 'video', portrait: shape === 'portrait' };
    }),
} as never);

const kinds = [20, 21, 22];
const manifest: NostrPostManifest = {
  id: 'media',
  version: '1.0.0',
  publishFormats: [
    {
      id: 'picture',
      label: 'Photos',
      kinds: [20],
      default: true,
      select: { field: 'media', media: 'image' },
    },
    {
      id: 'short',
      label: 'Short video',
      kinds: [22],
      select: { field: 'media', media: 'video', portrait: true },
    },
    { id: 'video', label: 'Video', kinds: [21], select: { field: 'media', media: 'video' } },
  ],
  fields: [
    {
      id: 'media',
      type: 'string',
      uiPlugin: 'test-media',
      mapTo: kinds.map((kind) => ({ kind, target: 'tag' as const, tagName: 'imeta' })),
    },
  ],
};

describe('selectedFormatFor', () => {
  it('picks the format all files fit, a portrait one first', () => {
    expect(selectedFormatFor(manifest, { media: ['image', 'image'] })).toBe('picture');
    expect(selectedFormatFor(manifest, { media: ['video:portrait'] })).toBe('short');
    expect(selectedFormatFor(manifest, { media: ['video:landscape'] })).toBe('video');
  });

  it('picks none for mixed files, no files, or formats without `select`', () => {
    expect(selectedFormatFor(manifest, { media: ['image', 'video'] })).toBeUndefined();
    expect(selectedFormatFor(manifest, { media: [] })).toBeUndefined();
    expect(
      selectedFormatFor({ ...manifest, publishFormats: [] }, { media: ['image'] })
    ).toBeUndefined();
  });
});
