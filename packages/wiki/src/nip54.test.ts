import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { WIKI_KIND, manifestToWikiEvent, wikiEventToManifestData } from './nip54';
import { normalizeDTag } from './normalizeDTag';
import { defaultResolver } from './resolver';
import type { WikiEvent } from './resolver';

const beerManifest: NostrPostManifest = {
  id: 'beer-entity-v1',
  version: '1.0.0',
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: WIKI_KIND, target: 'tag', tagName: 'title' },
    },
    {
      id: 'style',
      type: 'enum',
      uiPlugin: 'select',
      options: ['IPA', 'Stout', 'Double IPA'],
      mapTo: { kind: WIKI_KIND, target: 'tag', tagName: 't' },
    },
    { id: 'abv', type: 'number', uiPlugin: 'number', mapTo: { kind: WIKI_KIND, target: 'table' } },
    { id: 'ibu', type: 'number', uiPlugin: 'number', mapTo: { kind: WIKI_KIND, target: 'table' } },
    {
      id: 'external_ids',
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: WIKI_KIND, target: 'tag', tagName: 'i' },
    },
    {
      id: 'description',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: { kind: WIKI_KIND, target: 'content' },
    },
  ],
};

const beerFormData = {
  title: 'Pliny the Elder',
  style: 'Double IPA',
  abv: 8.0,
  ibu: 100,
  external_ids: ['untappd:beer:4892', 'ratebeer:24239'],
  description: 'A legendary Double IPA from Russian River Brewing.',
};

describe('normalizeDTag', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(normalizeDTag('Pliny the Elder')).toBe('pliny-the-elder');
  });

  it('removes punctuation', () => {
    expect(normalizeDTag("What's Up?")).toBe('whats-up');
  });

  it('collapses multiple dashes', () => {
    expect(normalizeDTag('hello  world')).toBe('hello-world');
  });

  it('strips leading and trailing dashes', () => {
    expect(normalizeDTag('  Hello World  ')).toBe('hello-world');
  });

  it('preserves non-ASCII letters', () => {
    expect(normalizeDTag('Москва')).toBe('москва');
    expect(normalizeDTag('Ñoño')).toBe('ñoño');
  });

  it('preserves numbers', () => {
    expect(normalizeDTag('Article 1')).toBe('article-1');
  });
});

describe('manifestToWikiEvent', () => {
  it('produces kind:30818', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    expect(event.kind).toBe(30818);
  });

  it('derives d-tag from title field', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    expect(dTag).toBe('pliny-the-elder');
  });

  it('uses explicit dTag when provided', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData, { dTag: 'custom-slug' });
    expect(event.tags.find((t) => t[0] === 'd')?.[1]).toBe('custom-slug');
  });

  it('emits d tag as first tag', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    expect(event.tags[0][0]).toBe('d');
  });

  it('emits title tag', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    expect(event.tags.find((t) => t[0] === 'title')?.[1]).toBe('Pliny the Elder');
  });

  it('emits t tag for style', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    expect(event.tags.find((t) => t[0] === 't')?.[1]).toBe('Double IPA');
  });

  it('does not emit abv as a Nostr tag (goes to Djot table instead)', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    expect(event.tags.find((t) => t[0] === 'abv')).toBeUndefined();
    // abv lands in the Djot table in content (keyed by field id since test manifest has no label)
    expect(event.content).toContain('abv');
    expect(event.content).toContain('8');
  });

  it('emits multiple i tags for array external_ids', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    const iTags = event.tags.filter((t) => t[0] === 'i').map((t) => t[1]);
    expect(iTags).toContain('untappd:beer:4892');
    expect(iTags).toContain('ratebeer:24239');
  });

  it('puts description prose after the table', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    expect(event.content).toContain(beerFormData.description);
  });

  it('includes a Djot table in content', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    expect(event.content).toMatch(/\| Field\s+\| Value\s+\|/);
    expect(event.content).toMatch(/\|[-\s]+\|[-\s]+\|/);
  });

  it('table appears before prose', () => {
    const event = manifestToWikiEvent(beerManifest, beerFormData);
    const tableIdx = event.content.indexOf('| Field');
    const proseIdx = event.content.indexOf(beerFormData.description);
    expect(tableIdx).toBeLessThan(proseIdx);
  });

  it('omits fields with undefined values', () => {
    const event = manifestToWikiEvent(beerManifest, { title: 'Test Beer' });
    expect(event.tags.find((t) => t[0] === 'abv')).toBeUndefined();
  });
});

describe('wikiEventToManifestData', () => {
  const makeWikiEvent = (partial: Partial<ReturnType<typeof manifestToWikiEvent>>): WikiEvent => {
    const base = manifestToWikiEvent(beerManifest, beerFormData);
    return { ...base, ...partial, id: 'abc', sig: 'sig' };
  };

  it('round-trips title through tags', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    expect(data['title']).toBe('Pliny the Elder');
  });

  it('round-trips numeric abv through Djot table', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    expect(data['abv']).toBe(8);
  });

  it('round-trips multiple i tags as array', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    const ids = data['external_ids'] as string[];
    expect(ids).toContain('untappd:beer:4892');
    expect(ids).toContain('ratebeer:24239');
  });

  it('round-trips description prose', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    expect(String(data['description'])).toContain('Russian River Brewing');
  });

  it('exposes __dTag in result', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    expect(data['__dTag']).toBe('pliny-the-elder');
  });

  it('abv always comes from Djot table (no Nostr tag for it)', () => {
    const base = manifestToWikiEvent(beerManifest, beerFormData);
    // Even if we keep only d/title tags, abv still round-trips via the Djot table in content
    const strippedEvent: WikiEvent = {
      ...base,
      id: 'stripped',
      sig: 'sig',
      tags: base.tags.filter((t) => t[0] === 'd' || t[0] === 'title'),
    };
    const data = wikiEventToManifestData(strippedEvent, beerManifest);
    expect(data['abv']).toBeDefined();
  });
});

describe('defaultResolver', () => {
  const makeEvent = (id: string, created_at: number, deferTarget?: string): WikiEvent => ({
    id,
    pubkey: `pk_${id}`,
    kind: 30818,
    created_at,
    tags: deferTarget
      ? [
          ['d', 'test'],
          ['a', deferTarget, '', 'defer'],
        ]
      : [['d', 'test']],
    content: '',
  });

  it('returns null for empty array', () => {
    expect(defaultResolver([])).toBeNull();
  });

  it('returns the newest event', () => {
    const events = [makeEvent('a', 100), makeEvent('b', 200), makeEvent('c', 150)];
    expect(defaultResolver(events)?.id).toBe('b');
  });

  it('excludes deferred events from candidates', () => {
    const events = [makeEvent('old', 300, '30818:pk_new:test'), makeEvent('new', 200)];
    expect(defaultResolver(events)?.id).toBe('new');
  });

  it('falls back to all events if all defer', () => {
    const events = [
      makeEvent('a', 200, '30818:other:test'),
      makeEvent('b', 100, '30818:other:test'),
    ];
    expect(defaultResolver(events)?.id).toBe('a');
  });
});
