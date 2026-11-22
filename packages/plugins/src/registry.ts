/**
 * @nostr-post/plugins - Plugin Registry
 *
 * Central registry for discovering and loading plugins.
 * Empty by default — each plugin package registers itself when imported.
 *
 * Usage:
 *   import '@nostr-post/plugin-stars/web'; // auto-registers stars plugin
 *   import '@nostr-post/plugin-geo/web';   // auto-registers geo plugin
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { FieldType, NostrUIPlugin } from './types';

/**
 * Plugin registry singleton.
 * Plugin packages register themselves here on import.
 */
class PluginRegistry {
  private plugins = new Map<string, NostrUIPlugin>();

  /**
   * Register a plugin
   */
  register(plugin: NostrUIPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Overwriting.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Get a plugin by ID
   */
  get(id: string): NostrUIPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Check if a plugin is registered
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Get all registered plugins
   */
  getAll(): NostrUIPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by field type
   */
  getByType(type: string): NostrUIPlugin[] {
    return this.getAll().filter((plugin) => {
      if (Array.isArray(plugin.type)) {
        return plugin.type.includes(type as FieldType);
      }
      return plugin.type === type;
    });
  }

  /**
   * Unregister a plugin
   */
  unregister(id: string): boolean {
    return this.plugins.delete(id);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();

// Export for custom registries
export { PluginRegistry };

/** Loads the field plugins a manifest uses (their web entries, which register them) */
export type PluginLoader = (manifest: NostrPostManifest) => Promise<void>;

// Module state: the loader `@nostr-post/web` sets when it loads (its plugin autoload)
let pluginLoader: PluginLoader | undefined;

/** Sets how plugins load on demand; `@nostr-post/web` sets its autoload */
export function setPluginLoader(loader: PluginLoader | undefined): void {
  pluginLoader = loader;
}

/**
 * Loads the field plugins `manifest` uses, where a loader is set (an app with
 * `@nostr-post/web`); resolves at once without one. For packages below `web`, e.g. the wiki view
 * showing a page's Markdown text with its plugin
 */
export const loadPluginsFor = async (manifest: NostrPostManifest): Promise<void> => {
  await pluginLoader?.(manifest);
};
