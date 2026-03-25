import type { FetchFilter, SignedEvent } from './index';

/**
 * Fetch events from a single relay
 */
export function fetchEventsFromRelay(
  relayUrl: string,
  filter: FetchFilter | FetchFilter[]
): Promise<SignedEvent[]> {
  return new Promise((resolve, reject) => {
    const events: SignedEvent[] = [];
    const ws = new WebSocket(relayUrl);
    const subId = Math.random().toString(36).substring(7);
    const filters = Array.isArray(filter) ? filter : [filter];

    const timeout = setTimeout(() => {
      ws.close();
      resolve(events); // Return what we have
    }, 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify(['REQ', subId, ...filters]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === 'EVENT' && data[1] === subId) {
          events.push(data[2] as SignedEvent);
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
 */
export async function fetchEvents(
  filter: FetchFilter | FetchFilter[],
  relays: string[] = []
): Promise<SignedEvent[]> {
  const results = await Promise.allSettled(
    relays.map((relay) => fetchEventsFromRelay(relay, filter))
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
