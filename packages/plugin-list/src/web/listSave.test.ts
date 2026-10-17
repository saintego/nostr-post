// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nostr-post/signer', () => import('../testRelay.testHelpers').then((m) => m.signerMock));

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
