/**
 * @nostr-post/plugin-links/web
 *
 * Importing this module:
 * 1. Defines <np-links-view> and <np-links-input>
 * 2. Registers the `links` field plugin (with tag names) in the shared PluginRegistry
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { linksPlugin } from './core';

import './web/linksField';

pluginRegistry.register({
  ...linksPlugin,
  inputTagName: 'np-links-input',
  viewTagName: 'np-links-view',
});

export { linksPlugin } from './core';
export { NpLinksInput, NpLinksView } from './web/linksField';
export { DEFAULT_LINKS_MESSAGES, type LinksMessages } from './web/linksMessages';
