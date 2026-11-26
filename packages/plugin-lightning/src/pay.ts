/**
 * @nostr-post/plugin-lightning - Paying a payee
 *
 * One payment from the field's text to an invoice: find the payee's Lightning (a profile's
 * `lud16`/`lud06` for an npub), the service's parameters, then the invoice: a zap when the service
 * allows Nostr, the payee's pubkey is known and the payer has a signer, else a plain invoice.
 * Then: pay it with WebLN if the browser has a wallet, and watch for the zap receipt or the LUD-21
 * verify link. Relays, profiles, signing and requests come from `@nostr-post/signer` and `fetch`,
 * replaceable (`PayDeps`) for tests and other apps.
 */

import { encodeLnurl } from '@nostr-post/core/nip19';
import type { Result } from '@nostr-post/plugins/types';
import {
  DEFAULT_RELAYS,
  fetchEvents,
  fetchProfile,
  fetchUserRelays,
  hasNostrSigner,
  signEvent,
} from '@nostr-post/signer';
import {
  defaultFetchJson,
  type FetchJson,
  fetchPayParams,
  type Invoice,
  type LightningError,
  type LightningTarget,
  type PayParams,
  parseLightningTarget,
  payUrl,
  profileLightning,
  requestInvoice,
} from './lnurl';
import { buildZapRequest, isZapReceiptFor, type NostrEventLike, zapReceiptFilter } from './zap';

/** What a payment needs from outside: requests, profiles, relays, signing */
export interface PayDeps {
  fetchJson: FetchJson;
  /** A profile's content (its `lud16`/`lud06`) */
  fetchProfile: (
    pubkey: string,
    relays?: string[]
  ) => Promise<{ lud16?: string; lud06?: string } | undefined>;
  /** Relays a payee reads (their relay list), for the zap request and its receipt */
  userRelays: (pubkey: string) => Promise<string[]>;
  /** Signs the zap request; undefined when the payer has no signer (then a plain invoice) */
  signEvent?: (event: object) => Promise<NostrEventLike>;
  /** Zap receipts matching a filter */
  fetchReceipts: (filter: object, relays: string[]) => Promise<NostrEventLike[]>;
}

/** Zap requests list at most this many of the payee's relays */
const MAX_ZAP_RELAYS = 6;

/** The signer's and relays' functions of `@nostr-post/signer`; signing only with a signer present */
export const defaultPayDeps = (): PayDeps => ({
  fetchJson: defaultFetchJson,
  fetchProfile: (pubkey, relays) => fetchProfile(pubkey, relays ? { hints: relays } : undefined),
  userRelays: (pubkey) => fetchUserRelays(pubkey),
  signEvent: hasNostrSigner()
    ? (event) => signEvent(event as Parameters<typeof signEvent>[0]) as Promise<NostrEventLike>
    : undefined,
  fetchReceipts: (filter, relays) =>
    fetchEvents(filter as Parameters<typeof fetchEvents>[0], relays) as Promise<NostrEventLike[]>,
});

/** A payee ready to pay: their service's parameters, and their pubkey when known */
export interface Payee {
  /** What the field said */
  target: LightningTarget;
  /** The LNURL-pay URL */
  url: string;
  params: PayParams;
  /** Hex pubkey of the payee: the npub's, or the page owner's for an address on their page */
  pubkey?: string;
}

const fail = (code: LightningError['code'], message: string): Result<never, LightningError> => ({
  success: false,
  error: { code, message },
});

/**
 * The payee of a field's text. `owner` is whose the text is (e.g. the author of a support page
 * listing a Lightning address): zaps to the address go to them.
 */
export const resolvePayee = async (
  text: string,
  owner: string | undefined,
  deps: PayDeps
): Promise<Result<Payee, LightningError>> => {
  const target = parseLightningTarget(text);
  if (!target) return fail('invalid-target', 'Not a Lightning address, LNURL or npub');
  let pubkey = owner;
  let payTarget: LightningTarget | undefined = target;
  if (target.type === 'pubkey') {
    pubkey = target.pubkey;
    payTarget = profileLightning(await deps.fetchProfile(target.pubkey, target.relays));
    if (!payTarget) return fail('no-lightning', 'This profile has no Lightning address');
  }
  const url = payUrl(payTarget);
  if (!url) return fail('invalid-target', 'Not a Lightning address, LNURL or npub');
  const params = await fetchPayParams(url, deps.fetchJson);
  if (!params.success) return params;
  return {
    success: true,
    data: { target, url, params: params.data, ...(pubkey ? { pubkey } : {}) },
  };
};

/** Whether paying this payee can be a zap: the service allows Nostr and the payee is known */
export const canZap = (payee: Payee): boolean =>
  payee.params.allowsNostr && payee.pubkey !== undefined && payee.params.nostrPubkey !== undefined;

export interface PaymentRequest {
  amountSats: number;
  comment?: string;
  /** Make it a zap (needs `canZap` and a signer); false for a plain invoice */
  zap: boolean;
  /** What is zapped besides the payee, e.g. the support page's address */
  address?: string;
}

/** An invoice to pay, and how to know it was paid */
export interface Payment extends Invoice {
  amountMsat: number;
  /** The signed zap request, for a zap */
  zapRequest?: NostrEventLike;
  /** Where the zap receipt will be published */
  relays: string[];
  /** When the invoice was requested (seconds), receipts are looked for from then */
  since: number;
}

/** Asks the payee's service for an invoice: a zap (signed by the payer) or a plain one */
export const requestPayment = async (
  payee: Payee,
  request: PaymentRequest,
  deps: PayDeps
): Promise<Result<Payment, LightningError>> => {
  const amountMsat = Math.round(request.amountSats * 1000);
  const since = Math.floor(Date.now() / 1000) - 5;
  let zapRequest: NostrEventLike | undefined;
  let relays: string[] = [];
  if (request.zap && canZap(payee) && deps.signEvent && payee.pubkey) {
    relays = (await deps.userRelays(payee.pubkey).catch(() => DEFAULT_RELAYS)).slice(
      0,
      MAX_ZAP_RELAYS
    );
    try {
      zapRequest = await deps.signEvent(
        buildZapRequest({
          recipient: payee.pubkey,
          amountMsat,
          relays,
          lnurl: encodeLnurl(payee.url),
          content: request.comment?.trim() ?? '',
          address: request.address,
        })
      );
    } catch {
      return fail('service', 'The zap was not signed');
    }
  }
  const invoice = await requestInvoice(payee.params, amountMsat, {
    // A zap carries the message in its request; a plain invoice as a LUD-12 comment
    comment: zapRequest ? undefined : request.comment,
    zapRequest,
    lnurl: zapRequest ? encodeLnurl(payee.url) : undefined,
    fetchJson: deps.fetchJson,
  });
  if (!invoice.success) return invoice;
  return {
    success: true,
    data: { ...invoice.data, amountMsat, relays, since, ...(zapRequest ? { zapRequest } : {}) },
  };
};

/** The zap receipt of a payment, if the service published it yet */
export const findZapReceipt = async (
  payee: Payee,
  payment: Payment,
  deps: PayDeps
): Promise<NostrEventLike | undefined> => {
  if (!payment.zapRequest || !payee.pubkey || !payee.params.nostrPubkey) return undefined;
  const receipts = await deps
    .fetchReceipts(zapReceiptFilter(payee.pubkey, payment.since), payment.relays)
    .catch(() => []);
  const check = {
    recipient: payee.pubkey,
    nostrPubkey: payee.params.nostrPubkey,
    invoice: payment.pr,
    zapRequestId: payment.zapRequest.id,
  };
  return receipts.find((receipt) => isZapReceiptFor(receipt, check));
};

// ── WebLN ───────────────────────────────────────────────────────────

interface WebLnProvider {
  enable: () => Promise<void>;
  sendPayment: (invoice: string) => Promise<{ preimage: string }>;
}

const webln = (): WebLnProvider | undefined => (globalThis as { webln?: WebLnProvider }).webln;

/** Whether the browser has a WebLN wallet (e.g. the Alby extension) */
export const hasWebln = (): boolean => webln() !== undefined;

/** Pays an invoice with the browser's WebLN wallet; the preimage proves it was paid */
export const payWithWebln = async (invoice: string): Promise<Result<string, LightningError>> => {
  const wallet = webln();
  if (!wallet) return fail('service', 'No wallet in this browser');
  try {
    await wallet.enable();
    const { preimage } = await wallet.sendPayment(invoice);
    return { success: true, data: preimage };
  } catch (error) {
    return fail('service', error instanceof Error ? error.message : 'The wallet did not pay');
  }
};
