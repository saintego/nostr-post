/**
 * @nostr-post/plugin-payment - Core entrypoint
 *
 * Import this for payments without a UI: the payment methods (Lightning, on-chain Bitcoin, and
 * what apps register), Lightning's LNURL-pay, invoices, NIP-57 zap requests and receipts, WebLN,
 * and the field plugin. Import '@nostr-post/plugin-payment/web' for the elements.
 */
export { bitcoinAddress, bitcoinMethod, bitcoinUri, btcAmount } from './bitcoin';
export {
  DEFAULT_AMOUNTS,
  lightningPlugin,
  paymentPlugin,
  paymentTexts,
  presetAmounts,
} from './core';
export { lightningMethod } from './lightningMethod';
export {
  type DetectedPayment,
  detectPayment,
  type PaymentMethod,
  paymentMethods,
  registerPaymentMethod,
} from './methods';
export {
  amountAllowed,
  checkSettled,
  defaultFetchJson,
  type FetchJson,
  fetchPayParams,
  type Invoice,
  type InvoiceOptions,
  invoiceUrl,
  isLightningAddress,
  type LightningError,
  type LightningTarget,
  lightningAddressUrl,
  type PayParams,
  parseLightningTarget,
  parsePayParams,
  payUri,
  payUrl,
  profileLightning,
  requestInvoice,
} from './lnurl';
export {
  canZap,
  defaultPayDeps,
  findZapReceipt,
  hasWebln,
  type Payee,
  type PayDeps,
  type Payment,
  type PaymentRequest,
  payWithWebln,
  requestPayment,
  resolvePayee,
} from './pay';
export {
  bolt11AmountMsat,
  buildZapRequest,
  isZapReceiptFor,
  type NostrEventLike,
  type ReceiptCheck,
  type UnsignedZapRequest,
  ZAP_RECEIPT_KIND,
  ZAP_REQUEST_KIND,
  type ZapRequestOptions,
  zapReceiptFilter,
} from './zap';
