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
import { registerEntityCreator } from '@nostr-post/wiki';
import { venuePlugin } from './core';

// Import web components (side-effect: defines custom elements)
import './web/input';
import './web/view';
import './web/wikiPublish';
import './web/entityCreate';
import './web/venueList';

// Register the plugin with its web component tag names
pluginRegistry.register({
  ...venuePlugin,
  inputTagName: 'np-venue-input',
  viewTagName: 'np-venue-view',
  publishSummaryTagName: 'np-venue-wiki-publish',
});

// The picker's "+ Create" for venue pages (entity types whose fields come from OSM)
registerEntityCreator({
  tagName: 'np-venue-entity-create',
  matches: (manifest) =>
    manifest.fields.some((f) => {
      const sources = f.metadata?.sources as { osm?: unknown } | undefined;
      return sources?.osm !== undefined;
    }),
});

// Re-export components for direct usage
export { NpVenueInput } from './web/input';
export { NpVenueView } from './web/view';
export { venuePlugin } from './core';

// App-wide settings, e.g. the Google Maps Embed API key for the place card
export { configureVenuePlugin, type VenuePluginSettings } from './googleEmbed';
