import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
vi.mock('@nostr-post/signer', () => ({
  fetchEvents: (...args: unknown[]) => fetchEvents(...args),
}));

const { pluginRegistry } = await import('@nostr-post/plugins/registry');
const { wikiEntityPickerPlugin } = await import('./core');
const { entityItems, entityJsonSchema } = await import('./entityJson');
const { resolveEntities } = await import('./resolveEntities');

// A link field plugin writing `i` tags for its links (as plugin-embed does for profiles)
pluginRegistry.register({
  id: 'links',
  type: 'string',
  jsonSchema: () => ({ type: 'array', items: { type: 'string' } }),
  extraTags: (value) =>
    (Array.isArray(value) ? value : [value]).map((v): [string, string] => [
      'i',
      String(v).toLowerCase(),
    ]),
});

const MUSICIAN = {
  id: 'musician-v1',
  version: '1.0.0',
  wikiConfig: { dTagTemplate: '{title}-(musician)' },
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: 30818, target: 'table' },
    },
    {
      id: 'genres',
      type: 'string',
      uiPlugin: 'hashtag',
      mapTo: { kind: 30818, target: 'tag', tagName: 't' },
    },
    {
      id: 'media',
      type: 'string',
      uiPlugin: 'links',
      mapTo: { kind: 30818, target: 'tag', tagName: 'r' },
      metadata: { multiple: true },
    },
  ],
} as unknown as NostrPostManifest;

const page = (dTag: string, title: string, ids: string[] = []) => ({
  id: dTag.padEnd(64, '0'),
  pubkey: 'a'.repeat(64),
  kind: 30818,
  created_at: 1,
  content: '',
  sig: '',
  tags: [['d', dTag], ['title', title], ...ids.map((id) => ['i', id])],
});

const IG = 'https://www.instagram.com/doomsday';

describe('entityJsonSchema / entityItems', () => {
  it('asks for the name, link and hashtag fields only', () => {
    const schema = entityJsonSchema(MUSICIAN);
    expect(Object.keys(schema.properties as object)).toEqual(['title', 'genres', 'media']);
  });

  it("reads items with their links' ids, and plain names", () => {
    expect(
      entityItems(
        [{ title: 'Doomsday', media: ['https://www.Instagram.com/doomsday'] }, 'Other'],
        MUSICIAN
      )
    ).toEqual([
      {
        name: 'Doomsday',
        ids: [IG],
        prefill: { title: 'Doomsday', media: ['https://www.Instagram.com/doomsday'] },
      },
      { name: 'Other', ids: [], prefill: { title: 'Other' } },
    ]);
  });
});

describe('resolveEntities', () => {
  it('finds pages by link before name, and keeps the others unlinked', async () => {
    fetchEvents.mockResolvedValueOnce([
      // Found by its Instagram, though its slug differs
      page('doomsday-band-musician', 'Doomsday', [IG]),
      page('other-musician', 'Other'),
    ]);
    const items = entityItems(
      [{ title: 'Doomsday', media: [IG] }, 'Other', 'Nobody Yet'],
      MUSICIAN
    );
    const { entities, suggestions } = await resolveEntities(items, { entityManifest: MUSICIAN });
    expect(fetchEvents.mock.calls.at(-1)?.[0]).toEqual([
      { kinds: [30818], '#d': ['doomsday-musician', 'other-musician', 'nobody-yet-musician'] },
      { kinds: [30818], '#i': [IG] },
    ]);
    expect(entities.map((e) => [e.displayName, e.dTag, e.unlinked])).toEqual([
      ['Doomsday', 'doomsday-band-musician', undefined],
      ['Other', 'other-musician', undefined],
      ['Nobody Yet', '', true],
    ]);
    expect(suggestions).toEqual([
      { label: 'Nobody Yet', action: 'create', prefill: { title: 'Nobody Yet' } },
    ]);
  });

  it('a page with the name but other links is another entity', async () => {
    fetchEvents.mockResolvedValueOnce([
      page('doomsday-musician', 'Doomsday', ['https://www.instagram.com/someone-else']),
    ]);
    const items = entityItems([{ title: 'Doomsday', media: [IG] }], MUSICIAN);
    const { entities } = await resolveEntities(items, { entityManifest: MUSICIAN });
    expect(entities[0]).toMatchObject({
      unlinked: true,
      displayName: 'Doomsday',
      externalIds: [IG],
    });
  });

  it('suggests adding the links a found page lacks', async () => {
    fetchEvents.mockResolvedValueOnce([page('doomsday-musician', 'Doomsday')]);
    const items = entityItems([{ title: 'Doomsday', media: [IG] }], MUSICIAN);
    const { entities, suggestions } = await resolveEntities(items, { entityManifest: MUSICIAN });
    expect(entities[0]).toMatchObject({ dTag: 'doomsday-musician', externalIds: [IG] });
    expect(suggestions).toEqual([
      {
        label: 'Doomsday',
        action: 'update',
        address: `30818:${'a'.repeat(64)}:doomsday-musician`,
        prefill: { media: [IG] },
      },
    ]);
  });
});

describe('wikiEntityPickerPlugin', () => {
  const field = {
    id: 'performers',
    type: 'ref' as const,
    uiPlugin: 'wiki-entity-picker',
    mapTo: { kind: 31923, target: 'tag' as const, tagName: 'a' },
    metadata: { entityManifest: MUSICIAN, multiple: true },
  };

  it("asks for a list of the entity manifest's items", () => {
    expect(wikiEntityPickerPlugin.jsonSchema?.(field)).toMatchObject({
      type: 'array',
      items: { type: 'object', required: ['title', 'genres', 'media'] },
    });
  });

  it('writes no a tag for unlinked entities, but their links as i tags', () => {
    const unlinked = {
      dTag: '',
      resolvedPubkey: '',
      externalIds: [IG],
      displayName: 'X',
      unlinked: true as const,
    };
    expect(wikiEntityPickerPlugin.serializeValue?.(unlinked)).toBe('');
    expect(wikiEntityPickerPlugin.extraTags?.([unlinked], field)).toEqual([['i', IG]]);
    expect(wikiEntityPickerPlugin.validate?.([unlinked], field).success).toBe(true);
  });

  it('keeps the i tags when an event is read back for editing', () => {
    const value = wikiEntityPickerPlugin.resolveFromTags?.(
      [
        ['a', `30818:${'a'.repeat(64)}:x-musician`],
        ['i', IG],
      ],
      field
    );
    expect(value).toEqual([
      { dTag: 'x-musician', resolvedPubkey: 'a'.repeat(64), externalIds: [] },
      { dTag: '', resolvedPubkey: '', externalIds: [IG], unlinked: true },
    ]);
  });
});
