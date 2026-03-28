/**
 * @nostr-post/signer - NIP-07 Signing and Relay utilities
 *
 * Shared signing/publishing code for @nostr-post/web and @nostr-post/react
 */

import type { UnsignedNostrEvent } from '@nostr-post/core/types';
import { DEFAULT_RELAYS } from './fetch';

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

/**
 * Sign an event using NIP-07 (window.nostr)
 */
export async function signEvent(event: UnsignedNostrEvent): Promise<SignedEvent> {
  if (!window.nostr) {
    throw new Error(
      'No Nostr signer available. Please install a browser extension like Alby or use nostr-login.'
    );
  }
  return window.nostr.signEvent(event);
}

/**
 * Get the current user's public key
 */
export async function getPublicKey(): Promise<string> {
  if (!window.nostr) {
    throw new Error('No Nostr signer available.');
  }
  return window.nostr.getPublicKey();
}

/**
 * Check if a signer is available
 */
export function hasNostrSigner(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

/**
 * Publish a signed event to a single relay
 */
export function publishToRelay(event: SignedEvent, relayUrl: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Timeout connecting to ${relayUrl}`));
    }, 10000);

    ws.onopen = () => {
      ws.send(JSON.stringify(['EVENT', event]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === 'OK') {
          clearTimeout(timeout);
          ws.close();
          if (data[2] === true) {
            resolve(true);
          } else {
            reject(new Error(data[3] || 'Relay rejected event'));
          }
        }
      } catch {
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

export interface PublishResults {
  success: number;
  failed: number;
  results: Array<{ relay: string; ok: boolean; error?: string }>;
}

/**
 * Publish a signed event to multiple relays
 */
export async function publishToRelays(
  event: SignedEvent,
  relays: string[] = DEFAULT_RELAYS
): Promise<PublishResults> {
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
    r.status === 'fulfilled' ? r.value : { relay: 'unknown', ok: false, error: 'Unknown error' }
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
  publishResults: PublishResults;
}> {
  const signedEvent = await signEvent(event);
  const publishResults = await publishToRelays(signedEvent, relays);
  return { signedEvent, publishResults };
}

export interface FetchFilter {
  ids?: string[];
  kinds?: number[];
  authors?: string[];
  search?: string;
  limit?: number;
  since?: number;
  until?: number;
  '#e'?: string[];
  '#p'?: string[];
  '#d'?: string[];
  '#t'?: string[];
  [tagFilter: `#${string}`]: string[] | number[] | undefined;
}

/**
 * Fetch events from a single relay
 */
export { fetchEventsFromRelay, fetchEvents, DEFAULT_RELAYS } from './fetch';

export * from './manifest';
