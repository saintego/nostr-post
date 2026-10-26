/**
 * @nostr-post/plugin-date/web
 *
 * Importing this module:
 * 1. Defines <np-date-input> and <np-date-view> custom elements
 * 2. Registers the date plugin (with tag names) in the shared PluginRegistry
 *
 * Usage:
 *   import '@nostr-post/plugin-date/web';
 *   // Now the date plugin is available in composer/view automatically
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { datePlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/dateInput';
import './web/dateView';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...datePlugin,
  inputTagName: 'np-date-input',
  viewTagName: 'np-date-view',
});

// Re-export components for direct usage
export { NpDateInput } from './web/dateInput';
export { NpDateView } from './web/dateView';
export { DEFAULT_DATE_MESSAGES, type DateMessages } from './web/dateMessages';
export { datePlugin } from './core';
