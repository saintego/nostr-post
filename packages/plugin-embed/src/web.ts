/**
 * @nostr-post/plugin-embed/web
 *
 * Importing this module:
 * 1. Defines <np-embed>, <np-embed-view> and <np-embed-input>
 * 2. Registers the embed plugin (with tag names) in the shared PluginRegistry
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { embedPlugin } from './core';

import './web/embed';
import './web/embedField';

pluginRegistry.register({
  ...embedPlugin,
  inputTagName: 'np-embed-input',
  viewTagName: 'np-embed-view',
});

export { NpEmbed } from './web/embed';
export { NpEmbedInput, NpEmbedView } from './web/embedField';
export { DEFAULT_EMBED_MESSAGES, type EmbedMessages } from './web/embedMessages';
export { embedPlugin } from './core';
