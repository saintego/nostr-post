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
  fetchUserRelays,
  getPublishRelays,
  // Manifest helpers
  fetchManifestByATag,
  fetchManifestsByATags,
  getCachedManifest,
  clearManifestCache,
  _manifestCache,
} from '@nostr-post/signer';

/**
 * Relays to publish the signed-in user's events to: the signer's write relays,
 * the user's NIP-65 relay list and defaults (see getPublishRelays).
 */
export async function getUserRelays(): Promise<string[]> {
  const { DEFAULT_RELAYS, getPublicKey, getPublishRelays } = await import('@nostr-post/signer');
  try {
    return await getPublishRelays(await getPublicKey());
  } catch {
    return DEFAULT_RELAYS;
  }
}

/**
 * Get default relays
 */
export function getDefaultRelays(): string[] {
  return ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'];
}
