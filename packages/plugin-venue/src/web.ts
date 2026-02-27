/**
 * @nostr-post/plugin-venue/web
 *
 * Importing this module:
 * 1. Defines <np-venue-input> and <np-venue-view> custom elements
 * 2. Registers the venue plugin (with tag names) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-venue/web';
 *   // Now venue plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { venuePlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...venuePlugin,
  inputTagName: 'np-venue-input',
  viewTagName: 'np-venue-view',
});

// Re-export components for direct usage
export { NpVenueInput } from './web/input';
export { NpVenueView } from './web/view';
export { venuePlugin } from './core';
