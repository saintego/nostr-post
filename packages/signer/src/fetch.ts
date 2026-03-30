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
 * Fetch events from multiple relays (deduplicated by event id)
 * Progressive fetching / streaming
 *
 * The `fetchEvents` API supports progressive delivery so clients can render
 * results as relays respond instead of waiting for all relays to finish.
 *
 * Signature:
 * fetchEvents(filter, relays?, { onEvent?: (event) => void, relayTimeoutMs?: number })
 *
 * - onEvent: called for each event as it arrives (useful for incremental rendering).
 * - relayTimeoutMs: per-relay timeout in ms (default 10000).
 */
export async function fetchEvents(
  filter: FetchFilter | FetchFilter[],
  relays: string[] = DEFAULT_RELAYS,
  options?: { onEvent?: (event: SignedEvent) => void; relayTimeoutMs?: number }
): Promise<SignedEvent[]> {
  const results = await Promise.allSettled(
    relays.map((relay) => fetchEventsFromRelay(relay, filter, options))
  );

  const allEvents: SignedEvent[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const event of result.value) {
        if (!seenIds.has(event.id)) {
          seenIds.add(event.id);
          allEvents.push(event);
        }
      }
    }
  }

  // Sort by created_at descending
  return allEvents.sort((a, b) => b.created_at - a.created_at);
}
