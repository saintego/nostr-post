// Entity manifests for plugins (@nostr-post/plugins/entities)
import './entityManifests';

export { normalizeDTag } from './normalizeDTag';
export {
  type EntityManifestRef,
  getEntityManifest,
  registerEntityManifest,
  resolveEntityManifest,
} from './registry';
export {
  RELATED_STATS_LIMIT,
  type WikiRelatedSection,
  fetchRelated,
  filterRelated,
  relatedImages,
  relatedSnippet,
  relatedStats,
} from './related';
export {
  type CreatedEntity,
  type EntityCreator,
  entityCreatorFor,
  registerEntityCreator,
} from './creators';
// Event actions live in @nostr-post/plugins, where plugins register them
export {
  type EventAction,
  eventActionsFor,
  registerEventAction,
} from '@nostr-post/plugins/entities';
export { type ExternalIdLink, entityLinks, externalIdLink } from './externalIds';
export { linkFromTemplate, manifestLinks } from './links';

export { interpolateTemplate, templateFieldIds, templateText } from './identity';
export { validateWikiForm } from './validate';
export type { WikiConfig, WikiLinkTemplate, WikiManifest } from './types';

export {
  type WikiEvent,
  type WikiResolverFunction,
  defaultResolver,
  collectEntityATags,
  groupByDTag,
  countContributors,
  selectNewestEntity,
} from './resolver';

export {
  checkEntityDTag,
  checkEntitySlug,
  type DTagAvailability,
  fetchEntityVersions,
} from './fetch';
export {
  type EntityTypeAffixes,
  entityTypeAffixes,
  distinguishingFieldLabels,
  distinguishingSuggestions,
  entityDTagFor,
  entityTitleFor,
  nameFieldId,
} from './disambiguation';

export {
  WIKI_KIND,
  DEFAULT_WIKI_RELAYS,
  STANDARD_WIKI_MANIFEST,
  manifestToWikiEvent,
  wikiEventToManifestData,
  unmappedTableRows,
  buildWikiATag,
  extractExternalIds,
  type WikiEventConfig,
} from './nip54';
