/**
 * @nostr-post/plugin-lightning/web
 *
 * Importing this module:
 * 1. Defines <np-lightning>, <np-lightning-view> and <np-lightning-input>
 * 2. Registers the `lightning` field plugin (with tag names) in the shared PluginRegistry
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { lightningPlugin } from './core';

import './web/lightning';
import './web/lightningField';

pluginRegistry.register({
  ...lightningPlugin,
  inputTagName: 'np-lightning-input',
  viewTagName: 'np-lightning-view',
});

export { lightningPlugin } from './core';
export { NpLightning, type PaymentStatus } from './web/lightning';
export { NpLightningInput, NpLightningView } from './web/lightningField';
export { DEFAULT_LIGHTNING_MESSAGES, type LightningMessages } from './web/lightningMessages';
export { targetLabel } from './web/lightningParts';
