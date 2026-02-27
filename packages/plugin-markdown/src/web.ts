/**
 * @nostr-post/plugin-markdown/web
 *
 * Importing this module:
 * 1. Defines <np-markdown-input> and <np-markdown-view> custom elements
 * 2. Registers the markdown plugin (with tag names) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-markdown/web';
 *   // Now markdown plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { markdownPlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...markdownPlugin,
  inputTagName: 'np-markdown-input',
  viewTagName: 'np-markdown-view',
});

// Re-export components for direct usage
export { NpMarkdownInput } from './web/input';
export { NpMarkdownView } from './web/view';
export { markdownPlugin } from './core';
