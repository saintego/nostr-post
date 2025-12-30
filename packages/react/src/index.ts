/**
 * @nostr-post/react
 *
 * React hooks and components for Nostr posts
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
} from "./hooks";

// Components
export {
  NostrPostComposer,
  NostrPostView,
  NostrPostFeed,
  type NostrPostComposerProps,
  type NostrPostViewProps,
  type NostrPostFeedProps,
} from "./components";

// Theme and styling utilities
export {
  colors,
  getColors,
  isDarkMode,
  containerStyles,
  inputStyles,
  buttonStyles,
  secondaryButtonStyles,
  errorStyles,
  successStyles,
  labelStyles,
  type ColorScheme,
} from "./theme";

// Signer utilities
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
  type SignedEvent,
  type Nip07Provider,
} from "./signer";
