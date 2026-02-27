/**
 * @nostr-post/plugin-media/web
 *
 * Importing this module:
 * 1. Defines <np-media-input> and <np-media-view> custom elements
 * 2. Registers the media plugin (with tag names) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-media/web';
 *   // Now media plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { mediaPlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...mediaPlugin,
  inputTagName: 'np-media-input',
  viewTagName: 'np-media-view',
});

// Re-export components for direct usage
export { NpMediaInput } from './web/input';
export { NpMediaView } from './web/view';
export { mediaPlugin } from './core';
