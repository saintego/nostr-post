/**
 * @nostr-post/web - Web Components entry point
 *
 * Universal, framework-independent UI for nostr-post
 */

// Components
export { NostrPostComposer } from './composer';
export { NostrPostView } from './view';
export { NostrPostFeed } from './feed';
export { NostrPostElement } from './base-component';

// Theme (single source of truth for colors and styles)
export { colors, baseStyles } from './theme';

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
} from './signer';
