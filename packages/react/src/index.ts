/**
 * @nostr-post/react
 *
 * React hooks and components for Nostr posts
 *
 * This package provides React-friendly wrappers around the universal
 * web components from @nostr-post/web, ensuring consistent styling
 * and behavior across all frameworks.
 */

// Hooks
export {
  useNostrAuth,
  useNostrEvents,
  useNostrPublish,
  type NostrAuthState,
  type UseNostrAuthReturn,
  type UseNostrEventsOptions,
  type UseNostrEventsReturn,
  type UseNostrPublishOptions,
  type UseNostrPublishReturn,
} from './hooks';

// Components (React wrappers around web components)
export {
  NostrPostComposer,
  NostrPostView,
  NostrPostFeed,
  type NostrPostComposerProps,
  type NostrPostViewProps,
  type NostrPostFeedProps,
  type NostrPostFeedRef,
} from './components';

// Re-export web component utilities for convenience
export {
  type SignedEvent,
  type Nip07Provider,
  colors,
  baseStyles,
  STANDARD_KIND1_POST_MANIFEST,
} from '@nostr-post/web';

// Signer utilities (re-exported from @nostr-post/signer)
export {
  signEvent,
  signAndPublish,
  publishToRelay,
  publishToRelays,
  getPublicKey,
  fetchEvents,
  fetchEventsFromRelay,
  hasNostrSigner,
  DEFAULT_RELAYS,
} from './signer';
