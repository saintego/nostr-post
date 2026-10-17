/**
 * @nostr-post/plugin-list - reading and publishing lists
 *
 * Reads lists from the user's relays and publishes changes through the signer
 * (`signAndPublish`), so test mode (dry run) and the user's relays apply.
 */

import type { NostrTag, Result } from '@nostr-post/core/types';
import {
  DEFAULT_RELAYS,
  type FetchFilter,
  fetchEvents,
  fetchUserRelays,
  getPublicKey,
  getPublishRelays,
  signAndPublish,
} from '@nostr-post/signer';
import {
  currentLists,
  deletionEvent,
  newSetDTag,
  newSetEvent,
  parseList,
  withBookmarks,
  withItem,
  withoutItem,
} from './core';
import {
  BOOKMARK_SET_KIND,
  BOOKMARKS_KIND,
  type BookmarkList,
  DELETION_KIND,
  type ListEvent,
  type ListItem,
  type ListRelayOptions,
} from './types';

const now = (): number => Math.floor(Date.now() / 1000);

const readRelays = (pubkey: string, options: ListRelayOptions): Promise<string[]> =>
  fetchUserRelays(pubkey, options.relays ?? DEFAULT_RELAYS);

/**
 * `pubkey`'s bookmarks list and bookmark sets, without deleted ones. The bookmarks list
 * is always there (empty if they have none yet).
 */
export async function fetchLists(
  pubkey: string,
  options: ListRelayOptions = {}
): Promise<BookmarkList[]> {
  const relays = await readRelays(pubkey, options);
  const events = await fetchEvents(
    [
      { kinds: [BOOKMARKS_KIND, BOOKMARK_SET_KIND], authors: [pubkey] },
      { kinds: [DELETION_KIND], authors: [pubkey], '#k': [String(BOOKMARK_SET_KIND)] },
    ],
    relays,
    { waitForAll: true }
  );
  return withBookmarks(currentLists(events), pubkey);
}

/** The signed-in user's lists */
export async function fetchMyLists(options: ListRelayOptions = {}): Promise<BookmarkList[]> {
  return fetchLists(await getPublicKey(), options);
}

/** The newest copy of `list` on relays, so an edit doesn't undo one made elsewhere */
async function latestEvent(list: BookmarkList, options: ListRelayOptions): Promise<ListEvent> {
  const filter: FetchFilter =
    list.kind === BOOKMARK_SET_KIND
      ? { kinds: [list.kind], authors: [list.pubkey], '#d': [list.dTag] }
      : { kinds: [list.kind], authors: [list.pubkey] };
  const events = await fetchEvents(filter, await readRelays(list.pubkey, options), {
    waitForAll: true,
  });
  return events.reduce<ListEvent>(
    (newest, e) => (e.created_at > newest.created_at ? e : newest),
    list.event
  );
}

const failure = (error: unknown): { success: false; error: Error } => ({
  success: false,
  error: error instanceof Error ? error : new Error(String(error)),
});

/** Sign and publish to the user's relays; fails when no relay accepted it */
async function publish(event: ListEvent, options: ListRelayOptions): Promise<Result<ListEvent>> {
  try {
    const relays = await getPublishRelays(event.pubkey, options.relays ?? DEFAULT_RELAYS);
    const tags = event.tags.filter((t): t is NostrTag => t.length > 0);
    const { signedEvent, publishResults } = await signAndPublish({ ...event, tags }, relays);
    if (publishResults.success === 0) return failure(new Error('No relay accepted the event'));
    return { success: true, data: signedEvent };
  } catch (error) {
    return failure(error);
  }
}

async function publishList(
  event: ListEvent,
  options: ListRelayOptions
): Promise<Result<BookmarkList>> {
  const published = await publish(event, options);
  if (!published.success) return published;
  const list = parseList(published.data);
  return list ? { success: true, data: list } : failure(new Error('Not a list event'));
}

/** Add `item` to the newest version of `list` */
export async function addToList(
  list: BookmarkList,
  item: ListItem,
  options: ListRelayOptions = {}
): Promise<Result<BookmarkList>> {
  try {
    const latest = await latestEvent(list, options);
    return publishList(withItem(latest, item, now()), options);
  } catch (error) {
    return failure(error);
  }
}

/** Remove `item` (any version of the same wiki entity) from the newest version of `list` */
export async function removeFromList(
  list: BookmarkList,
  item: ListItem,
  options: ListRelayOptions = {}
): Promise<Result<BookmarkList>> {
  try {
    const latest = await latestEvent(list, options);
    return publishList(withoutItem(latest, item, now()), options);
  } catch (error) {
    return failure(error);
  }
}

/** Create a bookmark set for the signed-in user, optionally with its first items */
export async function createList(
  params: { title: string; description?: string; items?: ListItem[] },
  options: ListRelayOptions = {}
): Promise<Result<BookmarkList>> {
  try {
    const pubkey = await getPublicKey();
    const dTag = newSetDTag(params.title, Math.random().toString(36).slice(2, 8));
    const empty = newSetEvent({ ...params, pubkey, dTag }, now());
    const withItems = (params.items ?? []).reduce((e, item) => withItem(e, item, 0), empty);
    return publishList({ ...withItems, created_at: empty.created_at }, options);
  } catch (error) {
    return failure(error);
  }
}

/** Ask relays to delete a bookmark set (NIP-09). The bookmarks list itself can't be deleted. */
export async function deleteList(
  list: BookmarkList,
  options: ListRelayOptions = {}
): Promise<Result<void>> {
  if (list.kind !== BOOKMARK_SET_KIND) {
    return failure(new Error('Only bookmark sets can be deleted'));
  }
  const published = await publish(deletionEvent(list, now()), options);
  return published.success ? { success: true, data: undefined } : published;
}
