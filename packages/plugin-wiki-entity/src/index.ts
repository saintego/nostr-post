/**
 * @nostr-post/plugin-wiki-entity
 *
 * Headless entry — registers the wiki-entity-picker plugin logic.
 * For the Lit web component, import '@nostr-post/plugin-wiki-entity/web'.
 */

export {
  entityPrefill,
  entityTypeAffixes,
  entityTypeDTag,
  type EntityTypeAffixes,
  getEntityManifest,
  matchesEntityQuery,
  matchesEntityType,
  registerEntityManifest,
  wikiEntityPickerPlugin,
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';
