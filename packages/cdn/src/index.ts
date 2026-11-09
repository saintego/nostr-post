/**
 * @nostr-post/cdn — Single-file CDN bundle
 *
 * Importing this file:
 *   1. Registers every nostr-post web component (<nostr-post-composer>, <nostr-post-view>, <nostr-post-feed>)
 *   2. Registers every plugin's custom elements and adds them to the PluginRegistry
 *   3. Re-exports core utilities for programmatic use
 *
 * Usage (like nostr-login — no npm, no bundler):
 *   <script type="module" src="https://saintego.github.io/nostr-post/nostr-post.js"></script>
 *   <nostr-post-composer auto-publish></nostr-post-composer>
 */

// ── Core web components (side-effect: defines custom elements) ──────────────
import '@nostr-post/web';

// ── All plugins (side-effect: defines custom elements + registers plugins) ──
import '@nostr-post/plugin-stars/web';
import '@nostr-post/plugin-geo/web';
import '@nostr-post/plugin-date/web';
import '@nostr-post/calendar/web';
import '@nostr-post/plugin-profile/web';
import '@nostr-post/plugin-embed/web';
import '@nostr-post/plugin-venue/web';
import '@nostr-post/plugin-media/web';
import '@nostr-post/plugin-reference/web';
import '@nostr-post/plugin-markdown/web';
import '@nostr-post/plugin-hashtag/web';
import '@nostr-post/list/web';
import '@nostr-post/wiki/web';
import '@nostr-post/plugin-wiki-entity/web';
import '@nostr-post/outbox/web';

// ── Re-exports for programmatic / advanced usage ────────────────────────────

// Core manifest & coordination
export {
  validateManifest,
  getFieldsByKind,
  getUsedKinds,
  findFieldById,
  getRequiredFields,
  fieldLabel,
  fieldDescription,
} from '@nostr-post/core/manifest';
export {
  fieldOptionLabel,
  groupFieldOptions,
  matchFieldOption,
} from '@nostr-post/core/enumOptions';
export { coordinateEvents, validateFormData } from '@nostr-post/core/coordinator';

// NIP-19 addresses (`kind:pubkey:d-tag` ↔ `naddr1…`), e.g. for links to an event
export { encodeNaddr, decodeNaddr, encodeNevent } from '@nostr-post/core/nip19';

// Plugin registry
export { pluginRegistry } from '@nostr-post/plugins/registry';
// A manifest's form data as JSON (e.g. an AI's structured output); the plugins' versions
export { formJsonSchema, parseFormJson } from '@nostr-post/plugins/formJson';
export { findJsonObject, PUBLISH_FORMAT_KEY } from '@nostr-post/core/formJson';

// Geo helpers
export {
  geoPlugin,
  encodeGeohash,
  decodeGeohash,
  type GeoPluginConfig,
  type GeoCoordinates,
} from '@nostr-post/plugin-geo';

// People fields: `p` tags with roles, profile search (NIP-50)
export {
  profilePlugin,
  personFromText,
  mentionsIn,
  peopleFromTags,
  personTag,
  searchProfiles,
  profileName,
  DEFAULT_SEARCH_RELAYS,
  type Person,
  type FoundProfile,
} from '@nostr-post/plugin-profile';

// Players for links (YouTube, Spotify, SoundCloud, Vimeo, Bandcamp)
export {
  checkLink,
  checkSuggestedLinks,
  type Embed,
  embedFor,
  embedPlugin,
  isCheckableLink,
  keepKnownLinks,
  type LinkCheck,
  linkFromEmbedCode,
  linkProvider,
  linksInText,
  namesMatch,
  profileLink,
  profileUrls,
} from '@nostr-post/plugin-embed';

// Date field (NIP-52 date tags)
export {
  datePlugin,
  formatDateValue,
  dateValueFromTags,
  dayNumbers,
  ALL_DAY_EVENT_KIND,
  TIMED_EVENT_KIND,
  type DateValue,
} from '@nostr-post/plugin-date';

// Calendars (NIP-52): <nostr-calendar-agenda>, RSVP, calendars, duplicates, iCalendar
export {
  CALENDAR_EVENT_MANIFEST,
  agendaFilters,
  agendaFilter,
  groupEventsByDay,
  eventTiming,
  eventDates,
  eventTimeZone,
  windowDates,
  shiftWindow,
  type AgendaWindow,
  fetchRsvps,
  fetchRsvpsBy,
  publishRsvp,
  summarizeRsvps,
  rsvpsByFilter,
  answersByAddress,
  rsvpEvent,
  type RsvpStatus,
  fetchCalendarItems,
  calendarEventFilters,
  fetchEventsAsIcs,
  fetchIcsRefs,
  similarEvents,
  titleSimilarity,
  monthWindow,
  monthGrid,
  shiftMonth,
  formatMonth,
  agendaWindowFor,
  agendaSummary,
  agendaText,
} from '@nostr-post/calendar';
export { agendaImage, drawAgendaImage } from '@nostr-post/calendar/web';
export { eventsToIcs, icsToDrafts, icsDTag, type IcsDraft } from '@nostr-post/calendar/ics';

// Signing & relay utilities
export {
  signEvent,
  signAndPublish,
  publishToRelay,
  publishToRelays,
  getPublicKey,
  isSignerTimeout,
  PUBKEY_TIMEOUT_MS,
  hasNostrSigner,
  fetchEvents,
  fetchEventsFromRelay,
  fetchBlossomServers,
  relaysSeenOn,
  fetchProfile,
  fetchProfiles,
  fetchUserRelays,
  getCachedProfile,
  INDEXER_RELAYS,
  getPublishRelays,
  fetchManifestByATag,
  fetchManifestsByATags,
  fetchManifestForEvent,
  type EventManifest,
  type ManifestSource,
  getCachedManifest,
  clearManifestCache,
  setDryRun,
  SIGNING_EVENT,
  type SigningDetail,
  RELAYS_PENDING_EVENT,
  type RelaysPendingDetail,
  getRelaysPending,
  isDryRun,
  getDryRunEntries,
  clearDryRunEntries,
  dryRunBundle,
  dryRunEvents,
  newerOnRelays,
  publishDryRunEntries,
  publishSignedEvents,
  setPublishCapture,
  type SignedEntry,
  type SignedPublishResult,
  removeDryRunEntries,
  type DryRunPublishResult,
  DRY_RUN_CHANGE_EVENT,
  type DryRunEntry,
  type NostrProfile,
  type ProfileOptions,
  type DryRunChangeDetail,
} from '@nostr-post/signer';

// Publishing and reading posts without the components (@nostr-post/posts)
export {
  getUserRelays,
  getDefaultRelays,
  validateAndCoordinate,
  publishWithHooks,
  signAndPublishBundle,
  withTags,
  rawEventData,
  eventTitle,
  queuePost,
  signQueuedPost,
  saveDraftItem,
  draftForComposer,
  draftTitle,
  type RawEventData,
  type NostrPostSubmitDetail,
  DEFAULT_PUBLISH_MESSAGES,
  type PublishMessages,
  buildReply,
  type ReplyTarget,
  buildReplyTarget,
  buildThreads,
  type FeedThread,
  buildReactionEvent,
  publishReaction,
  buildFeedFilters,
  interactionFilters,
  fetchFeedEvents,
  extractPrefillFromEvent,
  formatPrefillAsUpdateComment,
  appliedUpdates,
} from '@nostr-post/posts';

// Publishing a submitted post yourself (composer without auto-publish): plugin hooks
export { runAfterPublish, runBeforePublish, runPublishHooks } from '@nostr-post/web';

// Composer text (submit button, steps, errors) for overriding via its `messages` property
export { type ComposerMessages, DEFAULT_COMPOSER_MESSAGES } from '@nostr-post/web';
export { DEFAULT_EDIT_MESSAGES, type EditMessages } from '@nostr-post/web';
export { DEFAULT_SUGGESTION_MESSAGES, type SuggestionMessages } from '@nostr-post/web';
export { DEFAULT_FEED_MESSAGES, type FeedMessages } from '@nostr-post/web';
// Drafts and queued posts in the browser outbox (the composer's `drafts`, `schedule`,
// `upload-later`)
export {
  openDraft,
  removeDraft,
  saveDraft,
  publishOrQueue,
  setComposerDefaults,
  composerDefaults,
  type ComposerOutboxDefaults,
} from '@nostr-post/web';
// Publishing a test-mode post for real (<nostr-dry-run-publish>, the "⋯" menu's item)
export { DEFAULT_DRY_RUN_PUBLISH_MESSAGES, type DryRunPublishMessages } from '@nostr-post/web';

// Background work (uploads, relay sends) shown by <np-activity> in a corner of the page
export {
  type Activity,
  type ActivityHandle,
  startActivity,
  getActivities,
  subscribeActivities,
  dismissActivity,
  type ActivityOptions,
  publishBlockers,
  waitForPublishBlockers,
} from '@nostr-post/plugins/activity';
// Asking the app to sign the user in (uploads, publishing)
export { onSignInNeeded, requestSignIn, type SignInReason } from '@nostr-post/plugins/signIn';
export {
  type ActivityMessages,
  DEFAULT_ACTIVITY_MESSAGES,
  setActivityMessages,
} from '@nostr-post/web';
// Media upload (the user's Blossom servers, then nostr.build) and its text (Add media, photo
// quality, progress)
export {
  DEFAULT_MEDIA_MESSAGES,
  type MediaMessages,
  setMediaMessages,
  type UploadMediaOptions,
  uploadMedia,
  prepareUploadLater,
  uploadPrepared,
  DEFAULT_MEDIA_GALLERY_MESSAGES,
  type MediaGalleryMessages,
} from '@nostr-post/plugin-media/web';
// Photos and videos of posts (galleries), and the posts referencing events
export {
  eventMedia,
  mediaOfEvents,
  type MediaItem,
  PICTURE_KIND,
  VIDEO_KIND,
  SHORT_VIDEO_KIND,
} from '@nostr-post/plugin-media';
export {
  fetchReferences,
  referenceFilters,
  // A page's sections (`sections` of a manifest): which posts, matched and counted
  fetchSection,
  sectionFilters,
  matchesSection,
  sectionStats,
  sectionTarget,
  postSnippet,
  type SectionTarget,
  // "Add" linking the pages the page or event links (`add.also`)
  alsoLinkOptions,
  alsoLinkTags,
  loadAlsoLinks,
} from '@nostr-post/posts';
export type { PostSection } from '@nostr-post/core/types';
// How a page section shows (`view`): register your own element under a name
export {
  registerSectionView,
  sectionViewFor,
  type SectionView,
} from '@nostr-post/plugins/entities';

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

// Wiki (NIP-54 kind:30818)
export {
  WIKI_KIND,
  DEFAULT_WIKI_RELAYS,
  STANDARD_WIKI_MANIFEST,
  manifestToWikiEvent,
  wikiEventToManifestData,
  unmappedTableRows,
  buildWikiATag,
  extractExternalIds,
  normalizeDTag,
  defaultResolver,
  collectEntityATags,
  fetchEntityVersions,
  checkEntityDTag,
  externalIdLink,
  entityLinks,
  manifestLinks,
  // Entity manifests: register your own, or reference a published one by its 30078: address
  registerEntityManifest,
  getEntityManifest,
  resolveEntityManifest,
  // A plugin's "+ Create" form in the entity picker (e.g. venue pages from OpenStreetMap)
  registerEntityCreator,
  entityCreatorFor,
  // A plugin's control shown with events of a manifest (e.g. Save to lists)
  registerEventAction,
  eventActionsFor,
  // A value linking a wiki page (a section's "Add")
  pageLinkValue,
} from '@nostr-post/wiki';

// Wiki entity picker (search, create)
export {
  createEntityPage,
  createsPage,
  entityTypeAffixes,
  entityJsonSchema,
  resolveEntities,
  searchEntities,
  withPageLinks,
} from '@nostr-post/plugin-wiki-entity';

// Venues and the venue hub (wiki entity filled from OpenStreetMap)
export {
  searchNominatim,
  fetchOsmElement,
  findVenueEntity,
  syncVenueEntity,
  // The app's Google Maps Embed key for venues' place card
  configureVenuePlugin,
} from '@nostr-post/plugin-venue';

// Bookmark lists (NIP-51): <np-list-save> and <np-list-view>, and the functions behind them
export {
  fetchLists,
  fetchMyLists,
  addToList,
  removeFromList,
  createList,
  deleteList,
  itemFor,
  hasItem,
  BOOKMARK_LISTS,
  CALENDAR_LISTS,
  type ListKind,
  // The list field (uiPlugin "list"): what it saves after publishing
  saveToChoices,
  itemsToSave,
  listField,
} from '@nostr-post/list';

// Posts published later: drafts, timed posts, upload later (@nostr-post/outbox)
export {
  captureEvents,
  createOutbox,
  draftItem,
  INTERRUPTED_AFTER_SECONDS,
  isInterrupted,
  isLate,
  itemActions,
  memoryStorage,
  combineStorage,
  type OutboxItemStore,
  type OutboxFileStore,
  nextStep,
  type Outbox,
  type OutboxAction,
  type OutboxChange,
  type OutboxDraft,
  type OutboxItem,
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
  setBrowserOutboxItems,
  requestPersistentStorage,
  startOutboxRunner,
} from '@nostr-post/outbox/web';
