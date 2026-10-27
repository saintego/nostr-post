import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
vi.mock('@nostr-post/signer', () => ({
  fetchEvents: (...args: unknown[]) => fetchEvents(...args),
}));

const { wikiEntityPickerPlugin } = await import('./core');
const { resolveEntityNames } = await import('./resolveNames');

const ARTIST: NostrPostManifest = {
  id: 'artist-v1',
  version: '1.0.0',
  wikiConfig: { dTagTemplate: '{title}-artist' },
  fields: [],
} as NostrPostManifest;

const page = (dTag: string, title: string) => ({
  id: dTag.padEnd(64, '0'),
  pubkey: 'a'.repeat(64),
  kind: 30818,
  created_at: 1,
  content: '',
  sig: '',
  tags: [
    ['d', dTag],
    ['title', title],
    ['i', `spotify:artist:${dTag}`],
  ],
});

describe('resolveEntityNames', () => {
  it('finds pages by the d-tag of the type, and lists the names without one', async () => {
    fetchEvents.mockResolvedValueOnce([page('doomsday-ceremony-artist', 'Doomsday Ceremony')]);
    const result = await resolveEntityNames(['Doomsday Ceremony', 'Nobody Yet'], {
      entityManifest: ARTIST,
    });
    expect(fetchEvents.mock.calls.at(-1)?.[0]).toMatchObject({
      kinds: [30818],
      '#d': ['doomsday-ceremony-artist', 'nobody-yet-artist'],
    });
    expect(result).toEqual({
      entities: [
        {
          dTag: 'doomsday-ceremony-artist',
          resolvedPubkey: 'a'.repeat(64),
          externalIds: ['spotify:artist:doomsday-ceremony-artist'],
          displayName: 'Doomsday Ceremony',
        },
      ],
      unresolved: ['Nobody Yet'],
    });
  });
});

describe('wikiEntityPickerPlugin answers', () => {
  const field = {
    id: 'performers',
    type: 'ref' as const,
    uiPlugin: 'wiki-entity-picker',
    mapTo: { kind: 31923, target: 'tag' as const, tagName: 'a' },
    metadata: { entityManifest: ARTIST, multiple: true },
  };

  it('asks for names', () => {
    expect(wikiEntityPickerPlugin.valueSchema?.(field)).toMatchObject({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('turns names into picked entities', async () => {
    fetchEvents.mockResolvedValueOnce([page('a-band-artist', 'A Band')]);
    const result = await wikiEntityPickerPlugin.fromAnswer?.(['A Band', 'Other'], field);
    expect(result?.value).toEqual([expect.objectContaining({ dTag: 'a-band-artist' })]);
    expect(result?.unresolved).toEqual(['Other']);
  });
});
