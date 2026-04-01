import type { FetchFilter, SignedEvent } from './index';
/** Default relays to publish to */
export const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'];

/**
 * Fetch events from a single relay
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

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === 'EVENT' && data[1] === subId) {
          const ev = data[2] as SignedEvent;
          events.push(ev);
          // Notify progressive listeners
          try {
            options?.onEvent?.(ev);
          } catch (err) {
            // ignore listener errors
          }
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
 * - Resolves as soon as the **first** relay replies (EOSE or timeout).
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
  // Wait for the first relay to respond
  return Promise.any(relayPromises)
    .then((firstBatch) => {
      for (const ev of firstBatch) {
        addEvent(ev);
      }
      if (options?.onUpdate) options.onUpdate([...allEvents]);
      return allEvents.length ? [...allEvents] : firstBatch;
    })
    .catch(() => []);
};
