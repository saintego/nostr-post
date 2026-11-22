/**
 * @nostr-post/plugin-embed/web
 *
 * Importing this module:
 * 1. Defines <np-embed>, <np-embed-view> and <np-embed-input>
 * 2. Registers the embed plugin (with tag names) in the shared PluginRegistry
 * 3. Shows links in note text that have a player (YouTube, Spotify, SoundCloud…) as the player
 *    (`registerLinkView`), e.g. in comments
 */

import { registerLinkView } from '@nostr-post/plugins/entities';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { embedFor, embedPlugin } from './core';

import './web/embed';
import './web/embedField';

pluginRegistry.register({
  ...embedPlugin,
  inputTagName: 'np-embed-input',
  viewTagName: 'np-embed-view',
});

registerLinkView({ matches: (url) => embedFor(url) !== undefined, tagName: 'np-embed' });

export { NpEmbed } from './web/embed';
export { NpEmbedInput, NpEmbedView } from './web/embedField';
export { DEFAULT_EMBED_MESSAGES, type EmbedMessages } from './web/embedMessages';
export { embedPlugin } from './core';
