/**
 * @nostr-post/plugin-wiki-entity
 *
 * Headless entry — registers the wiki-entity-picker plugin logic.
 * For the Lit web component, import '@nostr-post/plugin-wiki-entity/web'.
 */

export {
  matchesEntityQuery,
  wikiEntityPickerPlugin,
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';
