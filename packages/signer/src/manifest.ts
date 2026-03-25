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

  const promise = (async () => {
    // Try parsing as an `a` tag first
    const ref = parseManifestATag(aTag);
    try {
      if (ref) {
        const events = await fetchEvents(
          {
            kinds: [NIP78_KIND],
            authors: [ref.pubkey],
            '#d': [ref.dTag],
          },
          relays
        );

        if (events.length > 0) {
          const stored = eventToManifest(events[0]);
          if (stored) {
            manifestCache.set(aTag, stored);
            // also cache under canonical a tag (kind:pubkey:dTag)
            const canonical = `${NIP78_KIND}:${stored.pubkey}:${stored.dTag}`;
            manifestCache.set(canonical, stored);
            return stored;
          }
        }
      }

      // Optional: fallback to querying by d-tag across all authors
      if (fallbackToD) {
        // If we were given an aTag, extract dTag; otherwise treat aTag as dTag if it looks like one
        const dTag = ref?.dTag;
        if (dTag) {
          const events = await fetchEvents({ kinds: [NIP78_KIND], '#d': [dTag], limit: 1 }, relays);
          if (events.length > 0) {
            const stored = eventToManifest(events[0]);
            if (stored) {
              const canonical = `${NIP78_KIND}:${stored.pubkey}:${stored.dTag}`;
              manifestCache.set(canonical, stored);
              manifestCache.set(aTag, stored);
              return stored;
            }
          }
        }
      }
    } catch (err) {
      // swallow - caller can decide what to do
      // keep undefined result
    }

    return undefined;
  })();

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
