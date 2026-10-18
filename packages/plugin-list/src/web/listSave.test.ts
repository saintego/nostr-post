// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nostr-post/signer', () => import('../testRelay.testHelpers').then((m) => m.signerMock));

import { provideEntityManifests } from '@nostr-post/plugins/entities';
import { createList } from '../lists';
import { relay } from '../testRelay.testHelpers';
import './listSave';
import './listView';
import type { NpListSave } from './listSave';
import type { NpListView } from './listView';

const venue = '30818:pk1:tap-house-venue';
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function openSave(target = venue): Promise<NpListSave> {
  const el = document.createElement('np-list-save');
  el.target = target;
  document.body.append(el);
  await el.updateComplete;
  el.shadowRoot?.querySelector<HTMLButtonElement>('.save-btn')?.click();
  await settle();
  await el.updateComplete;
  return el;
}

const checkboxes = (el: HTMLElement) => [
  ...(el.shadowRoot?.querySelectorAll<HTMLInputElement>('input[type=checkbox]') ?? []),
];

beforeEach(() => {
  relay.reset();
  document.body.innerHTML = '';
});

describe('<np-list-save>', () => {
  it("lists the user's lists and saves the target to one", async () => {
    await createList({ title: 'Want to go' });
    const el = await openSave();
    const texts = [...(el.shadowRoot?.querySelectorAll('.list-option span:first-of-type') ?? [])];
    expect(texts.map((s) => s.textContent)).toEqual(['Bookmarks', 'Want to go']);

    const changes: unknown[] = [];
    el.addEventListener('np-list-change', (e) => changes.push((e as CustomEvent).detail.list));
    checkboxes(el)[1]?.dispatchEvent(new Event('change'));
    await settle();
    await el.updateComplete;

    expect(changes).toHaveLength(1);
    expect(checkboxes(el).map((c) => c.checked)).toEqual([false, true]);
    expect(el.shadowRoot?.querySelector('.save-btn')?.textContent).toContain('Saved');
  });

  it('starts a new list with the target', async () => {
    const el = await openSave();
    const input = el.shadowRoot?.querySelector<HTMLInputElement>('.new-list input');
    if (!input) throw new Error('no input');
    input.value = 'Favourite pubs';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;
    el.shadowRoot?.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    await el.updateComplete;

    const set = relay.events.find((e) => e.kind === 30003);
    expect(set?.tags).toContainEqual(['title', 'Favourite pubs']);
    expect(set?.tags).toContainEqual(['a', venue]);
    expect(checkboxes(el).map((c) => c.checked)).toEqual([false, true]);
  });

  it('shows another version of a saved entity as saved', async () => {
    await createList({ title: 'Want to go', items: [{ tag: 'a', value: venue }] });
    const el = await openSave('30818:pk2:tap-house-venue');
    expect(checkboxes(el).map((c) => c.checked)).toEqual([false, true]);
  });
});

describe('<np-list-view>', () => {
  it('shows items by their wiki title and lets the owner remove them', async () => {
    relay.events.push({
      id: 'w1',
      sig: 's',
      kind: 30818,
      pubkey: 'pk2',
      created_at: 1,
      content: '',
      tags: [
        ['d', 'tap-house-venue'],
        ['title', 'Tap House (Venue)'],
      ],
    });
    await createList({ title: 'Want to go', items: [{ tag: 'a', value: venue }] });
    const el = document.createElement('np-list-view') as NpListView;
    document.body.append(el);
    await settle();
    await el.updateComplete;

    // The empty, never published bookmarks list isn't shown
    expect([...(el.shadowRoot?.querySelectorAll('h3') ?? [])].map((h) => h.textContent)).toEqual([
      'Want to go',
    ]);
    const title = el.shadowRoot?.querySelector<HTMLButtonElement>('.item-title');
    expect(title?.textContent?.trim()).toBe('Tap House (Venue)');

    const selected: unknown[] = [];
    el.addEventListener('np-list-item-select', (e) => selected.push((e as CustomEvent).detail));
    title?.click();
    expect(selected).toMatchObject([{ item: { value: venue }, title: 'Tap House (Venue)' }]);

    el.shadowRoot?.querySelector<HTMLButtonElement>('li button:not(.item-title)')?.click();
    await settle();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.muted')?.textContent).toBe('Nothing saved yet');
  });
});

const venueManifest = {
  id: 'venue-entity-test',
  version: '1.0.0',
  lists: [{ id: 'visited', label: 'Visited' }],
  listType: 'venue',
  fields: [],
};

// What @nostr-post/wiki provides: inline manifests resolve to themselves
provideEntityManifests({
  resolve: async (ref) => (typeof ref === 'object' ? (ref as never) : undefined),
});

describe('preset lists', () => {
  it('<np-list-save> offers the manifest presets first and creates one when ticked', async () => {
    const el = document.createElement('np-list-save');
    el.target = venue;
    el.manifest = venueManifest as never;
    document.body.append(el);
    await el.updateComplete;
    el.shadowRoot?.querySelector<HTMLButtonElement>('.save-btn')?.click();
    await settle();
    await el.updateComplete;
    const titles = [...(el.shadowRoot?.querySelectorAll('.list-option span:first-of-type') ?? [])];
    expect(titles.map((s) => s.textContent)).toEqual(['Visited', 'Bookmarks']);

    checkboxes(el)[0]?.dispatchEvent(new Event('change'));
    await settle();
    await el.updateComplete;
    const set = relay.events.find((e) => e.kind === 30003);
    expect(set?.tags).toEqual([
      ['d', 'nostr-post:venue:visited'],
      ['title', 'Visited'],
      ['a', venue],
    ]);
  });

  it("<np-list-input> offers the saved field's presets and emits the choices", async () => {
    await import('./listInput');
    const el = document.createElement('np-list-input');
    el.field = { id: 'lists', metadata: { saveField: 'venue' } } as never;
    el.manifest = {
      id: 'review',
      version: '1',
      fields: [{ id: 'venue', metadata: { wikiEntity: venueManifest } }],
    } as never;
    document.body.append(el);
    await settle();
    await el.updateComplete;
    const texts = [...(el.shadowRoot?.querySelectorAll('.list-option span:first-of-type') ?? [])];
    expect(texts.map((s) => s.textContent)).toEqual(['Visited', 'Bookmarks']);

    const values: unknown[] = [];
    el.addEventListener('np-value-changed', (e) => values.push((e as CustomEvent).detail.value));
    const boxes = checkboxes(el);
    if (boxes[0]) boxes[0].checked = true;
    boxes[0]?.dispatchEvent(new Event('change'));
    const input = el.shadowRoot?.querySelector<HTMLInputElement>('.new-list input');
    if (!input) throw new Error('no input');
    input.value = 'Date night';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;
    el.shadowRoot?.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(values.at(-1)).toEqual(['30003:me:nostr-post:venue:visited', 'new:Date night']);
    // Nothing is published before the post
    expect(relay.events).toEqual([]);
  });
});

describe('loading', () => {
  it('says it waits for the signer, then shows the presets while the lists load', async () => {
    const { signerMock } = await import('../testRelay.testHelpers');
    let givePubkey: (pk: string) => void = () => {};
    signerMock.getPublicKey.mockImplementationOnce(
      () => new Promise<string>((resolve) => (givePubkey = resolve))
    );
    let answerRelays: (events: never[]) => void = () => {};
    // The relay list lookup answers at once; the lists themselves wait
    signerMock.fetchEvents.mockImplementationOnce(
      () => new Promise((resolve) => (answerRelays = resolve as never))
    );
    await import('./listInput');
    const el = document.createElement('np-list-input');
    el.field = { id: 'lists', metadata: { saveField: 'venue' } } as never;
    el.manifest = {
      id: 'review',
      version: '1',
      fields: [{ id: 'venue', metadata: { wikiEntity: venueManifest } }],
    } as never;
    document.body.append(el);
    await settle();
    await el.updateComplete;
    const shown = () => el.shadowRoot?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(shown()).toContain('Waiting for your signer…');

    givePubkey('me');
    await settle();
    await el.updateComplete;
    expect(shown()).toContain('Visited');
    expect(shown()).toContain('Loading your lists…');

    answerRelays([]);
    await settle();
    await el.updateComplete;
    expect(shown()).not.toContain('Loading your lists…');
  });
});

describe('lists with the same title', () => {
  it('get their type, and typing an existing title ticks that list', async () => {
    const { createList: create } = await import('../lists');
    await create({ title: 'Liked' });
    const beerManifest = {
      id: 'beer-e',
      version: '1',
      lists: [{ id: 'liked', label: 'Liked' }],
      listType: 'beer',
      fields: [],
    };
    const el = document.createElement('np-list-save');
    el.target = '30818:pk1:pliny-beer';
    el.manifest = beerManifest as never;
    document.body.append(el);
    await el.updateComplete;
    el.shadowRoot?.querySelector<HTMLButtonElement>('.save-btn')?.click();
    await settle();
    await el.updateComplete;
    const titles = [...(el.shadowRoot?.querySelectorAll('.list-option span:first-of-type') ?? [])];
    expect(titles.map((s) => s.textContent)).toEqual(['Liked (beer)', 'Bookmarks', 'Liked']);

    const input = el.shadowRoot?.querySelector<HTMLInputElement>('.new-list input');
    if (!input) throw new Error('no input');
    input.value = 'Bookmarks';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;
    el.shadowRoot?.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    await el.updateComplete;
    expect(relay.events.filter((e) => e.kind === 10003)).toHaveLength(1);
    expect(relay.events.filter((e) => e.kind === 30003)).toHaveLength(1);
  });
});
