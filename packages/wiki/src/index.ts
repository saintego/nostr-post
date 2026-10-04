export { normalizeDTag } from './normalizeDTag';

export { interpolateTemplate, templateFieldIds, templateText } from './identity';
export { validateWikiForm } from './validate';
export type { WikiConfig, WikiManifest } from './types';

export {
  type WikiEvent,
  type WikiResolverFunction,
  defaultResolver,
  collectEntityATags,
  groupByDTag,
  countContributors,
  selectNewestEntity,
} from './resolver';

export { entityDTagExists, fetchEntityVersions } from './fetch';
export {
  distinguishingFieldLabels,
  distinguishingSuggestions,
  entityDTagFor,
  nameFieldId,
} from './disambiguation';

export {
  WIKI_KIND,
  DEFAULT_WIKI_RELAYS,
  manifestToWikiEvent,
  wikiEventToManifestData,
  buildWikiATag,
  extractExternalIds,
  type WikiEventConfig,
} from './nip54';
