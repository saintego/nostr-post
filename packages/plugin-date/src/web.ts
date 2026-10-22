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

import { getFieldTargets } from '@nostr-post/core/manifestMappings';
import { registerEventAction } from '@nostr-post/plugins/entities';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { ALL_DAY_EVENT_KIND, datePlugin, TIMED_EVENT_KIND } from './core';

// Import web components (side-effect: defines custom elements)
import './web/dateInput';
import './web/dateView';
import './web/rsvpButtons';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...datePlugin,
  inputTagName: 'np-date-input',
  viewTagName: 'np-date-view',
});

// RSVP on events made with manifests that publish calendar events
registerEventAction({
  tagName: 'np-rsvp',
  matches: (manifest) =>
    manifest.fields.some((field) =>
      getFieldTargets(field).some(
        (target) => target.kind === ALL_DAY_EVENT_KIND || target.kind === TIMED_EVENT_KIND
      )
    ),
});

// Re-export components for direct usage
export { NpDateInput } from './web/dateInput';
export { NpDateView } from './web/dateView';
export { DEFAULT_DATE_MESSAGES, type DateMessages } from './web/dateMessages';
export { NpRsvp } from './web/rsvpButtons';
export { DEFAULT_RSVP_MESSAGES, type RsvpMessages } from './web/rsvpMessages';
export { datePlugin } from './core';
