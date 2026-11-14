/**
 * @nostr-post/cdn - base: the components and logic every page needs
 *
 * <nostr-post-composer>, <nostr-post-view>, <nostr-post-feed>, <nostr-post-sections>, the outbox
 * and the design system, for kind-1 notes and NIP-78 manifest posts. Field plugins load when a
 * manifest uses one (their own files in the split build). Re-exports core, signer, posts, web,
 * ui and outbox for programmatic use.
 */

import '@nostr-post/web';
import '@nostr-post/outbox/web';

export { coordinateEvents, validateFormData } from '@nostr-post/core/coordinator';
export {
  fieldOptionLabel,
  groupFieldOptions,
  matchFieldOption,
} from '@nostr-post/core/enumOptions';
export { findJsonObject, PUBLISH_FORMAT_KEY } from '@nostr-post/core/formJson';
// Core manifest & coordination
export {
  fieldDescription,
  fieldLabel,
  findFieldById,
  getFieldsByKind,
  getRequiredFields,
  getUsedKinds,
  validateManifest,
} from '@nostr-post/core/manifest';
// NIP-19 addresses (`kind:pubkey:d-tag` ↔ `naddr1…`), e.g. for links to an event
export { decodeNaddr, encodeNaddr, encodeNevent } from '@nostr-post/core/nip19';
// Where an event comes from (NIP-48 proxy tags): imported and bridged events
export {
  PROXY_PROTOCOLS,
  type ProxyProtocol,
  type ProxySource,
  proxyOf,
  proxyTag,
  siteOf,
  sourceUrl,
} from '@nostr-post/core/proxy';
export type { PostSection } from '@nostr-post/core/types';
// Posts published later: drafts, timed posts, upload later (@nostr-post/outbox)
export {
  CANCELLED,
  captureEvents,
  combineStorage,
  createOutbox,
  draftItem,
  INTERRUPTED_AFTER_SECONDS,
  isInterrupted,
  isLate,
  itemActions,
  memoryStorage,
  nextStep,
  type Outbox,
  type OutboxAction,
  type OutboxChange,
  type OutboxDraft,
  type OutboxFileStore,
  type OutboxItem,
  type OutboxItemStore,
  type OutboxJobs,
  type OutboxState,
  type OutboxStorage,
  type OutboxUpload,
  pendingBytes,
  type RunConditions,
  signedItem,
  waitingFor,
  withState,
} from '@nostr-post/outbox';
export {
  browserOutbox,
  connectionConditions,
  DEFAULT_OUTBOX_MESSAGES,
  ensureOutboxRunner,
  indexedDbStorage,
  type OutboxMessages,
  registerOutboxJobs,
  requestPersistentStorage,
  setBrowserOutboxItems,
  startOutboxRunner,
} from '@nostr-post/outbox/web';
// Background work (uploads, relay sends) shown by <np-activity> in a corner of the page
export {
  type Activity,
  type ActivityHandle,
  type ActivityOptions,
  dismissActivity,
  getActivities,
  publishBlockers,
  startActivity,
  subscribeActivities,
  waitForPublishBlockers,
} from '@nostr-post/plugins/activity';
// How a page section shows (`view`): register your own element under a name
export {
  registerSectionView,
  type SectionView,
  sectionViewFor,
} from '@nostr-post/plugins/entities';
// A manifest's form data as JSON (e.g. an AI's structured output); the plugins' versions
export { formJsonSchema, parseFormJson } from '@nostr-post/plugins/formJson';
// Plugin registry
export { pluginRegistry } from '@nostr-post/plugins/registry';
// Asking the app to sign the user in (uploads, publishing)
export { onSignInNeeded, requestSignIn, type SignInReason } from '@nostr-post/plugins/signIn';
// Publishing and reading posts without the components (@nostr-post/posts)
export {
  // "Add" linking the pages the page or event links (`add.also`)
  alsoLinkOptions,
  alsoLinkTags,
  appliedUpdates,
  buildFeedFilters,
  buildReactionEvent,
  buildReply,
  buildReplyTarget,
  buildThreads,
  DEFAULT_PUBLISH_MESSAGES,
  draftForComposer,
  draftTitle,
  eventTitle,
  extractPrefillFromEvent,
  type FeedThread,
  fetchFeedEvents,
  fetchReferences,
  // A page's sections (`sections` of a manifest): which posts, matched and counted
  fetchSection,
  formatPrefillAsUpdateComment,
  getDefaultRelays,
  getUserRelays,
  interactionFilters,
  loadAlsoLinks,
  matchesSection,
  type NostrPostSubmitDetail,
  type PublishMessages,
  postSnippet,
  publishReaction,
  publishWithHooks,
  queuePost,
  type RawEventData,
  type ReplyTarget,
  rawEventData,
  referenceFilters,
  type SectionTarget,
  saveDraftItem,
  sectionFilters,
  sectionStats,
  sectionTarget,
  // The publish format chosen by the files picked (a format's `select`)
  selectedFormatFor,
  signAndPublishBundle,
  signQueuedPost,
  validateAndCoordinate,
  withTags,
} from '@nostr-post/posts';
// Signing & relay utilities
export {
  cachedEvents,
  clearDryRunEntries,
  clearEventCache,
  clearManifestCache,
  DRY_RUN_CHANGE_EVENT,
  type DryRunChangeDetail,
  type DryRunEntry,
  type DryRunPublishResult,
  dryRunBundle,
  dryRunEvents,
  type EventManifest,
  fetchBlossomServers,
  fetchEvents,
  fetchEventsFromRelay,
  fetchManifestByATag,
  fetchManifestForEvent,
  fetchManifestsByATags,
  fetchProfile,
  fetchProfiles,
  fetchUserRelays,
  getCachedManifest,
  getCachedProfile,
  getDryRunEntries,
  getPublicKey,
  getPublishRelays,
  getRelaysPending,
  hasNostrSigner,
  INDEXER_RELAYS,
  isDryRun,
  isSignerTimeout,
  KNOWN_PUBKEY_EVENT,
  knownPublicKey,
  type ManifestSource,
  type NostrProfile,
  newerOnRelays,
  onKnownPublicKeyChange,
  type ProfileOptions,
  PUBKEY_TIMEOUT_MS,
  publishDryRunEntries,
  publishSignedEvents,
  publishToRelay,
  publishToRelays,
  RELAYS_PENDING_EVENT,
  type RelaysPendingDetail,
  relaysSeenOn,
  removeDryRunEntries,
  SIGNING_EVENT,
  type SignedEntry,
  type SignedPublishResult,
  type SigningDetail,
  setDryRun,
  setKnownPublicKey,
  setPublishCapture,
  signAndPublish,
  signEvent,
} from '@nostr-post/signer';
// Design system (@nostr-post/ui): tokens, primitives and style overrides
export {
  clearStyles,
  npClass,
  npPart,
  primitivesCss,
  registerStyles,
  resolveTokens,
  tokensCss,
  uiCss,
  unstyled,
} from '@nostr-post/ui';
export { installTokens } from '@nostr-post/ui/web';
// Publishing a submitted post yourself (composer without auto-publish): plugin hooks
// Composer text (submit button, steps, errors) for overriding via its `messages` property
// Drafts and queued posts in the browser outbox (the composer's `drafts`, `schedule`,
// `upload-later`)
// Publishing a test-mode post for real (<nostr-dry-run-publish>, the "⋯" menu's item)
export {
  type ActivityMessages,
  type ComposerMessages,
  type ComposerOutboxDefaults,
  composerDefaults,
  DEFAULT_ACTIVITY_MESSAGES,
  DEFAULT_COMPOSER_MESSAGES,
  DEFAULT_DRY_RUN_PUBLISH_MESSAGES,
  DEFAULT_EDIT_MESSAGES,
  DEFAULT_FEED_MESSAGES,
  DEFAULT_SUGGESTION_MESSAGES,
  type DryRunPublishMessages,
  type EditMessages,
  type FeedMessages,
  openDraft,
  publishOrQueue,
  removeDraft,
  runAfterPublish,
  runBeforePublish,
  runPublishHooks,
  type SuggestionMessages,
  saveDraft,
  setActivityMessages,
  setComposerDefaults,
} from '@nostr-post/web';
