/**
 * Where <nostr-post-feed> reads from: explicit relays, else the default relays
 * right away and, once looked up, the authors' NIP-65 relays as well, so the
 * relay list lookup doesn't hold up the first events.
 */

import { DEFAULT_RELAYS, type FetchFilter, fetchEvents, fetchUserRelays } from '@nostr-post/signer';
import { mergeUniqueEventsById } from './feedData';
import type { SignedEvent } from './signer';

/** Above this many authors, the feed skips per-author relay list lookups */
export const MAX_AUTHOR_RELAY_LOOKUPS = 10;

export interface FeedFetchOptions {
  /** Explicit relays: only these are read */
  relays?: string[];
  authors?: string[];
  onUpdate: (events: SignedEvent[]) => void;
}

/** The authors' relays plus defaults, unless there are none or too many authors to look up */
const lookUpAuthorRelays = (authors: string[] = []): Promise<string[] | undefined> =>
  authors.length === 0 || authors.length > MAX_AUTHOR_RELAY_LOOKUPS
    ? Promise.resolve(undefined)
    : fetchUserRelays(authors).catch(() => undefined);

/**
 * The feed's events, newest first, reported through `onUpdate` as they arrive;
 * `readRelays` are the relays to read related events (comments, profiles) from.
 */
export async function fetchFeedEvents(
  filters: FetchFilter | FetchFilter[],
  { relays, authors, onUpdate }: FeedFetchOptions
): Promise<{ events: SignedEvent[]; readRelays?: string[] }> {
  if (relays) {
    return { events: await fetchEvents(filters, relays, { onUpdate }), readRelays: relays };
  }
  let merged: SignedEvent[] = [];
  const merge = (batch: SignedEvent[]): SignedEvent[] => {
    merged = mergeUniqueEventsById(merged, batch).sort((a, b) => b.created_at - a.created_at);
    return merged;
  };
  const update = (batch: SignedEvent[]) => onUpdate(merge(batch));

  const authorRelays = lookUpAuthorRelays(authors);
  const fromAuthors = authorRelays.then((found) => {
    const extra = (found ?? []).filter((url) => !DEFAULT_RELAYS.includes(url));
    return extra.length > 0 ? fetchEvents(filters, extra, { onUpdate: update }) : [];
  });
  const [fromDefaults, fromAuthorRelays, readRelays] = await Promise.all([
    fetchEvents(filters, DEFAULT_RELAYS, { onUpdate: update }),
    fromAuthors,
    authorRelays,
  ]);
  merge(fromDefaults);
  return { events: merge(fromAuthorRelays), readRelays };
}
