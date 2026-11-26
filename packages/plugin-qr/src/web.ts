/**
 * @nostr-post/plugin-qr/web
 *
 * Importing this module:
 * 1. Defines <np-qr>, <np-qr-view> and <np-qr-input>
 * 2. Registers the `qr` field plugin (with tag names) in the shared PluginRegistry
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { qrPlugin } from './core';

import './web/qr';
import './web/qrField';

pluginRegistry.register({
  ...qrPlugin,
  inputTagName: 'np-qr-input',
  viewTagName: 'np-qr-view',
});

export { qrPlugin } from './core';
export { NpQr, qrWidthRem, shortText } from './web/qr';
export { NpQrInput, NpQrView } from './web/qrField';
export { DEFAULT_QR_MESSAGES, type QrMessages } from './web/qrMessages';
