/**
 * @nostr-post/plugin-payment/web
 *
 * Importing this module:
 * 1. Defines <np-lightning>, <np-payment-qr>, <np-payment-view> and <np-payment-input>
 * 2. Registers the `payment` field plugin (with tag names) in the shared PluginRegistry
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import { paymentPlugin } from './core';

import './web/lightning';
import './web/paymentField';
import './web/paymentQr';

pluginRegistry.register({
  ...paymentPlugin,
  inputTagName: 'np-payment-input',
  viewTagName: 'np-payment-view',
});

export { paymentPlugin } from './core';
export { NpLightning, type PaymentStatus } from './web/lightning';
export { DEFAULT_LIGHTNING_MESSAGES, type LightningMessages } from './web/lightningMessages';
export { targetLabel } from './web/lightningParts';
export { NpPaymentInput, NpPaymentView } from './web/paymentField';
export { DEFAULT_PAYMENT_MESSAGES, type PaymentMessages } from './web/paymentMessages';
export { NpPaymentQr } from './web/paymentQr';
