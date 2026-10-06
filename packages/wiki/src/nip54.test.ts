import type { NostrPostManifest } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { afterEach, describe, expect, it } from 'vitest';
import {
  WIKI_KIND,
  manifestToWikiEvent,
  unmappedTableRows,
  wikiEventToManifestData,
} from './nip54';
import { normalizeDTag } from './normalizeDTag';
import { countContributors, defaultResolver, groupByDTag, selectNewestEntity } from './resolver';
import type { WikiEvent } from './resolver';
import type { WikiManifest } from './types';

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
    expect(data.title).toBe('Pliny the Elder');
  });

  it('round-trips numeric abv through Djot table', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    expect(data.abv).toBe(8);
  });

  it('round-trips multiple i tags as array', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    const ids = data.external_ids as string[];
    expect(ids).toContain('untappd:beer:4892');
    expect(ids).toContain('ratebeer:24239');
  });

  it('round-trips description prose', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    expect(String(data.description)).toContain('Russian River Brewing');
  });

  it('exposes __dTag in result', () => {
    const data = wikiEventToManifestData(makeWikiEvent({}), beerManifest);
    expect(data.__dTag).toBe('pliny-the-elder');
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
    expect(data.abv).toBeDefined();
  });

  it('keeps a table with no manifest rows as prose', () => {
    const content = '| Bitcoin has no top | Because fiat has no bottom |\n|---|---|\n| a | b |';
    const data = wikiEventToManifestData(makeWikiEvent({ content }), beerManifest);
    expect(data.abv).toBeUndefined();
    expect(String(data.description)).toContain('Bitcoin has no top');
  });

  it('keeps prose without an infobox verbatim (wikilinks unescaped)', () => {
    const content = 'The [[Bitcoin]] whitepaper by *Satoshi*.';
    const data = wikiEventToManifestData(makeWikiEvent({ content }), beerManifest);
    expect(data.description).toBe(content);
  });

  it('keeps text before a table as prose', () => {
    const content = 'Intro paragraph.\n\n| abv | 8 |\n|---|---|';
    const data = wikiEventToManifestData(makeWikiEvent({ content }), beerManifest);
    expect(data.abv).toBeUndefined();
    expect(String(data.description)).toContain('Intro paragraph.');
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

describe('wikiConfig identity generation', () => {
  const templateManifest: WikiManifest = {
    id: 'beer-entity-v1',
    version: '1.0.0',
    wikiConfig: {
      titleTemplate: '{name} (Beer)',
      dTagTemplate: '{name}-(beer)',
    },
    fields: [
      {
        id: 'name',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: WIKI_KIND, target: 'table' },
      },
    ],
  };

  it('generates title tag from titleTemplate', () => {
    const ev = manifestToWikiEvent(templateManifest, { name: 'Bitcoin' });
    expect(ev.tags.find((t) => t[0] === 'title')?.[1]).toBe('Bitcoin (Beer)');
  });

  it('generates d-tag from dTagTemplate', () => {
    const ev = manifestToWikiEvent(templateManifest, { name: 'Bitcoin' });
    expect(ev.tags.find((t) => t[0] === 'd')?.[1]).toBe('bitcoin-beer');
  });

  it('normalizes d-tag correctly', () => {
    const ev = manifestToWikiEvent(templateManifest, { name: "What's Up?" });
    expect(ev.tags.find((t) => t[0] === 'd')?.[1]).toBe('whats-up-beer');
  });

  it('falls back to titleTemplate for d-tag when dTagTemplate absent', () => {
    const m: WikiManifest = { ...templateManifest, wikiConfig: { titleTemplate: '{name} (Beer)' } };
    const ev = manifestToWikiEvent(m, { name: 'Bitcoin' });
    expect(ev.tags.find((t) => t[0] === 'd')?.[1]).toBe('bitcoin-beer');
  });

  it('does not emit duplicate title tags when template is active', () => {
    const ev = manifestToWikiEvent(templateManifest, { name: 'Bitcoin' });
    expect(ev.tags.filter((t) => t[0] === 'title')).toHaveLength(1);
  });

  it('dTagTemplate takes precedence over titleTemplate when both are set', () => {
    const m: WikiManifest = {
      ...templateManifest,
      wikiConfig: { titleTemplate: '{name} (Beer)', dTagTemplate: 'beer-{name}' },
    };
    const ev = manifestToWikiEvent(m, { name: 'Bitcoin' });
    expect(ev.tags.find((t) => t[0] === 'd')?.[1]).toBe('beer-bitcoin');
    expect(ev.tags.find((t) => t[0] === 'title')?.[1]).toBe('Bitcoin (Beer)');
  });

  it('falls back to titleTemplate when dTagTemplate interpolates to empty', () => {
    const m: WikiManifest = {
      ...templateManifest,
      wikiConfig: { titleTemplate: '{name} (Beer)', dTagTemplate: '{missing}' },
    };
    const ev = manifestToWikiEvent(m, { name: 'Bitcoin' });
    expect(ev.tags.find((t) => t[0] === 'd')?.[1]).toBe('bitcoin-beer');
  });

  it('explicit config.dTag overrides template-derived d-tag', () => {
    const ev = manifestToWikiEvent(templateManifest, { name: 'Bitcoin' }, { dTag: 'custom' });
    expect(ev.tags.find((t) => t[0] === 'd')?.[1]).toBe('custom');
  });
});

describe('manifestToWikiEvent edge cases', () => {
  const tableManifest: NostrPostManifest = {
    id: 'm',
    version: '1.0.0',
    fields: [
      {
        id: 'notes',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: WIKI_KIND, target: 'table' },
      },
      {
        id: 'tags',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: WIKI_KIND, target: 'tag', tagName: 't' },
      },
    ],
  };

  it('keeps table rows on one line when values contain newlines and pipes', () => {
    const ev = manifestToWikiEvent(tableManifest, { notes: 'line one\nline | two' });
    const row = ev.content.split('\n').find((l) => l.startsWith('| notes'));
    expect(row).toContain('line one line \\| two');
    const data = wikiEventToManifestData({ ...ev, id: 'x' }, tableManifest);
    expect(data.notes).toBe('line one line | two');
  });

  it('skips null values instead of emitting "null"', () => {
    const ev = manifestToWikiEvent(tableManifest, { notes: null, tags: null });
    expect(ev.content).not.toContain('null');
    expect(ev.tags.filter((t) => t[0] === 't')).toHaveLength(0);
  });

  it('skips null items inside array values', () => {
    const ev = manifestToWikiEvent(tableManifest, { tags: ['a', null, 'b'] });
    expect(ev.tags.filter((t) => t[0] === 't').map((t) => t[1])).toEqual(['a', 'b']);
  });
});

describe('manifestToWikiEvent plugin extraTags', () => {
  afterEach(() => {
    pluginRegistry.unregister('test-extra');
  });

  it('emits extraTags once per field even with several tag targets', () => {
    pluginRegistry.register({
      id: 'test-extra',
      type: 'string',
      extraTags: () => [['i', 'ext:1']],
    } as never);
    const m: NostrPostManifest = {
      id: 'm',
      version: '1.0.0',
      fields: [
        {
          id: 'ref',
          type: 'string',
          uiPlugin: 'test-extra',
          mapTo: [
            { kind: WIKI_KIND, target: 'tag', tagName: 'a' },
            { kind: WIKI_KIND, target: 'tag', tagName: 'r' },
          ],
        },
      ],
    };
    const ev = manifestToWikiEvent(m, { ref: 'x' });
    expect(ev.tags.filter((t) => t[0] === 'i')).toEqual([['i', 'ext:1']]);
  });
});

describe('resolver helpers', () => {
  const ev = (id: string, pubkey: string, d: string, created_at: number): WikiEvent => ({
    id,
    pubkey,
    kind: WIKI_KIND,
    created_at,
    tags: d ? [['d', d]] : [],
    content: '',
  });

  it('groupByDTag groups events by d-tag', () => {
    const groups = groupByDTag([ev('1', 'a', 'x', 1), ev('2', 'b', 'y', 2), ev('3', 'c', 'x', 3)]);
    expect(groups.get('x')?.map((e) => e.id)).toEqual(['1', '3']);
    expect(groups.get('y')?.map((e) => e.id)).toEqual(['2']);
  });

  it('countContributors counts distinct pubkeys', () => {
    expect(
      countContributors([ev('1', 'a', 'x', 1), ev('2', 'a', 'x', 2), ev('3', 'b', 'x', 3)])
    ).toBe(2);
  });

  it('selectNewestEntity picks the d-tag with the newest resolved winner', () => {
    const events = [ev('1', 'a', 'old', 100), ev('2', 'b', 'new', 300), ev('3', 'c', 'old', 200)];
    expect(selectNewestEntity(events)).toBe('new');
  });

  it('selectNewestEntity ignores events without a d-tag', () => {
    expect(selectNewestEntity([ev('1', 'a', '', 500), ev('2', 'b', 'x', 1)])).toBe('x');
    expect(selectNewestEntity([ev('1', 'a', '', 500)])).toBeUndefined();
  });
});

describe('unmappedTableRows', () => {
  it('lists infobox rows the manifest has no field for', () => {
    const withExtra = {
      ...manifestToWikiEvent(beerManifest, beerFormData),
      id: 'x',
      sig: 's',
      content:
        '| Field | Value |\n|---|---|\n| abv | 8 |\n| brewed_since | 2004 |\n\nA hoppy beer.',
    };
    expect(unmappedTableRows(withExtra, beerManifest)).toEqual([['brewed_since', '2004']]);
  });

  it('is empty without an infobox', () => {
    const event = {
      ...manifestToWikiEvent(beerManifest, beerFormData),
      id: 'x',
      sig: 's',
      content: 'Just text.',
    };
    expect(unmappedTableRows(event, beerManifest)).toEqual([]);
  });
});

describe('infobox tables', () => {
  it('writes a header Djot recognizes, so the header is not a data row', () => {
    const event = { ...manifestToWikiEvent(beerManifest, beerFormData), id: 'x', sig: 's' };
    expect(event.content).toMatch(/^\| Field +\| Value +\|\n\|-+\|-+\|/);
    expect(unmappedTableRows(event, beerManifest)).toEqual([]);
  });

  it('skips the header of tables written with a padded separator', () => {
    const content = '| Field | Value |\n| ----- | ----- |\n| abv   | 8     |\n| extra | yes   |';
    const event = {
      ...manifestToWikiEvent(beerManifest, beerFormData),
      id: 'x',
      sig: 's',
      content,
    };
    expect(unmappedTableRows(event, beerManifest)).toEqual([['extra', 'yes']]);
    expect(wikiEventToManifestData(event, beerManifest).abv).toBe(8);
  });
});
