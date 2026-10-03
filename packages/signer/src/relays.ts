import { DEFAULT_RELAYS, fetchEvents } from './fetch';
import type { SignedEvent } from './index';

/** Relays that index NIP-65 relay lists (kind 10002) */
export const RELAY_LIST_INDEXERS = ['wss://purplepag.es'];

function newestRelayLists(events: SignedEvent[]): SignedEvent[] {
  const newest = new Map<string, SignedEvent>();
  for (const e of events) {
    if (e.kind !== 10002) continue;
    const current = newest.get(e.pubkey);
    if (!current || e.created_at > current.created_at) newest.set(e.pubkey, e);
  }
  return Array.from(newest.values());
}

const relayTags = (e: SignedEvent) => e.tags.filter((t) => t[0] === 'r' && t[1]);
const normalize = (url: string) => url.replace(/\/+$/, '');

/**
 * Relay URLs from each author's newest kind 10002 event, read and write alike:
 * many clients mark every relay "read", and callers mostly want "where this
 * user's events live".
 */
export function relayListUrls(events: SignedEvent[]): string[] {
  const urls = newestRelayLists(events).flatMap((e) => relayTags(e).map((t) => normalize(t[1])));
  return Array.from(new Set(urls));
}

/**
 * Write relays (marked "write" or unmarked) from the newest kind 10002 event.
 * If the list has none, all its relays: a list marked read-only everywhere is
 * still where the user expects their events.
 */
export function publishRelayListUrls(events: SignedEvent[]): string[] {
  const tags = newestRelayLists(events).flatMap(relayTags);
  const write = tags.filter((t) => !t[2] || t[2] === 'write');
  return Array.from(new Set((write.length > 0 ? write : tags).map((t) => normalize(t[1]))));
}

const listCache = new Map<string, Promise<SignedEvent[]>>();

function fetchRelayList(pubkey: string, relays: string[]): Promise<SignedEvent[]> {
  const key = `${pubkey}|${relays.join(',')}`;
  let cached = listCache.get(key);
  if (!cached) {
    cached = fetchEvents({ authors: [pubkey], kinds: [10002] }, [
      ...relays,
      ...RELAY_LIST_INDEXERS,
    ]).catch(() => {
      listCache.delete(key);
      return [];
    });
    listCache.set(key, cached);
  }
  return cached;
}

/**
 * The NIP-65 relays of `pubkeys` plus `relays`, so feeds find events published
 * only to the authors' own relays. Falls back to `relays` if no list is found.
 * Lookups are cached per pubkey.
 */
export async function fetchUserRelays(
  pubkeys: string | string[],
  relays: string[] = DEFAULT_RELAYS
): Promise<string[]> {
  const lists = await Promise.all(
    (Array.isArray(pubkeys) ? pubkeys : [pubkeys]).map((pk) => fetchRelayList(pk, relays))
  );
  return Array.from(new Set([...relayListUrls(lists.flat()), ...relays]));
}

/** The signer's write relays (NIP-07 getRelays), if it provides them */
async function signerWriteRelays(): Promise<string[]> {
  if (typeof window === 'undefined' || !window.nostr?.getRelays) return [];
  try {
    const relayMap = await window.nostr.getRelays();
    return Object.entries(relayMap)
      .filter(([, config]) => config.write)
      .map(([url]) => normalize(url));
  } catch {
    return [];
  }
}

/**
 * Where to publish `pubkey`'s events: the signer's write relays (NIP-07
 * getRelays), the user's NIP-65 write relays, and `relays` for reach.
 */
export async function getPublishRelays(
  pubkey: string,
  relays: string[] = DEFAULT_RELAYS
): Promise<string[]> {
  const [signer, list] = await Promise.all([
    signerWriteRelays(),
    fetchRelayList(pubkey, relays).then(publishRelayListUrls),
  ]);
  return Array.from(new Set([...signer, ...list, ...relays]));
}

/** @internal for tests */
export function clearRelayListCache(): void {
  listCache.clear();
}
