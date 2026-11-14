/**
 * @nostr-post/plugin-wiki-entity
 *
 * Headless entry — registers the wiki-entity-picker plugin logic.
 * For the Lit web component, import '@nostr-post/plugin-wiki-entity/web'.
 */

export {
  createTarget,
  entityDataOf,
  entityNameField,
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

export { type EntityPageHref, entityPageHref, setEntityPageHref } from './entityPageHref';
export {
  DEFAULT_WIKI_ENTITY_PICKER_MESSAGES,
  DEFAULT_WIKI_ENTITY_VIEW_MESSAGES,
  type WikiEntityPickerMessages,
  type WikiEntityViewMessages,
} from './pickerMessages';
export {
  type EntityItem,
  entityItems,
  entityJsonSchema,
  identityFields,
  linkFields,
} from './entityJson';
export { confirmMatch, isUnconfirmed, rejectMatch } from './entityMatch';
export { createEntityPage, createsPage, pageData } from './entityPage';
export { needsPageLinks, splitEventLinks, withPageLinks } from './eventLinks';
export { entityFromPageForm, type PageForm, withEntity } from './pageDraft';
export {
  type EntityRows,
  entityPages,
  entityRows,
  linkedEntities,
  pageTitles,
  titlesOf,
} from './pageTitles';
export { resolveEntities } from './resolveEntities';
export { type EntitySearchResult, searchEntities } from './search';
