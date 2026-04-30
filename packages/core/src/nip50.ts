/**
 * @nostr-post/core - NIP-50 Search utilities
 *
 * NIP-50 defines a `search` field in REQ filters that relay-side full-text
 * search implementations honour. Not all relays support it, so this utility
 * always runs a parallel exact-tag fallback query and merges the results.
 *
 * The function is transport-agnostic: pass any `fetchFn` compatible with
 * `@nostr-post/signer`'s `fetchEvents` (or a test stub).
 */

/** Minimal opaque filter type — consumers cast to their concrete filter type. */
export type NostrFilter = Record<string, unknown>;

/**
 * A function that fetches Nostr events from a set of relays.
 * Compatible with `fetchEvents` from `@nostr-post/signer`.
 */
export type FetchFn<T> = (filter: NostrFilter, relays: string[]) => Promise<T[]>;

export interface Nip50SearchOptions<T> {
  /** Transport function — pass `fetchEvents` from `@nostr-post/signer`. */
  fetchFn: FetchFn<T>;
  /** The raw user query string, used as the NIP-50 `search` value. */
  query: string;
  /**
   * Base filter merged into both requests (e.g. `{ kinds: [30818] }`).
   * The NIP-50 request adds `search` + `nip50Limit`; the fallback adds the
   * exact tag fields from `fallbackFilter` + `fallbackLimit`.
   */
  baseFilter: NostrFilter;
  /**
   * Additional filter fields for the exact-tag fallback request
   * (e.g. `{ '#d': ['pliny-the-elder'] }`).
   * When omitted the fallback request is skipped.
   */
  fallbackFilter?: NostrFilter;
  /** Max events to request via NIP-50. Defaults to 30. */
  nip50Limit?: number;
  /** Max events to request via the fallback. Defaults to 20. */
  fallbackLimit?: number;
  /** Relay URLs to query. */
  relays: string[];
  /**
   * Function that extracts a unique key from an event for deduplication.
   * Defaults to `(ev) => (ev as { id: string }).id`.
   */
  getId?: (event: T) => string;
}

/**
 * Search for Nostr events using NIP-50 full-text search with an exact-tag
 * fallback, running both queries in parallel and merging the results.
 *
 * Relays that support NIP-50 (e.g. relay.nostr.band) will honour the `search`
 * field; relays that don't will typically return nothing for that filter.
 * The fallback ensures at least exact slug matches are always returned.
 *
 * @returns Deduplicated array of events — NIP-50 results first, then any
 *          additional events from the fallback that weren't already included.
 */
export async function nip50Search<T>(options: Nip50SearchOptions<T>): Promise<T[]> {
  const {
    fetchFn,
    query,
    baseFilter,
    fallbackFilter,
    nip50Limit = 30,
    fallbackLimit = 20,
    relays,
    getId = (ev) => (ev as { id: string }).id,
  } = options;

  const nip50Filter: NostrFilter = { ...baseFilter, search: query, limit: nip50Limit };
  const queries: Promise<T[]>[] = [fetchFn(nip50Filter, relays).catch((): T[] => [])];

  if (fallbackFilter) {
    const exactFilter: NostrFilter = { ...baseFilter, ...fallbackFilter, limit: fallbackLimit };
    queries.push(fetchFn(exactFilter, relays).catch((): T[] => []));
  }

  const results = await Promise.all(queries);
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const ev of results.flat()) {
    const key = getId(ev);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(ev);
    }
  }
  return merged;
}
