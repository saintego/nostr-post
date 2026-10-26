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

import { registerEventAction } from '@nostr-post/plugins/entities';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { publishesCalendarEvents } from './calendars';
import { datePlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/dateInput';
import './web/dateView';
import './web/rsvpButtons';
import './web/calendarSave';
import './web/icsDownload';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...datePlugin,
  inputTagName: 'np-date-input',
  viewTagName: 'np-date-view',
});

// RSVP and Add to calendar on events made with manifests that publish calendar events
registerEventAction({ tagName: 'np-rsvp', matches: publishesCalendarEvents });
registerEventAction({ tagName: 'np-calendar-save', matches: publishesCalendarEvents });
registerEventAction({ tagName: 'np-ics-download', matches: publishesCalendarEvents });

// Re-export components for direct usage
export { NpDateInput } from './web/dateInput';
export { NpDateView } from './web/dateView';
export { DEFAULT_DATE_MESSAGES, type DateMessages } from './web/dateMessages';
export { NpRsvp } from './web/rsvpButtons';
export { NpCalendarSave } from './web/calendarSave';
export { NpIcsDownload } from './web/icsDownload';
export { DEFAULT_ICS_MESSAGES, type IcsMessages } from './web/icsMessages';
export { DEFAULT_CALENDAR_SAVE_MESSAGES } from './web/calendarMessages';
export { DEFAULT_RSVP_MESSAGES, type RsvpMessages } from './web/rsvpMessages';
export { datePlugin } from './core';
