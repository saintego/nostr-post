/**
 * @nostr-post/web - Web Components entry point
 *
 * Universal, framework-independent UI for nostr-post
 */

// Components
export { NostrPostComposer } from "./composer";
export { NostrPostView } from "./view";
export { NostrPostElement } from "./base-component";

// Signer and relay utilities
export {
  signEvent,
  signAndPublish,
  publishToRelay,
  publishToRelays,
  getPublicKey,
  getUserRelays,
  getDefaultRelays,
  hasNostrSigner,
  fetchEvents,
  fetchEventsFromRelay,
  type SignedEvent,
  type Nip07Provider,
} from "./signer";

