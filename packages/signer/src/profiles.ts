/**
 * @nostr-post/signer - User profiles (kind 0)
 *
 * One cache for every component that shows names. Lookups made in the same tick
 * (e.g. every post and comment of a feed rendering) go out as one batched request;
 * a pubkey already being fetched isn't asked for again.
 */

import { DEFAULT_RELAYS, fetchEvents } from './fetch';
import type { SignedEvent } from './index';
import { INDEXER_RELAYS } from './relays';

export type NostrProfile = {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
};

export type ProfileOptions = {
  /** Relays to read from; the indexer relays are always added. Default: DEFAULT_RELAYS */
  relays?: string[];
  /** Extra relays that may have the profiles, e.g. an `nprofile`'s relay hints */
  hints?: readonly string[];
};

/** At most this many relay hints are added to a request */
const MAX_RELAY_HINTS = 4;

/** Filters per REQ: relays limit how many one request may carry */
const FILTERS_PER_REQUEST = 10;

type Batch = {
  relays: string[];
  hints: Set<string>;
  resolvers: Map<string, (profile: NostrProfile | undefined) => void>;
};

const cache = new Map<string, NostrProfile>();
const inFlight = new Map<string, Promise<NostrProfile | undefined>>();
/** Batches waiting for the next tick, by relay list */
const batches = new Map<string, Batch>();

/** The newest kind 0 per pubkey, parsed; malformed profiles are skipped */
export const newestProfiles = (events: readonly SignedEvent[]): Map<string, NostrProfile> => {
  const newest = new Map<string, SignedEvent>();
  for (const event of events) {
    if (event.kind !== 0) continue;
    const seen = newest.get(event.pubkey);
    if (!seen || event.created_at > seen.created_at) newest.set(event.pubkey, event);
  }
  const profiles = new Map<string, NostrProfile>();
  for (const [pubkey, event] of newest) {
    try {
      profiles.set(pubkey, JSON.parse(event.content) as NostrProfile);
    } catch {
      // Ignore malformed metadata profiles
    }
  }
  return profiles;
};

/** Relays plus indexers plus up to MAX_RELAY_HINTS `wss://` hints, without duplicates */
const requestRelays = (relays: string[], hints: Iterable<string>): string[] => {
  const base = [...new Set([...relays, ...INDEXER_RELAYS])];
  const extra = [...hints]
    .filter((url) => url.startsWith('wss://') && !base.includes(url))
    .slice(0, MAX_RELAY_HINTS);
  return [...base, ...extra];
};

/**
 * Kind 0 events of `pubkeys`. One filter per pubkey with `limit: 1`: with all pubkeys in one
 * filter, relays that keep old profile versions (purplepag.es) hit their result cap first.
 */
const fetchProfileEvents = async (
  pubkeys: readonly string[],
  relays: string[]
): Promise<SignedEvent[]> => {
  const requests: Promise<SignedEvent[]>[] = [];
  for (let i = 0; i < pubkeys.length; i += FILTERS_PER_REQUEST) {
    const filters = pubkeys
      .slice(i, i + FILTERS_PER_REQUEST)
      .map((pubkey) => ({ kinds: [0], authors: [pubkey], limit: 1 }));
    requests.push(fetchEvents(filters, relays, { waitForAll: true }));
  }
  return (await Promise.all(requests)).flat();
};

const runBatch = async (batch: Batch) => {
  const pubkeys = [...batch.resolvers.keys()];
  let found = new Map<string, NostrProfile>();
  try {
    found = newestProfiles(
      await fetchProfileEvents(pubkeys, requestRelays(batch.relays, batch.hints))
    );
  } catch (error) {
    console.warn('Failed to load profiles:', error);
  }
  for (const [pubkey, resolve] of batch.resolvers) {
    const profile = found.get(pubkey);
    if (profile) cache.set(pubkey, profile);
    // Not found: forget the lookup so a later one tries again
    inFlight.delete(pubkey);
    resolve(profile);
  }
};

/** Queue `pubkey` in the batch for `relays`, sent on the next tick */
const enqueue = (
  pubkey: string,
  relays: string[],
  hints: readonly string[]
): Promise<NostrProfile | undefined> => {
  const key = relays.join(',');
  let batch = batches.get(key);
  if (!batch) {
    const created: Batch = { relays, hints: new Set(), resolvers: new Map() };
    batches.set(key, created);
    setTimeout(() => {
      batches.delete(key);
      void runBatch(created);
    }, 0);
    batch = created;
  }
  for (const hint of hints) batch.hints.add(hint);
  const pending = batch;
  const promise = new Promise<NostrProfile | undefined>((resolve) => {
    pending.resolvers.set(pubkey, resolve);
  });
  inFlight.set(pubkey, promise);
  return promise;
};

/** A profile already loaded, without fetching */
export const getCachedProfile = (pubkey: string): NostrProfile | undefined => cache.get(pubkey);

/** The profile of `pubkey` (newest kind 0), from the cache or relays; undefined if none found */
export const fetchProfile = (
  pubkey: string,
  options: ProfileOptions = {}
): Promise<NostrProfile | undefined> => {
  const cached = cache.get(pubkey);
  if (cached) return Promise.resolve(cached);
  return (
    inFlight.get(pubkey) ?? enqueue(pubkey, options.relays ?? DEFAULT_RELAYS, options.hints ?? [])
  );
};

/** Profiles of `pubkeys` that were found, by pubkey (see fetchProfile) */
export const fetchProfiles = async (
  pubkeys: readonly string[],
  options: ProfileOptions = {}
): Promise<Map<string, NostrProfile>> => {
  const unique = [...new Set(pubkeys)].filter(Boolean);
  const profiles = await Promise.all(unique.map((pubkey) => fetchProfile(pubkey, options)));
  return new Map(
    unique.flatMap((pubkey, i) => {
      const profile = profiles[i];
      return profile ? [[pubkey, profile] as const] : [];
    })
  );
};

/** @internal for tests */
export const clearProfileCache = (): void => {
  cache.clear();
  inFlight.clear();
  batches.clear();
};
