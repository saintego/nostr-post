import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nostr-post/signer', () => import('./testRelay.testHelpers').then((m) => m.signerMock));

import { itemFor } from './core';
import { addToList, createList, deleteList, fetchMyLists, removeFromList } from './lists';
import { relay, signerMock } from './testRelay.testHelpers';
import { CALENDAR_LISTS } from './types';

const beer = itemFor('30818:pk1:pliny-beer');
const venue = itemFor('30818:pk1:tap-house-venue');

beforeEach(() => relay.reset());

describe('lists on relays', () => {
  it('starts with an empty bookmarks list and publishes it on the first save', async () => {
    const [bookmarks] = await fetchMyLists();
    expect(bookmarks).toMatchObject({ address: '10003:me:', createdAt: 0, items: [] });
    if (!bookmarks) return;

    const saved = await addToList(bookmarks, venue);
    expect(saved.success && saved.data.items).toEqual([venue]);
    expect(signerMock.signAndPublish).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 10003, tags: [['a', venue.value]] }),
      ['wss://default']
    );
  });

  it('edits the newest copy on relays, so a change made elsewhere is kept', async () => {
    const created = await createList({ title: 'Want to go', items: [venue] });
    if (!created.success) throw created.error;
    const stale = created.data;
    // Another device adds a beer meanwhile
    const other = await addToList(stale, beer);
    expect(other.success).toBe(true);

    const result = await removeFromList(stale, venue);
    expect(result.success && result.data.items).toEqual([beer]);
    expect(result.success && result.data.title).toBe('Want to go');
  });

  it('creates a set with the item, and deleting it hides it from the lists', async () => {
    const created = await createList({ title: 'Want to go', items: [venue] });
    if (!created.success) throw created.error;
    expect(created.data.dTag).toBe('nostr-post:want-to-go');
    expect((await fetchMyLists()).map((l) => l.title)).toEqual([undefined, 'Want to go']);

    const deleted = await deleteList(created.data);
    expect(deleted.success).toBe(true);
    expect((await fetchMyLists()).map((l) => l.address)).toEqual(['10003:me:']);
  });

  it('creating a list with a title the user has adds to that list', async () => {
    await createList({ title: 'Liked', items: [venue] });
    const again = await createList({ title: 'liked', items: [beer] });
    expect(again.success && again.data.items).toEqual([venue, beer]);
    // It keeps its title
    expect(again.success && again.data.title).toBe('Liked');
    expect((await fetchMyLists()).filter((l) => l.kind === 30003)).toHaveLength(1);
  });

  it("doesn't delete the bookmarks list", async () => {
    const [bookmarks] = await fetchMyLists();
    if (!bookmarks) return;
    expect((await deleteList(bookmarks)).success).toBe(false);
  });

  it('fails when no relay accepted the list', async () => {
    relay.accept = false;
    const result = await createList({ title: 'Want to go' });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.message).toMatch(/No relay/);
  });

  it('fails instead of throwing when the signer refuses', async () => {
    signerMock.signAndPublish.mockRejectedValueOnce(new Error('User rejected'));
    const result = await createList({ title: 'Want to go' });
    expect(!result.success && result.error.message).toBe('User rejected');
  });

  it('keeps calendars (kind 31924) apart from bookmarks', async () => {
    const event = itemFor('31923:pk1:meetup');
    const options = { listKind: CALENDAR_LISTS };
    // No standard list for calendars: none until one is created
    expect(await fetchMyLists(options)).toEqual([]);

    const created = await createList({ title: 'Prague tech', items: [event] }, options);
    if (!created.success) throw created.error;
    expect(created.data).toMatchObject({
      kind: 31924,
      address: '31924:me:nostr-post:prague-tech',
      items: [event],
    });
    expect((await fetchMyLists(options)).map((l) => l.title)).toEqual(['Prague tech']);
    // Bookmarks don't see it
    expect((await fetchMyLists()).map((l) => l.address)).toEqual(['10003:me:']);

    const removed = await removeFromList(created.data, event, options);
    expect(removed.success && removed.data.items).toEqual([]);
    expect((await deleteList(created.data, options)).success).toBe(true);
    expect(await fetchMyLists(options)).toEqual([]);
  });
});
