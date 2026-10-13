import { describe, expect, it } from 'vitest';
import { filterRelated, relatedSnippet } from './related';
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
});
