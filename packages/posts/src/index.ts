/**
 * @nostr-post/posts - Publishing and reading posts without a UI
 *
 * What any UI (the web components in @nostr-post/web, React, an app's own) needs to publish
 * posts made with manifests and to read them with their comments, reactions and updates.
 * No Lit, no React, no DOM.
 */

// Threads: comments and reactions under their post (NIP-10, NIP-22, NIP-25)
export {
  addressOf,
  buildReactionEvent,
  buildReplyTarget,
  buildThreads,
  DEFAULT_COMMENT_MANIFEST,
  DEFAULT_REACTION_OPTIONS,
  type FeedThread,
  mergeUniqueEvents,
  summarizeReactions,
} from './threads';

// Replies: their kind and tags
export {
  applyReplyTargetToBundle,
  buildReply,
  buildReplyTags,
  hasReplyTarget,
  type ReplyTarget,
  updateReplyTargetValue,
} from './replies';

// Reactions: publishing one, counts with their authors
export {
  publishReaction,
  type ReactionSummaryWithAuthors,
  summarizeReactionsWithAuthors,
} from './reactions';

// Feeds: relay filters for posts and their interactions
export {
  buildFeedFilters,
  buildFetchFilter,
  buildFetchFilters,
  buildInteractionLoadKey,
  type FeedQuery,
  interactionFilters,
  mergeUniqueEventsById,
  parseFilterTags,
} from './feedFilters';

// Feeds: loading events from the right relays
export {
  type FeedFetchOptions,
  fetchFeedEvents,
  MAX_AUTHOR_RELAY_LOOKUPS,
} from './feedFetch';

// Author names
export {
  authorDisplayName,
  displayNameForPubkey,
  loadProfilesForEvents,
  truncatePubkey,
} from './profiles';

// The signed-in user's relays
export {
  getDefaultRelays,
  getUserRelays,
} from './relays';

// A composer's form data
export {
  buildInitialFormData,
  hiddenFieldErrorEntries,
  isExcludedButPrefilled,
  isFieldExcluded,
  isFieldReadonly,
  parseExtraTags,
} from './formData';

// Publishing a post made with a manifest
export {
  buildGeneratedDTag,
  bundleSigningOrder,
  type FieldValidationErrors,
  invalidFieldLabels,
  isAddressableKind,
  linkToPrimary,
  type ManifestValidationError,
  type NostrPostSubmitDetail,
  PUBLISH_HOOKS_TIMEOUT_MS,
  publishWithHooks,
  type PublishWithHooksInput,
  type PublishWithHooksResult,
  resolveAddressableDTag,
  signAndPublishBundle,
  signedInPubkey,
  validateAndCoordinate,
  validateWithPlugins,
  type ValidationResult,
  waitForUploads,
  withTags,
  withTimeout,
} from './publish';

// What publishing says
export {
  DEFAULT_PUBLISH_MESSAGES,
  type PublishMessages,
} from './publishMessages';

// Linking a post to the pages a page or event links (a section's `add.also`)
export {
  type AlsoLink,
  type AlsoLinkOption,
  alsoLinkOptions,
  alsoLinkTags,
  loadAlsoLinks,
} from './alsoLinks';

// Editing a post with update comments
export {
  appliedUpdates,
  extractPrefillFromEvent,
  formatPrefillAsUpdateComment,
} from './updates';
export { eventTitle, type RawEventData, rawEventData } from './rawEvent';
export {
  fetchReferences,
  isAddress,
  REFERENCES_LIMIT,
  referenceFilters,
  targetFilters,
} from './references';
export {
  fetchSection,
  matchesSection,
  newestItems,
  postSnippet,
  SECTION_READ_LIMIT,
  type SectionTarget,
  sectionFilters,
  sectionReadLimit,
  sectionStats,
  sectionTarget,
} from './sections';

// Posts that wait in an outbox (@nostr-post/outbox): queued, signed later, drafts
export {
  type CoordinateOptions,
  type QueuePostResult,
  queuePost,
  type SignLaterContext,
  type SignQueuedPostOptions,
  signQueuedPost,
} from './queue';
export {
  draftForComposer,
  draftTitle,
  type OpenedDraft,
  type SaveDraftOptions,
  saveDraftItem,
} from './drafts';
