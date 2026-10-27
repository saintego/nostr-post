/**
 * @nostr-post/plugin-wiki-entity
 *
 * Headless entry — registers the wiki-entity-picker plugin logic.
 * For the Lit web component, import '@nostr-post/plugin-wiki-entity/web'.
 */

export {
  createTarget,
  entityDataOf,
  entityPrefill,
  entitySnippet,
  entityTypeAffixes,
  entityTypeDTag,
  type EntityTypeAffixes,
  getEntityManifest,
  matchesEntityQuery,
  matchesEntityType,
  pickedEntities,
  registerEntityManifest,
  wikiEntityPickerPlugin,
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';

export {
  DEFAULT_WIKI_ENTITY_PICKER_MESSAGES,
  type WikiEntityPickerMessages,
} from './pickerMessages';
export { resolveEntityNames } from './resolveNames';
export { type EntitySearchResult, searchEntities } from './search';
