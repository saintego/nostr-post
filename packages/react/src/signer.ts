/**
 * @nostr-post/react - Signer re-exports
 *
 * Re-exports from @nostr-post/signer for React components
 */

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
} from '@nostr-post/signer';
