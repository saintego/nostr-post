export { normalizeDTag } from './normalizeDTag';

export { interpolateTemplate, templateFieldIds } from './identity';
export type { WikiConfig, WikiManifest } from './types';

export {
  type WikiEvent,
  type WikiResolverFunction,
  defaultResolver,
  collectEntityATags,
} from './resolver';

export {
  WIKI_KIND,
  DEFAULT_WIKI_RELAYS,
  manifestToWikiEvent,
  wikiEventToManifestData,
  buildWikiATag,
  extractExternalIds,
  type WikiEventConfig,
} from './nip54';
