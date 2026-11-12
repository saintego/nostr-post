/**
 * @nostr-post/signer - NIP-07 Signing and Relay utilities
 *
 * Shared signing/publishing code for @nostr-post/web and @nostr-post/react
 */

import type { UnsignedNostrEvent } from '@nostr-post/core/types';
import { isDryRun, logDryRunEvent } from './dryRun';
import { publishCapture } from './publishSigned';
import { DEFAULT_RELAYS } from './fetch';
import { setKnownPublicKey } from './knownPubkey';
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

/** The signer's answer to getPublicKey, asked once per signer */
let pubkeyRequest: { provider: Nip07Provider; promise: Promise<string> } | undefined;

const NO_PUBKEY = 'The signer gave no public key. Sign in, then try again.';
const NO_ANSWER =
  "Your signer didn't answer. Open it (e.g. Amber) or sign in again, then try again.";

/**
 * How long getPublicKey waits for the signer (ms). A remote signer whose connection dropped
 * (e.g. Amber after the phone slept) never answers: the request is then forgotten, so the next
 * one asks again instead of waiting for it forever.
 */
export const PUBKEY_TIMEOUT_MS = 30_000;

/** The `code` of getPublicKey's error when the signer didn't answer in time */
export const SIGNER_TIMEOUT = 'signer-timeout';

/** Whether an error is the signer not answering in time (not: no one signed in) */
export const isSignerTimeout = (error: unknown): boolean =>
  (error as { code?: unknown } | null)?.code === SIGNER_TIMEOUT;

// nostr-login keeps one window.nostr across sign-ins: forget the pubkey when the user changes
if (typeof document !== 'undefined') {
  document.addEventListener('nlAuth', (e) => {
    clearPublicKeyCache();
    const detail = (e as CustomEvent<{ type?: string; pubkey?: unknown } | undefined>).detail;
    if (detail?.type === 'logout') setKnownPublicKey(undefined);
    else if (typeof detail?.pubkey === 'string') setKnownPublicKey(detail.pubkey);
  });
}

/**
 * Get the current user's public key. The signer is asked once (also when several
 * components ask at the same time): signers that handle one request at a time, or ask
 * the user, would otherwise queue every caller. A failed request, or one not answered within
 * PUBKEY_TIMEOUT_MS, is asked again next time; call clearPublicKeyCache when the user signs in
 * or out.
 */
export async function getPublicKey(): Promise<string> {
  const provider = window.nostr;
  if (!provider) {
    throw new Error('No Nostr signer available.');
  }
  if (pubkeyRequest?.provider !== provider) {
    // Some signers answer nothing while no one is signed in (e.g. nostr-login): not a pubkey to keep
    let timer: ReturnType<typeof setTimeout> | undefined;
    const noAnswer = new Promise<never>((_, reject) => {
      const error = Object.assign(new Error(NO_ANSWER), { code: SIGNER_TIMEOUT });
      timer = setTimeout(() => reject(error), PUBKEY_TIMEOUT_MS);
    });
    const answer = provider.getPublicKey().then((pubkey) => {
      if (typeof pubkey !== 'string' || !pubkey) throw new Error(NO_PUBKEY);
      setKnownPublicKey(pubkey);
      return pubkey;
    });
    const promise = Promise.race([answer, noAnswer]).finally(() => clearTimeout(timer));
    pubkeyRequest = { provider, promise };
    promise.catch(() => {
      if (pubkeyRequest?.promise === promise) pubkeyRequest = undefined;
    });
  }
  return pubkeyRequest.promise;
}

/** Forget the signer's pubkey (after signing in or out, or a request that never answered) */
export function clearPublicKeyCache(): void {
  pubkeyRequest = undefined;
}

/**
 * Check if a signer is available
 */
export function hasNostrSigner(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

/** Options of publishing */
export interface PublishOptions {
  /** Send to the relays also in dry-run mode (publishing logged events for real) */
  ignoreDryRun?: boolean;
  /** Send to the relays also while a capture is on (`setPublishCapture`) */
  ignoreCapture?: boolean;
}

/** Hands the event to the capture, if one is on: true when it took it */
const captured = (event: SignedEvent, relays: string[], options: PublishOptions): boolean => {
  const handler = options.ignoreCapture ? undefined : publishCapture();
  handler?.(event, relays);
  return !!handler;
};

/**
 * Publish a signed event to a single relay. In dry-run mode it is only logged.
 */
export function publishToRelay(
  event: SignedEvent,
  relayUrl: string,
  options: PublishOptions = {}
): Promise<boolean> {
  if (captured(event, [relayUrl], options)) return Promise.resolve(true);
  if (isDryRun() && !options.ignoreDryRun) {
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
  /**
   * Every relay's results, once all answered. publishToRelays returns when the first relay
   * accepted the event; the others keep going (see RELAYS_PENDING_EVENT).
   */
  all?: Promise<PublishResults>;
}

/** Window event fired while events are being sent to relays, and when the last send ends */
export const RELAYS_PENDING_EVENT = 'nostr-post:relays-pending';

export interface RelaysPendingDetail {
  /** Relay sends still running, of all events; 0 when every relay answered */
  pending: number;
  /** Sends that ended since `pending` was last 0: accepted ones */
  sent: number;
  /** …and ones that failed (rejected, unreachable, timed out) */
  failed: number;
}

declare global {
  interface WindowEventMap {
    'nostr-post:relays-pending': CustomEvent<RelaysPendingDetail>;
  }
}

let relaySends: RelaysPendingDetail = { pending: 0, sent: 0, failed: 0 };

const notifyRelays = (next: RelaysPendingDetail): void => {
  relaySends = next;
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(
    new CustomEvent<RelaysPendingDetail>(RELAYS_PENDING_EVENT, { detail: relaySends })
  );
};

/** Relay sends now running, and how the ones since the last idle moment ended */
export function getRelaysPending(): RelaysPendingDetail {
  return relaySends;
}

/**
 * Publish a signed event to multiple relays. Resolves as soon as one relay accepted it
 * (or all failed), with the answers so far; `all` resolves with every relay's answer.
 * Meanwhile `window` gets RELAYS_PENDING_EVENT, so UIs can show the sends still running.
 * In dry-run mode the event is only logged, and every relay reports success.
 */
export async function publishToRelays(
  event: SignedEvent,
  relays: string[] = DEFAULT_RELAYS,
  options: PublishOptions = {}
): Promise<PublishResults> {
  const capturing = captured(event, relays, options);
  if (capturing || (isDryRun() && !options.ignoreDryRun)) {
    if (!capturing) logDryRunEvent(event, relays);
    const targets = relays.length > 0 ? relays : ['dry-run'];
    const results = {
      success: targets.length,
      failed: 0,
      results: targets.map((relay) => ({ relay, ok: true })),
    };
    return { ...results, all: Promise.resolve(results) };
  }
  const answered: PublishResults['results'] = [];
  const summary = (): PublishResults => ({
    success: answered.filter((r) => r.ok).length,
    failed: answered.filter((r) => !r.ok).length,
    results: [...answered],
  });
  if (relays.length > 0) {
    const reset = relaySends.pending === 0;
    notifyRelays({
      pending: relaySends.pending + relays.length,
      sent: reset ? 0 : relaySends.sent,
      failed: reset ? 0 : relaySends.failed,
    });
  }
  let accepted: () => void = () => {};
  const firstAccepted = new Promise<void>((resolve) => {
    accepted = resolve;
  });
  const sends = relays.map(async (relay) => {
    let result: PublishResults['results'][number];
    try {
      await publishToRelay(event, relay, options);
      result = { relay, ok: true };
    } catch (error) {
      result = { relay, ok: false, error: (error as Error).message };
    }
    answered.push(result);
    notifyRelays({
      pending: relaySends.pending - 1,
      sent: relaySends.sent + (result.ok ? 1 : 0),
      failed: relaySends.failed + (result.ok ? 0 : 1),
    });
    if (result.ok) accepted();
  });
  const all = Promise.all(sends).then(summary);
  await Promise.race([firstAccepted, all]);
  return { ...summary(), all };
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
export { fetchBlossomServers, newestBlossomServers } from './blossomServers';
export {
  KNOWN_PUBKEY_EVENT,
  knownPublicKey,
  onKnownPublicKeyChange,
  setKnownPublicKey,
} from './knownPubkey';
export {
  DEFAULT_RELAYS,
  fetchEvents,
  fetchEventsFromRelay,
  matchesFilter,
  relaysSeenOn,
} from './fetch';

export {
  type DryRunChangeDetail,
  type DryRunEntry,
  DRY_RUN_CHANGE_EVENT,
  clearDryRunEntries,
  getDryRunEntries,
  isDryRun,
  removeDryRunEntries,
  setDryRun,
} from './dryRun';
export {
  addressOf,
  type DryRunPublishResult,
  dryRunBundle,
  dryRunEvents,
  newerOnRelays,
  publishDryRunEntries,
} from './dryRunPublish';
export {
  type PublishCapture,
  type PublishSignedOptions,
  publishCapture,
  publishSignedEvents,
  type SignedEntry,
  type SignedPublishResult,
  setPublishCapture,
} from './publishSigned';

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
  newestProfiles,
} from './profiles';
