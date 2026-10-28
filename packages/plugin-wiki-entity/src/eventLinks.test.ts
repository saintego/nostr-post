import { describe, expect, it, vi } from 'vitest';

const fetchEvents = vi.fn();
vi.mock('@nostr-post/signer', () => ({
  fetchEvents: (...args: unknown[]) => fetchEvents(...args),
}));

const { wikiEntityPickerPlugin } = await import('./core');
const { needsPageLinks, splitEventLinks, withPageLinks } = await import('./eventLinks');

const alice = 'a'.repeat(64);
const field = {
  id: 'performers',
  type: 'ref' as const,
  uiPlugin: 'wiki-entity-picker',
  mapTo: { kind: 31923, target: 'tag' as const, tagName: 'a' },
  metadata: { multiple: true },
};
const page = (dTag: string, title: string, ids: string[], created_at = 1) => ({
  id: dTag,
  kind: 30818,
  pubkey: alice,
  created_at,
  content: '',
  sig: '',
  tags: [['d', dTag], ['title', title], ...ids.map((id) => ['i', id])],
});

// A gig with two performers' pages and a third performer without one (named in the text)
const gigTags = [
  ['a', `30818:${alice}:naraka-(musician)`],
  ['a', `30818:${alice}:doom-(musician)`],
  ['i', 'spotify:artist:naraka'],
  ['i', 'instagram:doom'],
  ['i', 'instagram:nopage'],
];
const edited = () => {
  const values = wikiEntityPickerPlugin.resolveFromTags?.(gigTags, field);
  return Array.isArray(values) ? values : [];
};
const pages = [
  page('naraka-(musician)', 'Naraka', ['spotify:artist:naraka', 'bandcamp:naraka']),
  page('doom-(musician)', 'Doom (old)', ['instagram:doom'], 1),
  page('doom-(musician)', 'Doom', ['instagram:doom'], 2),
];

describe('splitEventLinks', () => {
  it("gives each picked entity its page's links and name; the rest stay nameless", () => {
    const values = edited();
    expect(needsPageLinks(values)).toBe(true);
    const split = splitEventLinks(values, pages);
    expect(split).toEqual([
      expect.objectContaining({
        dTag: 'naraka-(musician)',
        displayName: 'Naraka',
        externalIds: ['spotify:artist:naraka'],
      }),
      expect.objectContaining({ displayName: 'Doom', externalIds: ['instagram:doom'] }),
      expect.objectContaining({ unlinked: true, externalIds: ['instagram:nopage'] }),
    ]);
    expect(split[2]?.displayName).toBeUndefined();
    expect(needsPageLinks(split)).toBe(false);
  });

  it('removing an entity then removes its links', () => {
    const split = splitEventLinks(edited(), pages).filter((e) => e.dTag !== 'doom-(musician)');
    expect(wikiEntityPickerPlugin.extraTags?.(split, field)).toEqual([
      ['i', 'spotify:artist:naraka'],
      ['i', 'instagram:nopage'],
    ]);
  });

  it('keeps the values when no page is found', () => {
    const values = edited();
    expect(splitEventLinks(values, [])).toBe(values);
  });
});

describe('withPageLinks', () => {
  it('loads the picked pages by d-tag', async () => {
    fetchEvents.mockResolvedValueOnce(pages);
    const split = await withPageLinks(edited(), ['wss://relay']);
    expect(fetchEvents).toHaveBeenCalledWith(
      [{ kinds: [30818], '#d': ['naraka-(musician)', 'doom-(musician)'] }],
      ['wss://relay']
    );
    expect(split.map((e) => e.displayName)).toEqual(['Naraka', 'Doom', undefined]);
  });
});
