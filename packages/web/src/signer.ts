/**
 * @nostr-post/web - Signer re-exports
 *
 * Re-exports from @nostr-post/signer plus web-specific utilities
 */

// Re-export everything from shared signer
export {
  _manifestCache,
  clearDryRunEntries,
  clearManifestCache,
  DEFAULT_RELAYS,
  DRY_RUN_CHANGE_EVENT,
  type DryRunChangeDetail,
  type DryRunEntry,
  type FetchFilter,
  fetchEvents,
  fetchEventsFromRelay,
  // Manifest helpers
  fetchManifestByATag,
  fetchManifestsByATags,
  fetchUserRelays,
  getCachedManifest,
  getDryRunEntries,
  getPublicKey,
  getPublishRelays,
  hasNostrSigner,
  isDryRun,
  type Nip07Provider,
  type PublishResults,
  publishToRelay,
  publishToRelays,
  type SignedEvent,
  setDryRun,
  signAndPublish,
  signEvent,
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
  return ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
}
