/**
 * @nostr-post/web - Signer and Relay utilities
 *
 * Handles NIP-07 signing and relay publishing
 * Can be reused by @nostr-post/react in the future
 */

import type { UnsignedNostrEvent } from "@nostr-post/core/types";

/** Signed Nostr event with id and sig */
export interface SignedEvent extends UnsignedNostrEvent {
  id: string;
  sig: string;
}

/** NIP-07 window.nostr interface */
export interface Nip07Provider {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<SignedEvent>;
  getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
}

declare global {
  interface Window {
    nostr?: Nip07Provider;
  }
}

/** Default relays to publish to */
const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
];

/**
 * Sign an event using NIP-07 (window.nostr)
 */
export async function signEvent(
  event: UnsignedNostrEvent
): Promise<SignedEvent> {
  if (!window.nostr) {
    throw new Error(
      "No Nostr signer available. Please install a browser extension like Alby or use nostr-login."
    );
  }
  return window.nostr.signEvent(event);
}

/**
 * Get the current user's public key
 */
export async function getPublicKey(): Promise<string> {
  if (!window.nostr) {
    throw new Error("No Nostr signer available.");
  }
  return window.nostr.getPublicKey();
}

/**
 * Check if a signer is available
 */
export function hasNostrSigner(): boolean {
  return typeof window !== "undefined" && !!window.nostr;
}

/**
 * Publish a signed event to a single relay
 */
export function publishToRelay(
  event: SignedEvent,
  relayUrl: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Timeout connecting to ${relayUrl}`));
    }, 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify(["EVENT", event]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "OK") {
          clearTimeout(timeout);
          ws.close();
          if (data[2] === true) {
            resolve(true);
          } else {
            reject(new Error(data[3] || "Relay rejected event"));
          }
        }
      } catch (e) {
        // Ignore parse errors, wait for OK
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Failed to connect to ${relayUrl}`));
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

/**
 * Publish a signed event to multiple relays
 * Returns the number of successful publishes
 */
export async function publishToRelays(
  event: SignedEvent,
  relays: string[] = DEFAULT_RELAYS
): Promise<{
  success: number;
  failed: number;
  results: Array<{ relay: string; ok: boolean; error?: string }>;
}> {
  const results = await Promise.allSettled(
    relays.map(async (relay) => {
      try {
        await publishToRelay(event, relay);
        return { relay, ok: true };
      } catch (error) {
        return { relay, ok: false, error: (error as Error).message };
      }
    })
  );

  const finalResults = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { relay: "unknown", ok: false, error: "Unknown error" }
  );

  return {
    success: finalResults.filter((r) => r.ok).length,
    failed: finalResults.filter((r) => !r.ok).length,
    results: finalResults,
  };
}

/**
 * Sign and publish an event in one step
 */
export async function signAndPublish(
  event: UnsignedNostrEvent,
  relays: string[] = DEFAULT_RELAYS
): Promise<{
  signedEvent: SignedEvent;
  publishResults: Awaited<ReturnType<typeof publishToRelays>>;
}> {
  const signedEvent = await signEvent(event);
  const publishResults = await publishToRelays(signedEvent, relays);
  return { signedEvent, publishResults };
}

/**
 * Get user's preferred relays from NIP-07 provider
 */
export async function getUserRelays(): Promise<string[]> {
  if (!window.nostr?.getRelays) {
    return DEFAULT_RELAYS;
  }

  try {
    const relayMap = await window.nostr.getRelays();
    const writeRelays = Object.entries(relayMap)
      .filter(([, config]) => config.write)
      .map(([url]) => url);
    return writeRelays.length > 0 ? writeRelays : DEFAULT_RELAYS;
  } catch {
    return DEFAULT_RELAYS;
  }
}

/**
 * Get default relays
 */
export function getDefaultRelays(): string[] {
  return [...DEFAULT_RELAYS];
}

/**
 * Fetch events from a relay
 */
export function fetchEventsFromRelay(
  relayUrl: string,
  filter: { kinds?: number[]; authors?: string[]; limit?: number }
): Promise<SignedEvent[]> {
  return new Promise((resolve, reject) => {
    const events: SignedEvent[] = [];
    const ws = new WebSocket(relayUrl);
    const subId = Math.random().toString(36).substring(7);

    const timeout = setTimeout(() => {
      ws.close();
      resolve(events); // Return what we got
    }, 5000);

    ws.onopen = () => {
      ws.send(JSON.stringify(["REQ", subId, filter]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === "EVENT" && data[1] === subId) {
          events.push(data[2] as SignedEvent);
        } else if (data[0] === "EOSE") {
          clearTimeout(timeout);
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
 * Fetch events from multiple relays and deduplicate
 */
export async function fetchEvents(
  filter: { kinds?: number[]; authors?: string[]; limit?: number },
  relays: string[] = DEFAULT_RELAYS
): Promise<SignedEvent[]> {
  const results = await Promise.allSettled(
    relays.map((relay) => fetchEventsFromRelay(relay, filter))
  );

  const allEvents: SignedEvent[] = [];
  const seenIds = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
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
