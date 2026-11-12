/**
 * @nostr-post/cdn - wiki: NIP-54 wiki pages (<nostr-wiki-view>, <nostr-wiki-composer>), the
 * wiki entity picker and venues (the venue hub).
 */

import '@nostr-post/wiki/web';
import '@nostr-post/plugin-wiki-entity/web';

// Venues and the venue hub (wiki entity filled from OpenStreetMap)
export {
  // The app's Google Maps Embed key for venues' place card
  configureVenuePlugin,
  fetchOsmElement,
  findVenueEntity,
  searchNominatim,
  syncVenueEntity,
} from '@nostr-post/plugin-venue';
// Wiki entity picker (search, create)
export {
  createEntityPage,
  createsPage,
  entityJsonSchema,
  entityTypeAffixes,
  resolveEntities,
  searchEntities,
  withPageLinks,
} from '@nostr-post/plugin-wiki-entity';
// Wiki (NIP-54 kind:30818)
export {
  buildWikiATag,
  checkEntityDTag,
  collectEntityATags,
  DEFAULT_WIKI_RELAYS,
  defaultResolver,
  entityCreatorFor,
  entityLinks,
  eventActionsFor,
  externalIdLink,
  extractExternalIds,
  fetchEntityVersions,
  getEntityManifest,
  manifestLinks,
  manifestToWikiEvent,
  normalizeDTag,
  // A value linking a wiki page (a section's "Add")
  pageLinkValue,
  // A plugin's "+ Create" form in the entity picker (e.g. venue pages from OpenStreetMap)
  registerEntityCreator,
  // Entity manifests: register your own, or reference a published one by its 30078: address
  registerEntityManifest,
  // A plugin's control shown with events of a manifest (e.g. Save to lists)
  registerEventAction,
  resolveEntityManifest,
  STANDARD_WIKI_MANIFEST,
  unmappedTableRows,
  WIKI_KIND,
  wikiEventToManifestData,
} from '@nostr-post/wiki';
