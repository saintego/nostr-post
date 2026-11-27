/**
 * @nostr-post/plugin-links/web
 *
 * Importing this module:
 * 1. Defines <np-link>, <np-embed>, <np-links-view> and <np-links-input>
 * 2. Registers the `links` field plugin, and the same as `embed` (its former id), with their tag
 *    names in the shared PluginRegistry
 * 3. Shows links in note text that have a player (YouTube, Spotify, SoundCloud…) as the player
 *    (`registerLinkView`), e.g. in comments
 */

import { registerLinkView } from '@nostr-post/plugins/entities';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { embedPlugin, linksPlugin } from './core';
import { viewLink } from './rules';
import { linkRules } from './settings';

import './web/embed';
import './web/link';
import './web/linksField';

for (const plugin of [linksPlugin, embedPlugin]) {
  pluginRegistry.register({
    ...plugin,
    inputTagName: 'np-links-input',
    viewTagName: 'np-links-view',
  });
}

registerLinkView({
  matches: (url) => viewLink(url, linkRules()).format === 'embed',
  tagName: 'np-embed',
});

export { embedPlugin, linksPlugin } from './core';
export { NpEmbed } from './web/embed';
export { NpLink } from './web/link';
export { NpLinksInput, NpLinksView } from './web/linksField';
export { DEFAULT_LINKS_MESSAGES, type LinksMessages } from './web/linksMessages';
