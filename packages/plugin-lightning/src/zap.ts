/**
 * @nostr-post/plugin-lightning - Zaps (NIP-57)
 *
 * The zap request a payer signs (kind 9734; sent to the Lightning service, not to relays), the
 * filter for the zap receipt the service publishes when the invoice is paid (kind 9735), and the
 * checks a receipt must pass: signed by the service's key, for this payee, and for this request
 * and amount. Zaps are public: a receipt names the payer, the payee and the amount.
 */

export const ZAP_REQUEST_KIND = 9734;
export const ZAP_RECEIPT_KIND = 9735;

/** An unsigned event, as signers take it */
export interface UnsignedZapRequest {
  kind: typeof ZAP_REQUEST_KIND;
  created_at: number;
  tags: string[][];
  content: string;
}

/** A signed event (as receipts and signed zap requests come) */
export interface NostrEventLike {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
}

export interface ZapRequestOptions {
  /** Hex pubkey of the payee */
  recipient: string;
  amountMsat: number;
  /** Relays the service publishes the receipt to (the payee's, where people will see it) */
  relays: string[];
  /** The payee's LNURL (bech32), recommended by NIP-57 */
  lnurl?: string;
  /** The payer's message, public on the receipt */
  content?: string;
  /** A zapped event or address (`<kind>:<pubkey>:<d-tag>`), e.g. a support page */
  eventId?: string;
  address?: string;
  createdAt?: number;
}

/** A NIP-57 zap request for the payer to sign */
export const buildZapRequest = (options: ZapRequestOptions): UnsignedZapRequest => ({
  kind: ZAP_REQUEST_KIND,
  created_at: options.createdAt ?? Math.floor(Date.now() / 1000),
  content: options.content ?? '',
  tags: [
    ['relays', ...options.relays],
    ['amount', String(options.amountMsat)],
    ...(options.lnurl ? [['lnurl', options.lnurl]] : []),
    ['p', options.recipient],
    ...(options.eventId ? [['e', options.eventId]] : []),
    ...(options.address ? [['a', options.address]] : []),
  ],
});

const MULTIPLIER_MSAT: Record<string, number> = {
  m: 100_000_000,
  u: 100_000,
  n: 100,
  p: 0.1,
};

/**
 * The amount of a BOLT11 invoice in millisatoshis, from its prefix (`lnbc2500u1…` → 250 000 000);
 * undefined for invoices without an amount or that aren't invoices
 */
export const bolt11AmountMsat = (invoice: string): number | undefined => {
  const match = invoice
    .trim()
    .toLowerCase()
    .replace(/^lightning:/, '')
    .match(/^ln(?:bcrt|bc|tbs|tb)(\d+)([munp]?)1[02-9ac-hj-np-z]+$/);
  if (!match) return undefined;
  const [, digits = '', unit = ''] = match;
  const msat = unit
    ? Number(digits) * (MULTIPLIER_MSAT[unit] ?? 0)
    : Number(digits) * 100_000_000_000;
  return Number.isInteger(msat) ? msat : undefined;
};

/** The filter for zap receipts to a payee since a time (seconds) */
export const zapReceiptFilter = (recipient: string, since: number) => ({
  kinds: [ZAP_RECEIPT_KIND],
  '#p': [recipient],
  since,
});

const tagValue = (event: { tags: string[][] }, name: string): string | undefined =>
  event.tags.find((tag) => tag[0] === name)?.[1];

export interface ReceiptCheck {
  recipient: string;
  /** The service's `nostrPubkey`: only it signs this payee's receipts */
  nostrPubkey: string;
  /** The invoice paid; its receipt carries it as `bolt11` */
  invoice?: string;
  /** The id of the signed zap request */
  zapRequestId?: string;
}

/**
 * Whether a zap receipt is the one for a payment: kind 9735 signed by the service, to the payee,
 * with the zap request (its `description`) and, when given, the invoice and request id.
 * (Relays check signatures; this checks who signed and what.)
 */
export const isZapReceiptFor = (receipt: NostrEventLike, check: ReceiptCheck): boolean => {
  if (receipt.kind !== ZAP_RECEIPT_KIND || receipt.pubkey !== check.nostrPubkey) return false;
  if (tagValue(receipt, 'p') !== check.recipient) return false;
  const bolt11 = tagValue(receipt, 'bolt11');
  if (check.invoice && bolt11?.toLowerCase() !== check.invoice.toLowerCase()) return false;
  let request: NostrEventLike;
  try {
    request = JSON.parse(tagValue(receipt, 'description') ?? '');
  } catch {
    return false;
  }
  if (request?.kind !== ZAP_REQUEST_KIND) return false;
  if (check.zapRequestId && request.id !== check.zapRequestId) return false;
  const requested = tagValue(request, 'amount');
  const paid = bolt11 ? bolt11AmountMsat(bolt11) : undefined;
  return !requested || paid === undefined || Number(requested) === paid;
};
