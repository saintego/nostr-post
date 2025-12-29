/**
 * @nostr-post/plugins - Plugin Registry
 *
 * Central registry for discovering and loading plugins
 */

import type { NostrUIPlugin } from '../../core/src/types';
import { starsPlugin } from './plugin-stars';
import { mediaPlugin } from './plugin-media';
import { markdownPlugin } from './plugin-markdown';
import { geoPlugin } from './plugin-geo';

/**
 * Plugin registry singleton
 */
class PluginRegistry {
  private plugins = new Map<string, NostrUIPlugin>();

  constructor() {
    // Register core plugins
    this.register(starsPlugin);
    this.register(mediaPlugin);
    this.register(markdownPlugin);
    this.register(geoPlugin);
  }

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
        return plugin.type.includes(type as any);
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

// Re-export plugins
export { starsPlugin, mediaPlugin, markdownPlugin, geoPlugin };
