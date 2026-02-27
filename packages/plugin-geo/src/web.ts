/**
 * @nostr-post/plugin-geo/web
 *
 * Importing this module:
 * 1. Defines <np-geo-input> and <np-geo-view> custom elements
 * 2. Registers the geo plugin (with tag names) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-geo/web';
 *   // Now geo plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { geoPlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...geoPlugin,
  inputTagName: 'np-geo-input',
  viewTagName: 'np-geo-view',
});

// Re-export components for direct usage
export { NpGeoInput } from './web/input';
export { NpGeoView } from './web/view';
export { geoPlugin } from './core';
