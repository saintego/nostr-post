/**
 * @nostr-post/plugin-list - Core
 *
 * NIP-51 bookmark lists as pure functions: read list events, add and remove items,
 * create and delete lists. No relays, signer or DOM here (see lists.ts for those).
 */

import {
  BOOKMARK_SET_KIND,
  BOOKMARKS_KIND,
  type BookmarkList,
  DELETION_KIND,
  type ListEvent,
  type ListItem,
  WIKI_KIND,
} from './types';

const LIST_KINDS = [BOOKMARKS_KIND, BOOKMARK_SET_KIND];

const tagValue = (tags: string[][], name: string): string | undefined =>
  tags.find((t) => t[0] === name)?.[1];

export const listAddress = (kind: number, pubkey: string, dTag: string): string =>
  `${kind}:${pubkey}:${dTag}`;

/** The list in a kind 10003 or 30003 event; null for other events or a set without d-tag */
export function parseList(event: ListEvent): BookmarkList | null {
  if (!LIST_KINDS.includes(event.kind)) return null;
  const dTag = event.kind === BOOKMARK_SET_KIND ? (tagValue(event.tags, 'd') ?? '') : '';
  if (event.kind === BOOKMARK_SET_KIND && !dTag) return null;
  const items: ListItem[] = [];
  for (const [tag, value, relay] of event.tags) {
    if ((tag === 'a' || tag === 'e') && value)
      items.push({ tag, value, relay: relay || undefined });
  }
  return {
    address: listAddress(event.kind, event.pubkey, dTag),
    kind: event.kind,
    pubkey: event.pubkey,
    dTag,
    title: tagValue(event.tags, 'title') || undefined,
    description: tagValue(event.tags, 'description') || undefined,
    items,
    createdAt: event.created_at,
    event,
  };
}

/** The d-tag of a wiki entity address (`30818:<pubkey>:<d-tag>`) */
const wikiDTag = (address: string): string | undefined => {
  const match = address.match(/^(\d+):[^:]*:(.+)$/);
  return match && Number(match[1]) === WIKI_KIND ? match[2] : undefined;
};

/**
 * Whether two items are the same thing. Wiki entities are the same by d-tag, whichever
 * author's version was saved: the list shows the entity, not one version of it.
 */
export function sameItem(a: ListItem, b: ListItem): boolean {
  if (a.tag !== b.tag) return false;
  if (a.value === b.value) return true;
  const dTag = a.tag === 'a' ? wikiDTag(a.value) : undefined;
  return dTag !== undefined && dTag === wikiDTag(b.value);
}

export const hasItem = (list: BookmarkList, item: ListItem): boolean =>
  list.items.some((i) => sameItem(i, item));

/** The item for an `a` address or an event id */
export const itemFor = (target: string, relay?: string): ListItem =>
  /^\d+:/.test(target) ? { tag: 'a', value: target, relay } : { tag: 'e', value: target, relay };

/** A replacement must be newer than the event it replaces, even within the same second */
const nextCreatedAt = (event: ListEvent, now: number): number =>
  Math.max(now, event.created_at + 1);

const itemTag = (item: ListItem): string[] =>
  item.relay ? [item.tag, item.value, item.relay] : [item.tag, item.value];

/**
 * The list event with `item` appended (unchanged tags if it's already there). Other tags
 * and the content, which may hold encrypted private items, are kept as they are.
 */
export function withItem(event: ListEvent, item: ListItem, now: number): ListEvent {
  const list = parseList(event);
  if (list && hasItem(list, item)) return event;
  return { ...event, created_at: nextCreatedAt(event, now), tags: [...event.tags, itemTag(item)] };
}

/** The list event without `item` (and other versions of the same wiki entity) */
export function withoutItem(event: ListEvent, item: ListItem, now: number): ListEvent {
  const tags = event.tags.filter(
    ([tag, value]) => !((tag === 'a' || tag === 'e') && value && sameItem({ tag, value }, item))
  );
  return { ...event, created_at: nextCreatedAt(event, now), tags };
}

/** An empty bookmarks list (kind 10003), for a user who has none yet */
export const newBookmarksEvent = (pubkey: string, now: number): ListEvent => ({
  kind: BOOKMARKS_KIND,
  pubkey,
  created_at: now,
  content: '',
  tags: [],
});

/** A d-tag for a new set: the title's slug and a random part, so sets with one title don't clash */
export const newSetDTag = (title: string, random: string): string => {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${slug}-${random}` : random;
};

/** A new bookmark set */
export function newSetEvent(
  params: { pubkey: string; dTag: string; title: string; description?: string },
  now: number
): ListEvent {
  const tags = [
    ['d', params.dTag],
    ['title', params.title],
  ];
  if (params.description) tags.push(['description', params.description]);
  return { kind: BOOKMARK_SET_KIND, pubkey: params.pubkey, created_at: now, content: '', tags };
}

/** A deletion request (NIP-09) for a list */
export const deletionEvent = (list: BookmarkList, now: number): ListEvent => ({
  kind: DELETION_KIND,
  pubkey: list.pubkey,
  created_at: nextCreatedAt(list.event, now),
  content: '',
  tags: [
    ['a', list.address],
    ['k', String(list.kind)],
  ],
});

/** When each address was last asked to be deleted (NIP-09), by its own author */
function deletionTimes(events: ListEvent[]): Map<string, number> {
  const deletedAt = new Map<string, number>();
  for (const event of events) {
    if (event.kind !== DELETION_KIND) continue;
    const addresses = event.tags
      .filter(([tag, value]) => tag === 'a' && value?.split(':')[1] === event.pubkey)
      .map(([, value]) => value ?? '');
    for (const address of addresses) {
      deletedAt.set(address, Math.max(deletedAt.get(address) ?? 0, event.created_at));
    }
  }
  return deletedAt;
}

/**
 * The lists in `events`: the newest event per address, without lists their author asked
 * to delete after that version. The bookmarks list comes first, then sets by title.
 */
export function currentLists(events: ListEvent[]): BookmarkList[] {
  const newest = new Map<string, BookmarkList>();
  for (const event of events) {
    const list = parseList(event);
    const known = list && newest.get(list.address);
    if (list && (!known || list.createdAt > known.createdAt)) newest.set(list.address, list);
  }
  const deletedAt = deletionTimes(events);
  return [...newest.values()]
    .filter((list) => list.createdAt > (deletedAt.get(list.address) ?? -1))
    .sort(
      (a, b) =>
        Number(b.kind === BOOKMARKS_KIND) - Number(a.kind === BOOKMARKS_KIND) ||
        (a.title ?? a.dTag).localeCompare(b.title ?? b.dTag)
    );
}

/**
 * `lists` with the user's bookmarks list first: an empty one (never published, createdAt 0)
 * when they have none yet, so it can be saved to like any other list.
 */
export function withBookmarks(lists: BookmarkList[], pubkey: string): BookmarkList[] {
  if (lists.some((l) => l.kind === BOOKMARKS_KIND && l.pubkey === pubkey)) return lists;
  const empty = parseList(newBookmarksEvent(pubkey, 0));
  return empty ? [empty, ...lists] : lists;
}
