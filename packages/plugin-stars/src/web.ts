/**
 * @nostr-post/plugin-stars/web
 *
 * Importing this module:
 * 1. Defines <np-stars-input> and <np-stars-view> custom elements
 * 2. Registers the stars plugin (with tag names) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-stars/web';
 *   // Now stars plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { starsPlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...starsPlugin,
  inputTagName: 'np-stars-input',
  viewTagName: 'np-stars-view',
});

// Re-export components for direct usage
export { NpStarsInput } from './web/input';
export { NpStarsView } from './web/view';
export { starsPlugin } from './core';
