/**
 * @nostr-post/web - Web Components entry point
 *
 * Universal, framework-independent UI for nostr-post.
 */

// Components
export { NostrPostComposer } from './composer';
export { NpActivity } from './activityPanel';
export {
  type ActivityMessages,
  DEFAULT_ACTIVITY_MESSAGES,
  setActivityMessages,
} from './activityMessages';
export { type ComposerMessages, DEFAULT_COMPOSER_MESSAGES } from './composerMessages';
export { NostrPostView } from './view';
export { DEFAULT_EDIT_MESSAGES, type EditMessages } from './viewEdit';
export { DEFAULT_SUGGESTION_MESSAGES, type SuggestionMessages } from './viewSuggestions';
// The composer's outbox in the browser (drafts, queued posts); the logic is @nostr-post/posts'
export {
  type ComposerOutboxDefaults,
  composerDefaults,
  setComposerDefaults,
} from './composerDefaults';
export { openDraft, publishOrQueue, removeDraft, saveDraft } from './composerOutbox';
export { NostrDryRunPublish } from './dryRunPublish';
export {
  DEFAULT_DRY_RUN_PUBLISH_MESSAGES,
  type DryRunPublishMessages,
} from './dryRunPublishMessages';
export { NostrPostMenu, renderPostMenu } from './postMenu';
export { DEFAULT_POST_MENU_MESSAGES, type PostMenuMessages } from './postMenuMessages';
export { NostrPostFeed } from './feed';
export { NostrPostSections } from './sections';
export { NostrPostAddress } from './addressView';
export { DEFAULT_SECTIONS_MESSAGES, type SectionsMessages } from './sectionsMessages';
export { DEFAULT_FEED_MESSAGES, type FeedMessages } from './feedMessages';
// For feed layouts (`<nostr-post-feed .layout>`, e.g. @nostr-post/calendar's agenda)
export type { FeedThread } from '@nostr-post/posts';
export { feedStyle } from './feedStyle';
export { type FeedLayout, type FeedThreadContext, renderFeedThread } from './feedThread';
export { NostrPostElement } from './baseComponent';

// Theme (single source of truth for colors and styles)
export { baseStyles } from './theme';

// Publishing a submitted post yourself: run plugin hooks, add their tags
export { runAfterPublish, runBeforePublish, runPublishHooks } from '@nostr-post/plugins/publish';
export { type NostrPostSubmitDetail, withTags } from '@nostr-post/posts';

// An event's values as form data, e.g. to edit it in your own composer
export { extractPrefillFromEvent } from '@nostr-post/posts';
export { ensurePluginsForManifest } from './pluginAutoLoad';

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
  dryRunBundle,
  dryRunEvents,
  newerOnRelays,
  publishDryRunEntries,
  removeDryRunEntries,
  type DryRunPublishResult,
  DRY_RUN_CHANGE_EVENT,
  type DryRunEntry,
  type DryRunChangeDetail,
  type SignedEvent,
  type Nip07Provider,
} from './signer';
