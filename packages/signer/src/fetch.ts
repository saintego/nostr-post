import type { FetchFilter, SignedEvent } from './index';
/** Default relays to publish to */
export const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'];

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

/**
 * Fetch events from a single relay. Events that don't match any of the
 * filters are dropped (see matchesFilter).
 */
export function fetchEventsFromRelay(
  relayUrl: string,
  filter: FetchFilter | FetchFilter[],
  options?: { onEvent?: (event: SignedEvent) => void; relayTimeoutMs?: number }
): Promise<SignedEvent[]> {
  return new Promise((resolve, reject) => {
    const events: SignedEvent[] = [];
    const ws = new WebSocket(relayUrl);
    const subId = Math.random().toString(36).substring(7);
    const filters = Array.isArray(filter) ? filter : [filter];

    const timeoutMs = options?.relayTimeoutMs ?? 10000;
    const timeout = setTimeout(() => {
      ws.close();
      resolve(events); // Return what we have
    }, timeoutMs);

    ws.onopen = () => {
      ws.send(JSON.stringify(['REQ', subId, ...filters]));
    };

    const acceptEvent = (ev: SignedEvent) => {
      if (!filters.some((f) => matchesFilter(ev, f))) return;
      events.push(ev);
      // Notify progressive listeners
      try {
        options?.onEvent?.(ev);
      } catch {
        // ignore listener errors
      }
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === 'EVENT' && data[1] === subId) {
          acceptEvent(data[2] as SignedEvent);
        } else if (data[0] === 'EOSE') {
          clearTimeout(timeout);
          ws.send(JSON.stringify(['CLOSE', subId]));
          ws.close();
          resolve(events);
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Failed to connect to ${relayUrl}`));
    };
  });
}

/**
 * Fetch events from multiple relays in parallel.
 *
 * - Resolves as soon as the first relay returns events (or once all relays
 *   replied empty).
 *   Other relay connections continue running in the background.
 * - `onEvent` fires for every unique event across all relays (deduplicated by id).
 * - `relayTimeoutMs` controls per-relay timeout (default 10 000 ms).
 */
/**
 * Hybrid fetchEvents: resolves with first batch, continues to update via onUpdate.
 * @param filter Nostr filter(s)
 * @param relays List of relay URLs
 * @param options.onUpdate Called with deduped array of all events so far as new events arrive
 * @returns Promise that resolves with the first batch of events (from any relay)
 */
export const fetchEvents = (
  filter: FetchFilter | FetchFilter[],
  relays: string[] = DEFAULT_RELAYS,
  options?: {
    onUpdate?: (events: SignedEvent[]) => void;
    relayTimeoutMs?: number;
    waitForAll?: boolean;
  }
): Promise<SignedEvent[]> => {
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

  const relayPromises = relays.map((relay) =>
    fetchEventsFromRelay(relay, filter, {
      onEvent,
      relayTimeoutMs: options?.relayTimeoutMs,
    })
  );

  if (options?.waitForAll) {
    // Wait for all relays to settle
    return Promise.allSettled(relayPromises).then((results) => {
      for (const res of results) {
        if (res.status === 'fulfilled') {
          for (const ev of res.value) {
            addEvent(ev);
          }
        }
      }
      if (options?.onUpdate) options.onUpdate([...allEvents]);
      return [...allEvents];
    });
  }
  // Resolve with the first relay that returns events; an empty answer from a
  // fast relay must not hide events another relay has. Empty if all are empty.
  return new Promise<SignedEvent[]>((resolve) => {
    let pending = relayPromises.length;
    if (pending === 0) resolve([]);
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
