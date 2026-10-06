export { normalizeDTag } from './normalizeDTag';
export {
  type EntityManifestRef,
  getEntityManifest,
  registerEntityManifest,
  resolveEntityManifest,
} from './registry';
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

export { checkEntityDTag, type DTagAvailability, fetchEntityVersions } from './fetch';
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
