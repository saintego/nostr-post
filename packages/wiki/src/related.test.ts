import { describe, expect, it } from 'vitest';
import {
  filterRelated,
  relatedFilter,
  relatedImages,
  relatedSnippet,
  relatedStats,
} from './related';
import type { WikiEvent } from './resolver';

const event = (over: Partial<WikiEvent>): WikiEvent => ({
  id: Math.random().toString(16),
  pubkey: 'pk',
  sig: 's',
  kind: 30818,
  created_at: 1,
  content: '',
  tags: [],
  ...over,
});
const beer = (dTag: string, row: string, created = 1, pubkey = 'pk') =>
  event({
    pubkey,
    created_at: created,
    tags: [
      ['d', dTag],
      ['a', '30818:pk:x-brewery'],
    ],
    content: `| Field | Value |\n|---|---|\n| ${row} | [X][x-brewery] |\n`,
  });

describe('related items', () => {
  it('lists entities of a type in a role, newest version each, not the entity itself', () => {
    const events = [
      beer('ipa-beer', 'breweries', 1),
      beer('ipa-beer', 'breweries', 5, 'other'),
      beer('stout-beer', 'brewed_at', 3),
      event({ tags: [['d', 'x-brewery']] }),
      event({ kind: 1, content: 'Nice', tags: [['a', '30818:pk:x-brewery']] }),
    ];
    const beers = filterRelated(
      events,
      { label: 'Beers', kinds: [30818], dTagSuffix: '-beer', role: 'breweries' },
      'x-brewery'
    );
    expect(beers.map((e) => [e.tags[0]?.[1], e.pubkey])).toEqual([['ipa-beer', 'other']]);
    const brewedHere = filterRelated(
      events,
      { label: 'Brewed here', kinds: [30818], role: 'brewed_at' },
      'x-brewery'
    );
    expect(brewedHere.map((e) => e.tags[0]?.[1])).toEqual(['stout-beer']);
  });

  it('lists posts of given kinds, optionally only those linking a manifest', () => {
    const review = event({
      kind: 1,
      created_at: 2,
      tags: [['a', '30078:pk:nostr-post:beer-review-v1']],
    });
    const note = event({ kind: 1, created_at: 3, tags: [] });
    expect(filterRelated([review, note], { label: 'All', kinds: [1] }, 'x')).toEqual([
      note,
      review,
    ]);
    expect(
      filterRelated(
        [review, note],
        { label: 'Reviews', kinds: [1], manifest: 'beer-review-v1' },
        'x'
      )
    ).toEqual([review]);
  });

  it('snippets: kind 1 without role lines, NIP-78 its first text', () => {
    expect(
      relatedSnippet(event({ kind: 1, content: 'Great beer.\nTasted at: nostr:naddr1qqqqqq' }))
    ).toBe('Great beer.');
    expect(relatedSnippet(event({ kind: 30078, content: '{"rating":5,"review":"Hoppy"}' }))).toBe(
      'Hoppy'
    );
  });

  it('stats: post count and the average of a numeric tag among posts that have it', () => {
    const posts = [
      event({ kind: 1, tags: [['rating', '5']] }),
      event({ kind: 1, tags: [['rating', '4']] }),
      event({ kind: 1, tags: [] }),
    ];
    expect(relatedStats(posts, 'rating')).toEqual({ count: 3, rated: 2, average: 4.5 });
    expect(relatedStats([], 'rating')).toEqual({ count: 0, rated: 0, average: undefined });
  });

  it('stats: an empty tag value is no rating, not a 0', () => {
    const posts = [
      event({ kind: 1, tags: [['rating', '5']] }),
      event({ kind: 1, tags: [['rating', '']] }),
      event({ kind: 1, tags: [['rating', ' ']] }),
    ];
    expect(relatedStats(posts, 'rating')).toEqual({ count: 3, rated: 1, average: 5 });
  });

  it('gallery: image r tags and imeta images, once each', () => {
    const posts = [
      event({
        kind: 1,
        tags: [
          ['r', 'https://x.org/a.jpg'],
          ['r', 'https://x.org/page'],
          ['r', 'https://x.org/a.jpg'],
        ],
      }),
      event({
        kind: 1,
        tags: [
          ['imeta', 'url https://cdn.org/b', 'm image/webp'],
          ['imeta', 'url https://cdn.org/c.mp4', 'm video/mp4'],
        ],
      }),
    ];
    expect(relatedImages(posts)).toEqual(['https://x.org/a.jpg', 'https://cdn.org/b']);
  });
});

describe('related posts of one manifest', () => {
  const section = { label: 'Reviews', kinds: [1], manifest: 'beer-review-v1' };
  const venue = '30818:pk:louvre-praha-venue';

  it("asks relays for the manifest's label next to the entity", () => {
    expect(relatedFilter(section, [venue], 20)).toEqual({
      kinds: [1],
      '#a': [venue],
      limit: 20,
      '#l': ['beer-review-v1'],
    });
    expect(relatedFilter({ label: 'All', kinds: [1] }, [venue], 20)).toEqual({
      kinds: [1],
      '#a': [venue],
      limit: 20,
    });
  });

  it('keeps posts of the manifest by label or by its a tag, and drops others', () => {
    const post = (tags: string[][]) => event({ kind: 1, tags: [['a', venue], ...tags] });
    const labelled = post([['l', 'beer-review-v1', 'nostr-post']]);
    const linked = post([['a', '30078:pk:nostr-post:beer-review-v1']]);
    const other = post([['l', 'coffee-review-v1', 'nostr-post']]);
    const items = filterRelated([labelled, linked, other], section, 'louvre-praha-venue');
    expect(items.map((e) => e.id).sort()).toEqual([labelled.id, linked.id].sort());
  });
});
