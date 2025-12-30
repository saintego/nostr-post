/**
 * @nostr-post/web - Signer re-exports
 *
 * Re-exports from @nostr-post/signer plus web-specific utilities
 */

// Re-export everything from shared signer
export {
  type SignedEvent,
  type Nip07Provider,
  type PublishResults,
  type FetchFilter,
  DEFAULT_RELAYS,
  signEvent,
  getPublicKey,
  hasNostrSigner,
  publishToRelay,
  publishToRelays,
  signAndPublish,
  fetchEventsFromRelay,
  fetchEvents,
} from "@nostr-post/signer";

/**
 * Get user's preferred relays from NIP-07 provider
 */
export async function getUserRelays(): Promise<string[]> {
  const { DEFAULT_RELAYS } = await import("@nostr-post/signer");

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
  return ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"];
}
