import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
const fetchEventsFromRelay = vi.fn();
const signEvent = vi.fn();
const publishToRelays = vi.fn();
vi.mock('@nostr-post/signer', () => ({
  fetchEvents: (...args: unknown[]) => fetchEvents(...args),
  fetchEventsFromRelay: (...args: unknown[]) => fetchEventsFromRelay(...args),
  signEvent: (...args: unknown[]) => signEvent(...args),
  publishToRelays: (...args: unknown[]) => publishToRelays(...args),
  getPublishRelays: async (_pubkey: string, relays: string[]) => relays,
}));

const { createEntityPage, createsPage } = await import('./entityPage');

const author = 'b'.repeat(64);
const artist = {
  id: 'musician',
  version: '1',
  wikiConfig: { titleTemplate: '{title} (musician)', dTagTemplate: '{title}-(musician)' },
  fields: [
    {
      id: 'title',
      type: 'string' as const,
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: 30818, target: 'table' as const },
    },
    {
      id: 'genres',
      type: 'string' as const,
      uiPlugin: 'hashtag',
      mapTo: { kind: 30818, target: 'tag' as const, tagName: 't' },
    },
  ],
};
const field = {
  id: 'performers',
  type: 'ref' as const,
  uiPlugin: 'wiki-entity-picker',
  mapTo: { kind: 31923, target: 'tag' as const, tagName: 'a' },
  metadata: { entityManifest: artist, multiple: true, relays: ['wss://relay'] },
};
const unlinked = (extra: Record<string, unknown> = {}) => ({
  dTag: '',
  resolvedPubkey: '',
  externalIds: ['instagram:naraka'],
  displayName: 'Naraka',
  unlinked: true as const,
  prefill: { title: 'Naraka', genres: ['metal'] },
  ...extra,
});
/** Slugs taken on the relay */
const taken = (dTags: string[]) =>
  fetchEventsFromRelay.mockImplementation(async (_relay: string, filter: { '#d': string[] }) =>
    dTags.includes(filter['#d'][0] ?? '') ? [{ id: 'x' }] : []
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchEvents.mockResolvedValue([]);
  taken([]);
  signEvent.mockImplementation(async (e: object) => ({ ...e, pubkey: author, id: 'i', sig: 's' }));
  publishToRelays.mockResolvedValue({ success: 1 });
});

describe('createsPage', () => {
  it('creates pages of named unlinked entities with links, unless unticked', () => {
    expect(createsPage(unlinked())).toBe(true);
    expect(createsPage(unlinked({ createPage: false }))).toBe(false);
    // A name alone: only when ticked (namesakes)
    expect(createsPage(unlinked({ externalIds: [] }))).toBe(false);
    expect(createsPage(unlinked({ externalIds: [], createPage: true }))).toBe(true);
    // The nameless value that only keeps an edited event's links
    expect(createsPage(unlinked({ displayName: undefined }))).toBe(false);
    expect(createsPage({ dTag: 'x', resolvedPubkey: author, externalIds: [] })).toBe(false);
  });
});

describe('createEntityPage', () => {
  it("publishes the page from the entity's prefill and links it", async () => {
    const tags = await createEntityPage(unlinked(), field as never);
    expect(tags).toEqual([['a', `30818:${author}:naraka-musician`]]);
    const page = signEvent.mock.calls[0]?.[0] as { kind: number; tags: string[][] };
    expect(page.kind).toBe(30818);
    expect(page.tags).toContainEqual(['d', 'naraka-musician']);
    expect(page.tags).toContainEqual(['title', 'Naraka (musician)']);
  });

  it('publishes nothing when unticked', async () => {
    expect(await createEntityPage(unlinked({ createPage: false }), field as never)).toEqual([]);
    expect(signEvent).not.toHaveBeenCalled();
  });

  it('links a page of its type published meanwhile (by its links)', async () => {
    fetchEvents.mockResolvedValueOnce([
      { kind: 30818, pubkey: 'c'.repeat(64), created_at: 1, tags: [['d', 'naraka-venue']] },
      { kind: 30818, pubkey: 'c'.repeat(64), created_at: 1, tags: [['d', 'naraka-musician']] },
    ]);
    const tags = await createEntityPage(unlinked(), field as never);
    expect(tags).toEqual([['a', `30818:${'c'.repeat(64)}:naraka-musician`]]);
    expect(signEvent).not.toHaveBeenCalled();
  });

  it("gives a taken slug a qualifier, and never overwrites another entity's page", async () => {
    taken(['naraka-musician']);
    const tags = await createEntityPage(unlinked(), field as never);
    expect(tags).toEqual([['a', `30818:${author}:naraka-metal-musician`]]);
    taken(['naraka-musician', 'naraka-metal-musician']);
    await expect(createEntityPage(unlinked(), field as never)).rejects.toThrow('Naraka');
    expect(signEvent).toHaveBeenCalledTimes(1);
  });

  it('fails when no relay took the page, so the post is not published', async () => {
    publishToRelays.mockResolvedValue({ success: 0 });
    await expect(createEntityPage(unlinked(), field as never)).rejects.toThrow('any relay');
  });
});
