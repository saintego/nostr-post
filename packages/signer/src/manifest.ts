import { resolveManifest } from '@nostr-post/core/manifest';
import {
  MANIFEST_D_TAG_PREFIX,
  NIP78_KIND,
  eventToManifest,
  parseManifestATag,
} from '@nostr-post/core/nip78';
import type { StoredManifest } from '@nostr-post/core/nip78';
import { fetchEvents } from './fetch';

/**
 * Central manifest cache and fetch helpers.
 * - Caches resolved manifests by `a` tag and by canonical `a` tag built from results.
 * - Dedupes in-flight fetches to avoid duplicate relay queries.
 */
const manifestCache = new Map<string, StoredManifest>();
const inflight = new Map<string, Promise<StoredManifest | undefined>>();

/** Normalize a manifest reference to a full a-tag. Bare IDs become `30078::<dTag>`. */
const toATag = (ref: string): string =>
  ref.startsWith(`${NIP78_KIND}:`) ? ref : `${NIP78_KIND}::${MANIFEST_D_TAG_PREFIX}${ref}`;

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
  const normalizedATag = toATag(aTag);
  const stored = manifestCache.get(normalizedATag);
  if (stored) {
    manifestCache.delete(`${NIP78_KIND}:${stored.pubkey}:${stored.dTag}`);
    manifestCache.delete(`${NIP78_KIND}::${stored.dTag}`);
  }
  manifestCache.delete(normalizedATag);
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
    if (ref?.pubkey) {
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

/** Maximum inheritance depth to prevent very long (non-cyclic) chains. */
const MAX_INHERITANCE_DEPTH = 10;

/**
 * Internal: fetch a single raw manifest event (cache + inflight dedup, no inheritance).
 */
async function fetchRawManifest(
  aTag: string,
  relays?: string[],
  fallbackToD = true
): Promise<StoredManifest | undefined> {
  const cached = manifestCache.get(aTag);
  if (cached) return cached;

  const existing = inflight.get(aTag);
  if (existing) return existing;

  const promise = doFetchManifest(aTag, relays, fallbackToD);
  inflight.set(aTag, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(aTag);
  }
}

/**
 * Internal recursive helper that walks the `extends` chain.
 * Supports both single-string and array `extends`.
 *
 * Array merge order: parents are resolved left-to-right, each overriding the
 * previous (rightmost wins among siblings). The child is always applied last.
 */
async function resolveChain(
  aTag: string,
  relays: string[] | undefined,
  fallbackToD: boolean,
  visitedIds: ReadonlySet<string>,
  depth: number
): Promise<StoredManifest | undefined> {
  const stored = await fetchRawManifest(aTag, relays, fallbackToD);
  if (!stored) return undefined;

  const { extends: parentRef } = stored.manifest;
  if (!parentRef) return stored;

  // Use canonical a-tag for cycle detection so manifests with the same `id`
  // from different pubkeys are not confused.
  const canonicalATag = `${NIP78_KIND}:${stored.pubkey}:${stored.dTag}`;

  if (depth >= MAX_INHERITANCE_DEPTH || visitedIds.has(canonicalATag)) {
    console.warn(
      `[nostr-post] Manifest inheritance stopped at "${canonicalATag}" ` +
        `(depth=${depth}, cycle=${visitedIds.has(canonicalATag)}).`
    );
    return { ...stored, manifest: { ...stored.manifest, extends: undefined } };
  }

  const nextVisited = new Set(visitedIds).add(canonicalATag);
  const parentRefs = Array.isArray(parentRef) ? parentRef : [parentRef];

  // Fetch all parents in parallel
  const parentStoreds = await Promise.all(
    parentRefs.map((ref) => resolveChain(toATag(ref), relays, fallbackToD, nextVisited, depth + 1))
  );

  const foundParents = parentStoreds.filter((p): p is StoredManifest => p !== undefined);

  if (foundParents.length === 0) {
    console.warn(
      `[nostr-post] Could not fetch any parent manifests for "${stored.manifest.id}". ` +
        'Using child manifest without inheritance.'
    );
    return { ...stored, manifest: { ...stored.manifest, extends: undefined } };
  }

  if (foundParents.length < parentRefs.length) {
    console.warn(
      `[nostr-post] Some parent manifests could not be fetched for "${stored.manifest.id}".`
    );
  }

  // Merge parents left-to-right (each successive parent treated as "child" of the previous,
  // so rightmost wins on conflict). Then apply the actual child on top.
  const mergedParent = foundParents
    .slice(1)
    .reduce(
      (base, current) => ({ ...base, manifest: resolveManifest(current.manifest, base.manifest) }),
      foundParents[0]
    );

  const resolved: StoredManifest = {
    ...stored,
    manifest: resolveManifest(stored.manifest, mergedParent.manifest),
  };
  // Cache resolved result so repeated calls skip recomputation
  manifestCache.set(aTag, resolved);
  manifestCache.set(canonicalATag, resolved);
  return resolved;
}

/**
 * Fetch a manifest by its NIP-78 `a` tag and fully resolve its inheritance
 * chain via the `extends` field.
 *
 * Results from relay fetches are cached. Concurrent requests for the same
 * `aTag` are deduped. Cycle detection and a depth limit of 10 prevent
 * infinite loops.
 *
 * `extends` accepts either a full NIP-78 a-tag (`"30078:<pubkey>:nostr-post:<id>"`)
 * or a bare manifest ID (author-agnostic d-tag lookup).
 */
export async function fetchManifestByATag(
  aTag: string,
  relays?: string[],
  fallbackToD = true
): Promise<StoredManifest | undefined> {
  return resolveChain(toATag(aTag), relays, fallbackToD, new Set(), 0);
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
