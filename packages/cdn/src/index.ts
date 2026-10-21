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
import '@nostr-post/plugin-venue/web';
import '@nostr-post/plugin-media/web';
import '@nostr-post/plugin-reference/web';
import '@nostr-post/plugin-markdown/web';
import '@nostr-post/plugin-hashtag/web';
import '@nostr-post/plugin-list/web';
import '@nostr-post/wiki/web';
import '@nostr-post/plugin-wiki-entity/web';

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

// Plugin registry
export { pluginRegistry } from '@nostr-post/plugins/registry';

// Geo helpers
export {
  geoPlugin,
  encodeGeohash,
  decodeGeohash,
  type GeoPluginConfig,
  type GeoCoordinates,
} from '@nostr-post/plugin-geo';

// Date helpers (NIP-52 calendar event dates)
export {
  datePlugin,
  formatDateValue,
  dateValueFromTags,
  dayNumbers,
  ALL_DAY_EVENT_KIND,
  TIMED_EVENT_KIND,
  type DateValue,
} from '@nostr-post/plugin-date';

// Signing & relay utilities
export {
  signEvent,
  signAndPublish,
  publishToRelay,
  publishToRelays,
  getPublicKey,
  hasNostrSigner,
  fetchEvents,
  fetchEventsFromRelay,
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
  isDryRun,
  getDryRunEntries,
  clearDryRunEntries,
  DRY_RUN_CHANGE_EVENT,
  type DryRunEntry,
  type NostrProfile,
  type ProfileOptions,
  type DryRunChangeDetail,
} from '@nostr-post/signer';

// Relay helpers (defined in web/signer, re-exported from web)
export {
  getUserRelays,
  getDefaultRelays,
} from '@nostr-post/web';

// Publishing a submitted post yourself (composer without auto-publish): plugin hooks
export { runAfterPublish, runBeforePublish, runPublishHooks, withTags } from '@nostr-post/web';

// Composer text (submit button, steps, errors) for overriding via its `messages` property
export { type ComposerMessages, DEFAULT_COMPOSER_MESSAGES } from '@nostr-post/web';

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
  // Related items on an entity's page (wikiConfig.related)
  fetchRelated,
  filterRelated,
  relatedImages,
  relatedSnippet,
  relatedStats,
} from '@nostr-post/wiki';

// Wiki entity picker (search, create)
export { searchEntities, entityTypeAffixes } from '@nostr-post/plugin-wiki-entity';

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
  // The list field (uiPlugin "list"): what it saves after publishing
  saveToChoices,
  itemsToSave,
  listField,
} from '@nostr-post/plugin-list';
