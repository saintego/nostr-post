/**
 * @nostr-post/web - Web Components entry point
 *
 * Universal, framework-independent UI for nostr-post.
 */

// Components
export { NostrPostComposer } from './composer';
export { type ComposerMessages, DEFAULT_COMPOSER_MESSAGES } from './composerMessages';
export { NostrPostView } from './view';
export { NostrPostFeed } from './feed';
export { NostrPostElement } from './baseComponent';

// Theme (single source of truth for colors and styles)
export { colors, baseStyles } from './theme';

// Publishing a submitted post yourself: run plugin hooks, add their tags
export { runBeforePublish, runPublishHooks } from '@nostr-post/plugins/publish';
export { type NostrPostSubmitDetail, withTags } from './composerSubmit';

// Standard manifests
export { STANDARD_KIND1_POST_MANIFEST } from '@nostr-post/core/types';

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
  fetchUserRelays,
  getPublishRelays,
  setDryRun,
  isDryRun,
  getDryRunEntries,
  clearDryRunEntries,
  DRY_RUN_CHANGE_EVENT,
  type DryRunEntry,
  type DryRunChangeDetail,
  type SignedEvent,
  type Nip07Provider,
} from './signer';
