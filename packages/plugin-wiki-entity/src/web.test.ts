// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { registerEntityManifest } from './core';

const wikiEvent = (d: string, title: string, pubkey = 'pk') => ({
  id: `${d}-${pubkey}`,
  pubkey,
  sig: 's',
  kind: 30818,
  created_at: 1,
  content: '',
  tags: [
    ['d', d],
    ['title', title],
  ],
});

// Relay results for "bitcoin": general wiki articles plus one beer entity
vi.mock('@nostr-post/signer', () => ({
  fetchEvents: vi.fn(async () => [
    wikiEvent('bitcoin', 'Bitcoin'),
    wikiEvent('bitcoin-history', 'bitcoin-history'),
    wikiEvent('bitcoin-beer', 'Bitcoin (Beer)'),
    wikiEvent('bitcoin-brewery', 'Bitcoin (Brewery)'),
  ]),
}));
import './web';
import type { WikiEntityPicker } from './web';

const breweryManifest = {
  id: 'brewery-entity-test',
  version: '1.0.0',
  wikiConfig: { titleTemplate: '{name} (Brewery)', dTagTemplate: '{name}-(brewery)' },
  fields: [
    {
      id: 'name',
      type: 'string',
      uiPlugin: 'text',
      required: true,
      mapTo: { kind: 30818, target: 'table' },
    },
  ],
  metadata: { name: 'Brewery' },
} as never;

async function pickerWithQuery(query: string, metadata: Record<string, unknown>) {
  const picker = document.createElement('wiki-entity-picker') as WikiEntityPicker;
  picker.field = { id: 'brewery', metadata };
  document.body.appendChild(picker);
  await picker.updateComplete;
  // biome-ignore lint/suspicious/noExplicitAny: driving private state in a test
  const p = picker as any;
  p._query = query;
  return { picker, p };
}

describe('<wiki-entity-picker> create', () => {
  it('opens a prefilled composer and selects the published entity', async () => {
    registerEntityManifest(breweryManifest);
    const { picker, p } = await pickerWithQuery('Moonshine', {
      entityManifest: 'brewery-entity-test',
    });
    const outer = vi.fn();
    document.body.addEventListener('np-value-changed', outer);

    p._onCreateRequest();
    await picker.updateComplete;
    const composer = picker.shadowRoot?.querySelector('nostr-wiki-composer') as HTMLElement & {
      prefill?: Record<string, unknown>;
    };
    expect(composer).toBeTruthy();
    expect(composer.prefill).toEqual({ name: 'Moonshine' });

    // A field change inside the dialog must not look like the picker's value
    composer.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value: 'x' }, bubbles: true, composed: true })
    );
    expect(outer).not.toHaveBeenCalled();

    const signedEvent = {
      id: 'e1',
      pubkey: 'pk1',
      sig: 's',
      kind: 30818,
      created_at: 1,
      content: '',
      tags: [
        ['d', 'moonshine-(brewery)'],
        ['title', 'Moonshine (Brewery)'],
      ],
    };
    composer.dispatchEvent(
      new CustomEvent('nostr-wiki-published', {
        detail: { dTag: 'moonshine-(brewery)', results: { signedEvent } },
        bubbles: true,
        composed: true,
      })
    );
    await picker.updateComplete;

    expect(picker.value).toMatchObject({ dTag: 'moonshine-(brewery)', resolvedPubkey: 'pk1' });
    expect(outer).toHaveBeenCalledTimes(1);
    expect(picker.shadowRoot?.querySelector('nostr-wiki-composer')).toBeNull();
    document.body.removeEventListener('np-value-changed', outer);
  });

  it('lets the host take over with preventDefault', async () => {
    const { picker, p } = await pickerWithQuery('Other', { entityManifest: breweryManifest });
    picker.addEventListener('wiki-entity-create', (e) => e.preventDefault());
    p._onCreateRequest();
    await picker.updateComplete;
    expect(picker.shadowRoot?.querySelector('nostr-wiki-composer')).toBeNull();
  });
});

describe('<wiki-entity-picker> search', () => {
  it('lists only entities of the picked type', async () => {
    registerEntityManifest({
      id: 'beer-entity-test',
      version: '1.0.0',
      wikiConfig: { titleTemplate: '{title} (Beer)', dTagTemplate: '{title}-(beer)' },
      fields: [],
    } as never);
    const { p } = await pickerWithQuery('bitcoin', { entityManifest: 'beer-entity-test' });
    await p._search();
    expect(p._results.map((e: { tags: string[][] }) => e.tags[0]?.[1])).toEqual(['bitcoin-beer']);
  });

  it('is unscoped when the entity manifest is unknown', async () => {
    const { p } = await pickerWithQuery('bitcoin', { entityManifest: 'not-registered' });
    await p._search();
    expect(p._results).toHaveLength(4);
  });
});
