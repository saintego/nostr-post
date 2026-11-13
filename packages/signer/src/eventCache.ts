/**
 * Events fetched in this session, kept in memory by id, so a query is answered at once from what
 * was already seen (`fetchEvents` still asks the relays, and newer or more events follow).
 * Filters with NIP-50 `search` aren't answered from it (only relays can search).
 */

import { matchesFilter } from './fetch';
import type { FetchFilter, SignedEvent } from './index';

/** At most this many events are kept; the oldest seen are forgotten first */
const MAX_EVENTS = 5000;

// Module state: the events seen, by id, in the order they were first seen
const byId = new Map<string, SignedEvent>();

/** Keeps a fetched event */
export function cacheEvent(event: SignedEvent): void {
  if (byId.has(event.id)) return;
  byId.set(event.id, event);
  if (byId.size > MAX_EVENTS) {
    const oldest = byId.keys().next().value;
    if (oldest !== undefined) byId.delete(oldest);
  }
}

/**
 * The cached events matching any of the filters, newest first, each filter's `limit` applied;
 * none for a filter with `search`
 */
export function cachedEvents(filters: FetchFilter[]): SignedEvent[] {
  const found = new Map<string, SignedEvent>();
  for (const filter of filters) {
    if (filter.search) continue;
    const matching = [...byId.values()]
      .filter((event) => matchesFilter(event, filter))
      .sort((a, b) => b.created_at - a.created_at);
    for (const event of filter.limit ? matching.slice(0, filter.limit) : matching) {
      found.set(event.id, event);
    }
  }
  return [...found.values()].sort((a, b) => b.created_at - a.created_at);
}

/** Forgets every cached event (sign-out, tests) */
export function clearEventCache(): void {
  byId.clear();
}
