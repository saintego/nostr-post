import { dryRunEventsForReads } from './dryRun';
import { cachedEvents, cacheEvent } from './eventCache';
import type { FetchFilter, SignedEvent } from './index';
import { subscribe } from './relayPool';
/** Default relays to publish to */
export const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];

/**
 * Whether `event` matches `filter`. Relays don't always apply filters exactly
 * (e.g. relay.wikifreedia.xyz fuzzy-matches `#d`), so results are checked
 * client-side. `search` (NIP-50) and `limit` are left to the relay.
 */
export function matchesFilter(event: SignedEvent, filter: FetchFilter): boolean {
  if (filter.ids && !filter.ids.includes(event.id)) return false;
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
  if (filter.since !== undefined && event.created_at < filter.since) return false;
  if (filter.until !== undefined && event.created_at > filter.until) return false;
  return Object.entries(filter).every(([key, values]) => matchesTagFilter(event, key, values));
}

/** `#x` filter entries require a tag x with one of the values; other keys pass */
function matchesTagFilter(event: SignedEvent, key: string, values: unknown): boolean {
  if (!key.startsWith('#') || !Array.isArray(values)) return true;
  const wanted = values.map(String);
  return event.tags.some((t) => t[0] === key.slice(1) && wanted.includes(t[1]));
}

// Module state: where each fetched event was found, for relay hints and raw-data views
const seenOn = new Map<string, string[]>();

const noteSeenOn = (id: string, relayUrl: string) => {
  const relays = seenOn.get(id) ?? [];
  if (!relays.includes(relayUrl)) seenOn.set(id, [...relays, relayUrl]);
};

/** The relays an event was fetched from in this session, in the order it came; [] if none */
export const relaysSeenOn = (id: string): string[] => seenOn.get(id) ?? [];

/**
 * Fetch events from a single relay, over its shared connection (`relayPool`). Events that don't
 * match any of the filters are dropped (see matchesFilter); those that do are kept in the
 * session cache (`eventCache`). In dry-run mode, logged events matching the filters are returned
 * too.
 */
export function fetchEventsFromRelay(
  relayUrl: string,
  filter: FetchFilter | FetchFilter[],
  options?: {
    onEvent?: (event: SignedEvent) => void;
    relayTimeoutMs?: number;
    /** Reject on timeout instead of resolving with the events received so far */
    rejectOnTimeout?: boolean;
  }
): Promise<SignedEvent[]> {
  return new Promise((resolve, reject) => {
    const events: SignedEvent[] = [];
    const filters = Array.isArray(filter) ? filter : [filter];
    let unsubscribe = () => {};
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      if (error) reject(error);
      else resolve(events);
    };

    const timeoutMs = options?.relayTimeoutMs ?? 10000;
    const timeout = setTimeout(() => {
      // Return what we have, or reject when asked to
      finish(options?.rejectOnTimeout ? new Error(`Timeout waiting for ${relayUrl}`) : undefined);
    }, timeoutMs);

    const acceptEvent = (ev: SignedEvent, fromRelay = false) => {
      if (settled || !filters.some((f) => matchesFilter(ev, f))) return;
      if (fromRelay) {
        noteSeenOn(ev.id, relayUrl);
        cacheEvent(ev);
      }
      events.push(ev);
      // Notify progressive listeners
      try {
        options?.onEvent?.(ev);
      } catch {
        // ignore listener errors
      }
    };

    const dryRunEvents = dryRunEventsForReads();
    if (dryRunEvents.length > 0) {
      queueMicrotask(() => {
        for (const ev of dryRunEvents) acceptEvent(ev);
      });
    }

    unsubscribe = subscribe(relayUrl, filters, {
      onEvent: (ev) => acceptEvent(ev as SignedEvent, true),
      onEose: () => finish(),
      // The relay refused or ended the subscription (e.g. an unsupported filter)
      onClosed: () => finish(),
      onError: () => finish(new Error(`Failed to connect to ${relayUrl}`)),
    });
  });
}

/** Replaceable kinds (NIP-01): one event per author and kind */
const isReplaceableKind = (kind: number): boolean =>
  kind === 0 || kind === 3 || (kind >= 10000 && kind < 20000);

/**
 * Whether the filters ask for particular events: by id, or one author's addressable or
 * replaceable events. The cache's copy answers those at once (relays may still have newer).
 */
const asksForParticularEvents = (filters: FetchFilter[]): boolean =>
  filters.length > 0 &&
  filters.every(
    (f) =>
      !f.search &&
      (!!f.ids?.length ||
        (!!f.authors?.length &&
          (!!f['#d']?.length || (!!f.kinds?.length && f.kinds.every(isReplaceableKind)))))
  );

/** How long the other relays get once the first one finished, waiting for all (ms) */
const SETTLE_MS = 2500;

/**
 * Fetch events from multiple relays in parallel, over shared connections, cache first:
 *
 * - The session cache answers first: its matching events are shown at once (`onUpdate`), and a
 *   query for particular events (by id, an author's addressable or replaceable events) resolves
 *   with them right away. The relays are asked all the same: newer and more events follow
 *   through `onUpdate` (and are cached for the next query).
 * - Otherwise it resolves with the first relay that returns events (or once all replied empty);
 *   the other relays keep going in the background, through `onUpdate`.
 * - `waitForAll`: for callers that need everything (a slug's availability, a page's newest
 *   version): resolves once every relay finished (EOSE, CLOSED, error or its timeout), or
 *   `settleMs` (default 2.5 s) after the first relay finished, so one slow relay doesn't hold it.
 *   With `complete`, every relay's answer, each up to its timeout: for callers that write on top
 *   of what they read (a list, a page's newest version) or create what isn't found.
 * - `relayTimeoutMs`: per-relay timeout (default 10 000 ms).
 */
export const fetchEvents = (
  filter: FetchFilter | FetchFilter[],
  relays: string[] = DEFAULT_RELAYS,
  options?: {
    onUpdate?: (events: SignedEvent[]) => void;
    relayTimeoutMs?: number;
    waitForAll?: boolean;
    /** With `waitForAll`: how long the others get after the first relay finished (ms) */
    settleMs?: number;
    /**
     * With `waitForAll`: every relay's answer (each up to its timeout), for callers that write on
     * top of what they read (a list, a page's newest version) or create what isn't found
     */
    complete?: boolean;
  }
): Promise<SignedEvent[]> => {
  const filters = Array.isArray(filter) ? filter : [filter];
  const seenIds = new Set<string>();
  const allEvents: SignedEvent[] = [];

  const addEvent = (ev: SignedEvent): boolean => {
    if (seenIds.has(ev.id)) return false;
    seenIds.add(ev.id);
    allEvents.push(ev);
    allEvents.sort((a, b) => b.created_at - a.created_at);
    return true;
  };

  const onEvent = (ev: SignedEvent) => {
    if (addEvent(ev) && options?.onUpdate) {
      options.onUpdate([...allEvents]);
    }
  };

  // Cache first: what this session already has
  const cached = cachedEvents(filters);
  for (const ev of cached) addEvent(ev);
  if (cached.length > 0 && options?.onUpdate) {
    const onUpdate = options.onUpdate;
    queueMicrotask(() => onUpdate([...allEvents]));
  }

  const relayPromises = relays.map((relay) =>
    fetchEventsFromRelay(relay, filters, {
      onEvent,
      relayTimeoutMs: options?.relayTimeoutMs,
    })
  );

  if (options?.waitForAll) return waitForRelays(relayPromises, allEvents, addEvent, options);

  // Particular events the cache has: answered now, the relays go on in the background
  if (cached.length > 0 && asksForParticularEvents(filters)) {
    for (const promise of relayPromises) promise.catch(() => {});
    return Promise.resolve([...allEvents]);
  }

  // Resolve with the first relay that returns events; an empty answer from a
  // fast relay must not hide events another relay has. Empty if all are empty.
  return new Promise<SignedEvent[]>((resolve) => {
    let pending = relayPromises.length;
    if (pending === 0) resolve([...allEvents]);
    for (const promise of relayPromises) {
      promise
        .then((batch) => {
          for (const ev of batch) addEvent(ev);
          if (allEvents.length > 0) resolve([...allEvents]);
        })
        .catch(() => {})
        .finally(() => {
          pending--;
          if (pending === 0) resolve([...allEvents]);
        });
    }
  }).then((events) => {
    if (options?.onUpdate) options.onUpdate([...allEvents]);
    return events;
  });
};

/**
 * Every relay's answer, ending when all finished or `settleMs` after the first one did: one slow
 * relay doesn't hold the caller up to its timeout
 */
const waitForRelays = (
  relayPromises: Promise<SignedEvent[]>[],
  allEvents: SignedEvent[],
  addEvent: (ev: SignedEvent) => boolean,
  options: { onUpdate?: (events: SignedEvent[]) => void; settleMs?: number; complete?: boolean }
): Promise<SignedEvent[]> =>
  new Promise<SignedEvent[]>((resolve) => {
    let pending = relayPromises.length;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      clearTimeout(settleTimer);
      if (options.onUpdate) options.onUpdate([...allEvents]);
      resolve([...allEvents]);
    };
    if (pending === 0) return done();
    for (const promise of relayPromises) {
      promise
        .then((batch) => {
          for (const ev of batch) addEvent(ev);
        })
        .catch(() => {})
        .finally(() => {
          pending--;
          if (pending === 0) return done();
          if (!options.complete) settleTimer ??= setTimeout(done, options.settleMs ?? SETTLE_MS);
        });
    }
  });
