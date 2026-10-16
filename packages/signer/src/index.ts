/**
 * @nostr-post/signer - NIP-07 Signing and Relay utilities
 *
 * Shared signing/publishing code for @nostr-post/web and @nostr-post/react
 */

import type { UnsignedNostrEvent } from '@nostr-post/core/types';
import { isDryRun, logDryRunEvent } from './dryRun';
import { DEFAULT_RELAYS } from './fetch';
import { getPublishRelays } from './relays';

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

/** Window event fired when signEvent starts or stops waiting for the signer */
export const SIGNING_EVENT = 'nostr-post:signing';

export interface SigningDetail {
  /** Signatures the signer hasn't returned yet; 0 when it's done */
  pending: number;
  /** Kind of the event that started waiting */
  kind?: number;
}

declare global {
  interface WindowEventMap {
    'nostr-post:signing': CustomEvent<SigningDetail>;
  }
}

let pendingSignatures = 0;

const notifySigning = (kind?: number): void => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(
    new CustomEvent<SigningDetail>(SIGNING_EVENT, { detail: { pending: pendingSignatures, kind } })
  );
};

/**
 * Sign an event using NIP-07 (window.nostr). While the signer works (e.g. waits for
 * the user to approve), `window` gets SIGNING_EVENT, so UIs can say what they wait for.
 */
export async function signEvent(event: UnsignedNostrEvent): Promise<SignedEvent> {
  if (!window.nostr) {
    throw new Error(
      'No Nostr signer available. Please install a browser extension like Alby or use nostr-login.'
    );
  }
  pendingSignatures += 1;
  notifySigning(event.kind);
  try {
    return await window.nostr.signEvent(event);
  } finally {
    pendingSignatures -= 1;
    notifySigning();
  }
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
 * Publish a signed event to a single relay. In dry-run mode it is only logged.
 */
export function publishToRelay(event: SignedEvent, relayUrl: string): Promise<boolean> {
  if (isDryRun()) {
    logDryRunEvent(event, [relayUrl]);
    return Promise.resolve(true);
  }
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
 * Publish a signed event to multiple relays. In dry-run mode it is only logged,
 * and every relay reports success.
 */
export async function publishToRelays(
  event: SignedEvent,
  relays: string[] = DEFAULT_RELAYS
): Promise<PublishResults> {
  if (isDryRun()) {
    logDryRunEvent(event, relays);
    const targets = relays.length > 0 ? relays : ['dry-run'];
    return {
      success: targets.length,
      failed: 0,
      results: targets.map((relay) => ({ relay, ok: true })),
    };
  }
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
 * Sign and publish an event in one step. Without `relays`, publishes to the
 * signer's relays (see getPublishRelays).
 */
export async function signAndPublish(
  event: UnsignedNostrEvent,
  relays?: string[]
): Promise<{
  signedEvent: SignedEvent;
  publishResults: PublishResults;
}> {
  const signedEvent = await signEvent(event);
  const publishResults = await publishToRelays(
    signedEvent,
    relays ?? (await getPublishRelays(signedEvent.pubkey))
  );
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
export { fetchEventsFromRelay, fetchEvents, matchesFilter, DEFAULT_RELAYS } from './fetch';

export {
  type DryRunChangeDetail,
  type DryRunEntry,
  DRY_RUN_CHANGE_EVENT,
  clearDryRunEntries,
  getDryRunEntries,
  isDryRun,
  setDryRun,
} from './dryRun';

export {
  fetchManifestByATag,
  fetchManifestsByATags,
  fetchManifestForEvent,
  type EventManifest,
  type ManifestSource,
  getCachedManifest,
  clearManifestCache,
  _manifestCache,
} from './manifest';
export {
  INDEXER_RELAYS,
  fetchUserRelays,
  getPublishRelays,
  relayListUrls,
  publishRelayListUrls,
  clearRelayListCache,
} from './relays';
export {
  type NostrProfile,
  type ProfileOptions,
  clearProfileCache,
  fetchProfile,
  fetchProfiles,
  getCachedProfile,
} from './profiles';
