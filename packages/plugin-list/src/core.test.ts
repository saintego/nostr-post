import { describe, expect, it } from 'vitest';
import {
  currentLists,
  deletionEvent,
  hasItem,
  itemFor,
  newSetDTag,
  newSetEvent,
  parseList,
  sameItem,
  withBookmarks,
  withItem,
  withoutItem,
} from './core';
import type { ListEvent } from './types';

const set = (d: string, createdAt: number, tags: string[][] = []): ListEvent => ({
  kind: 30003,
  pubkey: 'me',
  created_at: createdAt,
  content: '',
  tags: [['d', d], ['title', d.toUpperCase()], ...tags],
});

const venue = (pubkey: string, d = 'tap-house-venue') => `30818:${pubkey}:${d}`;

describe('parseList', () => {
  it('reads a bookmark set: address, title, description and a/e items in order', () => {
    const list = parseList(
      set('pubs', 5, [
        ['description', 'Where to go'],
        ['a', venue('pk1'), 'wss://r'],
        ['t', 'beer'],
        ['e', 'note1'],
      ])
    );
    expect(list).toMatchObject({
      address: '30003:me:pubs',
      dTag: 'pubs',
      title: 'PUBS',
      description: 'Where to go',
      createdAt: 5,
      items: [
        { tag: 'a', value: venue('pk1'), relay: 'wss://r' },
        { tag: 'e', value: 'note1', relay: undefined },
      ],
    });
  });

  it('reads the bookmarks list (no d-tag) and ignores other kinds and sets without d-tag', () => {
    expect(
      parseList({ kind: 10003, pubkey: 'me', created_at: 1, content: '', tags: [] })?.address
    ).toBe('10003:me:');
    expect(parseList({ kind: 30000, pubkey: 'me', created_at: 1, content: '', tags: [] })).toBe(
      null
    );
    expect(parseList({ kind: 30003, pubkey: 'me', created_at: 1, content: '', tags: [] })).toBe(
      null
    );
  });
});

describe('items', () => {
  it('treats versions of one wiki entity by different authors as the same item', () => {
    expect(sameItem(itemFor(venue('pk1')), itemFor(venue('pk2')))).toBe(true);
    expect(sameItem(itemFor(venue('pk1')), itemFor(venue('pk1', 'other-venue')))).toBe(false);
    // Other addressable kinds are one author's
    expect(sameItem(itemFor('30023:pk1:post'), itemFor('30023:pk2:post'))).toBe(false);
    expect(itemFor('abc123')).toEqual({ tag: 'e', value: 'abc123', relay: undefined });
  });

  it('adds an item once, keeping other tags and the (encrypted) content', () => {
    const event = { ...set('pubs', 10, [['t', 'beer']]), content: 'encrypted-private-items' };
    const added = withItem(event, itemFor(venue('pk1')), 100);
    expect(added.created_at).toBe(100);
    expect(added.content).toBe('encrypted-private-items');
    expect(added.tags).toContainEqual(['t', 'beer']);
    expect(added.tags).toContainEqual(['a', venue('pk1')]);
    // Another author's version of the same entity is already there
    expect(withItem(added, itemFor(venue('pk2')), 200)).toBe(added);
  });

  it('removes every version of the entity, and stays newer than the replaced event', () => {
    const event = set('pubs', 100, [
      ['a', venue('pk1')],
      ['a', venue('pk2')],
      ['e', 'note1'],
    ]);
    const removed = withoutItem(event, itemFor(venue('pk3')), 100);
    expect(removed.created_at).toBe(101);
    expect(parseList(removed)?.items).toEqual([{ tag: 'e', value: 'note1', relay: undefined }]);
  });

  it('hasItem compares like sameItem', () => {
    const list = parseList(set('pubs', 1, [['a', venue('pk1')]]));
    expect(list && hasItem(list, itemFor(venue('pk2')))).toBe(true);
  });
});

describe('new and deleted lists', () => {
  it('makes a d-tag from the title plus a random part', () => {
    expect(newSetDTag('Want to go!', 'x1y2')).toBe('want-to-go-x1y2');
    expect(newSetDTag('Bières', 'x1')).toBe('bieres-x1');
    expect(newSetDTag('!!!', 'x1')).toBe('x1');
  });

  it('creates a set with title and description', () => {
    expect(newSetEvent({ pubkey: 'me', dTag: 'd', title: 'T', description: 'D' }, 7)).toEqual({
      kind: 30003,
      pubkey: 'me',
      created_at: 7,
      content: '',
      tags: [
        ['d', 'd'],
        ['title', 'T'],
        ['description', 'D'],
      ],
    });
  });

  it('asks to delete a set by its address', () => {
    const list = parseList(set('pubs', 50));
    expect(list && deletionEvent(list, 10)).toMatchObject({
      kind: 5,
      created_at: 51,
      tags: [
        ['a', '30003:me:pubs'],
        ['k', '30003'],
      ],
    });
  });

  it('keeps the newest version per list and drops lists deleted after it', () => {
    const lists = currentLists([
      set('pubs', 1),
      set('pubs', 3, [['a', venue('pk1')]]),
      set('old', 1),
      set('recreated', 9),
      { kind: 5, pubkey: 'me', created_at: 2, content: '', tags: [['a', '30003:me:old']] },
      { kind: 5, pubkey: 'me', created_at: 5, content: '', tags: [['a', '30003:me:recreated']] },
      // Someone else can't delete my list
      { kind: 5, pubkey: 'other', created_at: 9, content: '', tags: [['a', '30003:me:pubs']] },
      { kind: 10003, pubkey: 'me', created_at: 1, content: '', tags: [] },
    ]);
    expect(lists.map((l) => l.address)).toEqual([
      '10003:me:',
      '30003:me:pubs',
      '30003:me:recreated',
    ]);
    expect(lists[1]?.items).toHaveLength(1);
  });

  it('adds an empty bookmarks list for a user without one', () => {
    const lists = withBookmarks([], 'me');
    expect(lists.map((l) => [l.address, l.createdAt])).toEqual([['10003:me:', 0]]);
    expect(withBookmarks(lists, 'me')).toBe(lists);
  });
});
