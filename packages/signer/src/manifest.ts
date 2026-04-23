import { NIP78_KIND, eventToManifest, parseManifestATag } from '@nostr-post/core/nip78';
import type { StoredManifest } from '@nostr-post/core/nip78';
import { fetchEvents } from './fetch';

/**
 * Central manifest cache and fetch helpers.
 * - Caches resolved manifests by `a` tag and by canonical `a` tag built from results.
 * - Dedupes in-flight fetches to avoid duplicate relay queries.
 */
const manifestCache = new Map<string, StoredManifest>();
const inflight = new Map<string, Promise<StoredManifest | undefined>>();

/** Get a manifest from the cache (if present) by an `a` tag or key. */
export function getCachedManifest(aTag: string): StoredManifest | undefined {
  return manifestCache.get(aTag);
}

/** Clear cache for a specific aTag or the whole cache if no key provided. */
export function clearManifestCache(aTag?: string): void {
  if (!aTag) {
    manifestCache.clear();
    return;
  }
  manifestCache.delete(aTag);
}

function storeAndReturn(
  aTag: string,
  event: {
    kind: number;
    content: string;
    tags: string[][];
    pubkey: string;
    created_at: number;
    id?: string;
  }
): StoredManifest | undefined {
  const stored = eventToManifest(event);
  if (!stored) return undefined;
  manifestCache.set(aTag, stored);
  manifestCache.set(`${NIP78_KIND}:${stored.pubkey}:${stored.dTag}`, stored);
  return stored;
}

const getLatestEvent = <T extends { created_at: number }>(events: T[]): T | undefined => {
  return [...events].sort((left, right) => right.created_at - left.created_at)[0];
};

async function doFetchManifest(
  aTag: string,
  relays?: string[],
  fallbackToD = true
): Promise<StoredManifest | undefined> {
  const ref = parseManifestATag(aTag);
  try {
    if (ref) {
      const events = await fetchEvents(
        { kinds: [NIP78_KIND], authors: [ref.pubkey], '#d': [ref.dTag] },
        relays
      );
      const latestEvent = getLatestEvent(events);
      const stored = latestEvent ? storeAndReturn(aTag, latestEvent) : undefined;
      if (stored) return stored;
    }
    if (fallbackToD && ref?.dTag) {
      const events = await fetchEvents({ kinds: [NIP78_KIND], '#d': [ref.dTag], limit: 1 }, relays);
      const latestEvent = getLatestEvent(events);
      if (latestEvent) return storeAndReturn(aTag, latestEvent);
    }
  } catch {
    // swallow errors - caller handles undefined
  }
  return undefined;
}

/**
 * Fetch a manifest referenced by an `a` tag (e.g. "30078:<pubkey>:nostr-post:...")
 * Optionally fallback to querying by the `d` tag across authors when `fallbackToD` is true.
 * Results are cached and concurrent requests for the same `aTag` are deduped.
 */
export async function fetchManifestByATag(
  aTag: string,
  relays?: string[],
  fallbackToD = true
): Promise<StoredManifest | undefined> {
  // Return cached
  const cached = manifestCache.get(aTag);
  if (cached) return cached;

  // Return in-flight
  const existing = inflight.get(aTag);
  if (existing) return existing;

  const promise = doFetchManifest(aTag, relays, fallbackToD);

  inflight.set(aTag, promise);
  try {
    const res = await promise;
    return res;
  } finally {
    inflight.delete(aTag);
  }
}

/** Batch fetch many aTags in parallel (shares cache/inflight). */
export async function fetchManifestsByATags(
  aTags: string[],
  relays?: string[],
  fallbackToD = true
): Promise<Map<string, StoredManifest | undefined>> {
  const results = new Map<string, StoredManifest | undefined>();
  await Promise.all(
    aTags.map(async (aTag) => {
      const stored = await fetchManifestByATag(aTag, relays, fallbackToD);
      results.set(aTag, stored);
    })
  );
  return results;
}

export { manifestCache as _manifestCache };
