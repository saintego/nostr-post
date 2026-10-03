/**
 * @nostr-post/plugin-wiki-entity
 *
 * Headless entry — registers the wiki-entity-picker plugin logic.
 * For the Lit web component, import '@nostr-post/plugin-wiki-entity/web'.
 */

export {
  entityPrefill,
  getEntityManifest,
  matchesEntityQuery,
  registerEntityManifest,
  wikiEntityPickerPlugin,
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';
