/**
 * @nostr-post/plugin-lightning - Core entrypoint
 *
 * Import this for Lightning payments without a UI: resolving Lightning addresses, LNURLs and
 * npubs (LNURL-pay), invoices, NIP-57 zap requests and receipts, WebLN, and the field plugin.
 * Import '@nostr-post/plugin-lightning/web' for <np-lightning> and the field's input and view.
 */
export { DEFAULT_AMOUNTS, lightningPlugin, lightningTexts, presetAmounts } from './core';
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
