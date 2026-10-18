/**
 * @nostr-post/plugin-list - what lists are called
 *
 * Framework-free, for any UI: the names come in (e.g. from the web components'
 * messages, or an app's translations).
 */

import { listTypeOf } from './core';

/** The words list titles need */
export interface ListTitleNames {
  /** Name of the user's bookmarks list (kind 10003), which has no title */
  bookmarks: string;
  /** A set without a title */
  untitled: string;
  /** A list next to another one with the same title: its type (`Liked (beer)`) */
  titleWithType: (title: string, type: string) => string;
}

/** What a list is called: its title; the bookmarks list has none */
export const listTitle = (
  list: { kind: number; title?: string },
  m: Pick<ListTitleNames, 'bookmarks' | 'untitled'>
): string => list.title ?? (list.kind === 10003 ? m.bookmarks : m.untitled);

/**
 * What each of `lists` is called where they're shown together: lists with the same title
 * get their type (`Liked (beer)`, `Liked (venue)`), from manifest list d-tags
 */
export function listTitles(
  lists: Array<{ address: string; kind: number; title?: string; dTag: string }>,
  m: ListTitleNames
): Map<string, string> {
  const count = new Map<string, number>();
  for (const l of lists) {
    const key = listTitle(l, m).toLowerCase();
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  return new Map(
    lists.map((l) => {
      const title = listTitle(l, m);
      const type = (count.get(title.toLowerCase()) ?? 0) > 1 ? listTypeOf(l) : undefined;
      return [l.address, type ? m.titleWithType(title, type) : title];
    })
  );
}
