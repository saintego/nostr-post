/**
 * @nostr-post/plugin-hashtag/web
 *
 * Importing this module:
 * 1. Defines <np-hashtag-input> and <np-hashtag-view> custom elements
 * 2. Registers the hashtag plugin (with tag names) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-hashtag/web';
 *   // Now hashtag plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { hashtagPlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...hashtagPlugin,
  inputTagName: 'np-hashtag-input',
  viewTagName: 'np-hashtag-view',
});

// Re-export components for direct usage
export { NpHashtagInput } from './web/input';
export { NpHashtagView } from './web/view';
export { hashtagPlugin } from './core';
