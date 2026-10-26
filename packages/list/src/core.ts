/**
 * @nostr-post/list - Core
 *
 * NIP-51 bookmark lists as pure functions: read list events, add and remove items,
 * create and delete lists. No relays, signer or DOM here (see lists.ts for those).
 */

import { slugify } from '@nostr-post/core/textNormalize';
import type { ManifestList, NostrPostManifest } from '@nostr-post/core/types';
import {
  BOOKMARK_LISTS,
  BOOKMARK_SET_KIND,
  BOOKMARKS_KIND,
  type BookmarkList,
  CALENDAR_KIND,
  DELETION_KIND,
  type ListEvent,
  type ListItem,
  type ListKind,
  WIKI_KIND,
} from './types';

const STANDARD_KINDS = [BOOKMARKS_KIND];
const SET_KINDS = [BOOKMARK_SET_KIND, CALENDAR_KIND];

const tagValue = (tags: string[][], name: string): string | undefined =>
  tags.find((t) => t[0] === name)?.[1];

export const listAddress = (kind: number, pubkey: string, dTag: string): string =>
  `${kind}:${pubkey}:${dTag}`;

/**
 * The list in a kind 10003, 30003 or 31924 (calendar) event; null for other events or a set
 * without d-tag
 */
export function parseList(event: ListEvent): BookmarkList | null {
  const isSet = SET_KINDS.includes(event.kind);
  if (!isSet && !STANDARD_KINDS.includes(event.kind)) return null;
  const dTag = isSet ? (tagValue(event.tags, 'd') ?? '') : '';
  if (isSet && !dTag) return null;
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

/**
 * The d-tag of a list the user creates by title: `nostr-post:<slug>` (`nostr-post:liked`), the
 * same for the same title, so creating it again adds to the existing list; a title without
 * letters or digits gets `fallback` (e.g. a random part)
 */
export const newSetDTag = (title: string, fallback: string): string => {
  const slug = slugify(title, { foldAccents: true, punctuation: 'separate' });
  return `nostr-post:${slug || fallback}`;
};

/** The type in a manifest list's d-tag (`beer` in `nostr-post:beer:liked`), if it has one */
export const listTypeOf = (list: { dTag: string }): string | undefined =>
  list.dTag.match(/^nostr-post:([^:]+):./)?.[1];

/**
 * The list among `lists` with this title (any case), e.g. to reuse instead of creating
 * another; `titleOf` gives the shown title (the bookmarks list has none of its own)
 */
export const listWithTitle = <T extends { title?: string }>(
  lists: T[],
  title: string,
  titleOf: (list: T) => string | undefined = (l) => l.title
): T | undefined => {
  const wanted = title.trim().toLowerCase();
  return lists.find((l) => titleOf(l)?.trim().toLowerCase() === wanted);
};

/** A new set: a bookmark set, or of `kind` (e.g. a calendar) */
export function newSetEvent(
  params: { pubkey: string; dTag: string; title: string; description?: string; kind?: number },
  now: number
): ListEvent {
  const tags = [
    ['d', params.dTag],
    ['title', params.title],
  ];
  if (params.description) tags.push(['description', params.description]);
  const kind = params.kind ?? BOOKMARK_SET_KIND;
  return { kind, pubkey: params.pubkey, created_at: now, content: '', tags };
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
export function withBookmarks(
  lists: BookmarkList[],
  pubkey: string,
  listKind: ListKind = BOOKMARK_LISTS
): BookmarkList[] {
  // Kinds without a standard list (calendars) have nothing to add
  if (listKind.standard !== BOOKMARKS_KIND) return lists;
  if (lists.some((l) => l.kind === BOOKMARKS_KIND && l.pubkey === pubkey)) return lists;
  const empty = parseList(newBookmarksEvent(pubkey, 0));
  return empty ? [empty, ...lists] : lists;
}

/** A preset list resolved for a user: the d-tag of their set and its title */
export interface ListPreset {
  dTag: string;
  label: string;
}

/** The d-tags and titles of lists as manifests name them (`lists`), for a list type */
export const listPresets = (lists: ManifestList[], type: string): ListPreset[] =>
  lists.map((l) => ({ dTag: l.dTag ?? `nostr-post:${type}:${l.id}`, label: l.label }));

/** A manifest's lists (`lists`), their d-tags typed by its `listType`, else its id */
export const manifestListPresets = (manifest: NostrPostManifest | undefined): ListPreset[] =>
  manifest ? listPresets(manifest.lists ?? [], manifest.listType ?? manifest.id) : [];

/** An unpublished list at `address` (createdAt 0), for one the user may not have yet */
export function listAtAddress(address: string, title?: string): BookmarkList | null {
  const [kind, pubkey = '', ...rest] = address.split(':');
  const dTag = rest.join(':');
  if (Number(kind) === BOOKMARKS_KIND) return parseList(newBookmarksEvent(pubkey, 0));
  if (!SET_KINDS.includes(Number(kind)) || !pubkey || !dTag) return null;
  return parseList(newSetEvent({ pubkey, dTag, title: title ?? dTag, kind: Number(kind) }, 0));
}

/**
 * `lists` with the type's preset lists first (unpublished ones for those the user hasn't
 * got yet), then the others in their order
 */
export function withPresets(
  lists: BookmarkList[],
  presets: ListPreset[],
  pubkey: string,
  listKind: ListKind = BOOKMARK_LISTS
): BookmarkList[] {
  const presetLists = presets.flatMap((preset) => {
    const address = listAddress(listKind.set, pubkey, preset.dTag);
    const list = lists.find((l) => l.address === address) ?? listAtAddress(address, preset.label);
    return list ? [list] : [];
  });
  const presetAddresses = new Set(presetLists.map((l) => l.address));
  return [...presetLists, ...lists.filter((l) => !presetAddresses.has(l.address))];
}

/** The list item for a published event: its address if it's addressable, else its id */
export function itemForEvent(event: {
  id?: string;
  kind: number;
  pubkey: string;
  tags: string[][];
}) {
  const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
  if (event.kind >= 30000 && event.kind < 40000 && dTag !== undefined) {
    return itemFor(listAddress(event.kind, event.pubkey, dTag));
  }
  return event.id ? itemFor(event.id) : undefined;
}

/**
 * The wiki entities in a field's value, as list items: a venue's linked page
 * (`wikiEntity`), a picked entity (`dTag` + `resolvedPubkey`/`pubkey`), an address, or a
 * list of those
 */
export function entityItems(value: unknown): ListItem[] {
  if (Array.isArray(value)) return value.flatMap(entityItems);
  if (typeof value === 'string') return /^30818:[^:]+:.+/.test(value) ? [itemFor(value)] : [];
  if (!value || typeof value !== 'object') return [];
  const v = value as {
    wikiEntity?: { pubkey?: string; dTag?: string };
    dTag?: string;
    resolvedPubkey?: string;
    pubkey?: string;
  };
  const entity = v.wikiEntity ?? { pubkey: v.resolvedPubkey ?? v.pubkey, dTag: v.dTag };
  return entity.pubkey && entity.dTag
    ? [itemFor(listAddress(WIKI_KIND, entity.pubkey, entity.dTag))]
    : [];
}
