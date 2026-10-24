/**
 * @nostr-post/plugin-profile/web
 *
 * Importing this module:
 * 1. Defines <np-profile-input> and <np-profile-view> custom elements
 * 2. Registers the profile plugin (with tag names) in the shared PluginRegistry
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { profilePlugin } from './core';

import './web/profileInput';
import './web/profileView';

pluginRegistry.register({
  ...profilePlugin,
  inputTagName: 'np-profile-input',
  viewTagName: 'np-profile-view',
});

export { NpProfileInput } from './web/profileInput';
export { NpProfileView } from './web/profileView';
export { DEFAULT_PROFILE_MESSAGES, type ProfileMessages } from './web/profileMessages';
export { profilePlugin } from './core';
