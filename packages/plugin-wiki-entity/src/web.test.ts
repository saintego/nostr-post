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
    wikiEvent('bitcoin-beer', 'Bitcoin (Beer)', 'pk2'),
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
      entityId?: string;
    };
    expect(composer).toBeTruthy();
    expect(composer.prefill).toEqual({ name: 'Moonshine' });
    // moonshine-brewery is free, so the d-tag comes from the manifest template
    expect(composer.entityId).toBeUndefined();

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

  it('leaves a taken name to the composer to make distinct', async () => {
    // The mocked relays have bitcoin-brewery; the composer asks for a distinct slug
    const { picker, p } = await pickerWithQuery('bitcoin', { entityManifest: breweryManifest });
    p._onCreateRequest();
    await picker.updateComplete;
    const composer = picker.shadowRoot?.querySelector('nostr-wiki-composer') as HTMLElement & {
      entityId?: string;
      prefill?: Record<string, unknown>;
    };
    expect(composer.entityId).toBeUndefined();
    expect(composer.prefill).toEqual({ name: 'bitcoin' });
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
    expect(p._results.map((r: { event: { tags: string[][] } }) => r.event.tags[0]?.[1])).toEqual([
      'bitcoin-beer',
    ]);
  });

  it('is unscoped when the entity manifest is unknown', async () => {
    const { p } = await pickerWithQuery('bitcoin', { entityManifest: 'not-registered' });
    await p._search();
    expect(p._results).toHaveLength(4);
  });
});

describe('<wiki-entity-picker> result details and preview', () => {
  it('counts versions per entity and previews without selecting', async () => {
    const { picker, p } = await pickerWithQuery('bitcoin', { entityManifest: 'beer-entity-test' });
    await p._search();
    expect(p._results[0].versions).toBe(2);
    await picker.updateComplete;

    const row = picker.shadowRoot?.querySelector('.result-item');
    expect(row?.querySelector('.result-slug')?.textContent).toBe('bitcoin-beer');
    expect(row?.querySelector('.result-meta')?.textContent).toContain('2 versions');

    (row?.querySelector('.preview-btn') as HTMLButtonElement).click();
    await picker.updateComplete;
    const view = picker.shadowRoot?.querySelector('nostr-wiki-view') as HTMLElement & {
      entityId?: string;
      manifest?: { id: string };
    };
    expect(view?.entityId).toBe('bitcoin-beer');
    expect(view?.manifest?.id).toBe('beer-entity-test');
    expect(picker.value).toBeUndefined();
  });

  it('leaves the manifest of unknown types to the view (article text)', async () => {
    const { picker, p } = await pickerWithQuery('bitcoin', { entityManifest: 'not-registered' });
    p._previewDTag = 'bitcoin';
    await picker.updateComplete;
    const view = picker.shadowRoot?.querySelector('nostr-wiki-view') as HTMLElement & {
      manifest?: { id: string };
    };
    expect(view?.manifest).toBeUndefined();
  });

  it('offers a preview of the selected entity', async () => {
    const { picker } = await pickerWithQuery('', {});
    picker.value = { dTag: 'bitcoin-beer', resolvedPubkey: 'pk', externalIds: [] };
    await picker.updateComplete;
    expect(picker.shadowRoot?.querySelector('.selected-slug')?.textContent).toBe('bitcoin-beer');
    (picker.shadowRoot?.querySelector('.preview-btn') as HTMLButtonElement).click();
    // happy-dom mis-renders this re-render (verified in Chrome), so check the state it drives
    // biome-ignore lint/suspicious/noExplicitAny: reading private state in a test
    expect((picker as any)._previewDTag).toBe('bitcoin-beer');
  });
});
