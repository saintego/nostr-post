/**
 * @nostr-post/plugin-payment - LNURL-pay
 *
 * Who to pay and how to ask for an invoice: a Lightning address (LUD-16), an LNURL (LUD-06) or a
 * Nostr profile (`npub`, `nprofile`) whose `lud16`/`lud06` says; the LNURL-pay parameters of the
 * receiving service, and an invoice for an amount (LUD-06), with a comment (LUD-12), a NIP-57 zap
 * request and a verify link (LUD-21). Requests go through a `fetch` the caller can replace.
 */

import { decodeLnurl, decodeProfile, encodeLnurl } from '@nostr-post/core/nip19';
import type { Result } from '@nostr-post/plugins/types';

/** Who a payment goes to, as written in a field or profile */
export type LightningTarget =
  | { type: 'address'; address: string }
  | { type: 'lnurl'; url: string }
  | { type: 'pubkey'; pubkey: string; relays: string[] };

export interface LightningError {
  code: 'invalid-target' | 'no-lightning' | 'network' | 'service' | 'amount' | 'bad-response';
  message: string;
}

export type FetchJson = (url: string) => Promise<unknown>;

const fail = (code: LightningError['code'], message: string): Result<never, LightningError> => ({
  success: false,
  error: { code, message },
});

/** A Lightning address's parts: user names are `a-z0-9-_.+` (LUD-16), the host a domain */
const ADDRESS = /^([a-z0-9\-_.+]+)@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i;

/** Whether text is a Lightning address like `alice@getalby.com` */
export const isLightningAddress = (text: string): boolean => ADDRESS.test(text.trim());

/** The LNURL-pay URL of a Lightning address (`https://<domain>/.well-known/lnurlp/<user>`) */
export const lightningAddressUrl = (address: string): string | undefined => {
  const match = address.trim().match(ADDRESS);
  if (!match) return undefined;
  const [, user = '', domain = ''] = match;
  return `https://${domain.toLowerCase()}/.well-known/lnurlp/${user.toLowerCase()}`;
};

/**
 * Who text names as a payee: a Lightning address, an LNURL (both may start with `lightning:`), or
 * a Nostr profile (`npub`, `nprofile`, `nostr:` before them allowed); undefined for anything else
 */
export const parseLightningTarget = (text: string): LightningTarget | undefined => {
  const value = text
    .trim()
    .replace(/^(lightning|nostr):/i, '')
    .trim();
  if (isLightningAddress(value)) return { type: 'address', address: value.toLowerCase() };
  const url = decodeLnurl(value);
  if (url) return { type: 'lnurl', url };
  const profile = decodeProfile(value);
  return profile ? { type: 'pubkey', pubkey: profile.pubkey, relays: profile.relays } : undefined;
};

/** The Lightning of a Nostr profile: its `lud16`, else its `lud06` */
export const profileLightning = (profile?: {
  lud16?: string;
  lud06?: string;
}): LightningTarget | undefined => {
  const address = profile?.lud16?.trim();
  if (address && isLightningAddress(address))
    return { type: 'address', address: address.toLowerCase() };
  const url = profile?.lud06 ? decodeLnurl(profile.lud06) : undefined;
  return url ? { type: 'lnurl', url } : undefined;
};

/** The LNURL-pay URL of an address or LNURL target (a pubkey needs its profile first) */
export const payUrl = (target: LightningTarget): string | undefined => {
  if (target.type === 'address') return lightningAddressUrl(target.address);
  if (target.type === 'lnurl') return target.url;
  return undefined;
};

/**
 * A `lightning:` URI of an LNURL-pay URL, for a QR code any wallet can pay without an amount set
 * here (the wallet asks for it): `lightning:LNURL1…`
 */
export const payUri = (url: string): string => `lightning:${encodeLnurl(url)}`;

/** What a receiving service accepts (LUD-06), with its zap support (NIP-57) */
export interface PayParams {
  /** Where invoices are requested */
  callback: string;
  /** Range of amounts, in millisatoshis */
  minSendable: number;
  maxSendable: number;
  /** LUD-06 metadata, a JSON string (the invoice's description hash covers it) */
  metadata: string;
  /** Longest comment accepted (LUD-12); 0 for none */
  commentAllowed: number;
  /** The service makes zap receipts (NIP-57), signed by `nostrPubkey` */
  allowsNostr: boolean;
  nostrPubkey?: string;
}

const isHexKey = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

/** LNURL-pay parameters from a service's answer; errors for `status: ERROR` and bad answers */
export const parsePayParams = (json: unknown): Result<PayParams, LightningError> => {
  if (!json || typeof json !== 'object') return fail('bad-response', 'Not an LNURL-pay answer');
  const data = json as Record<string, unknown>;
  if (data.status === 'ERROR') {
    return fail('service', typeof data.reason === 'string' ? data.reason : 'The service refused');
  }
  const { callback, minSendable, maxSendable, metadata } = data;
  if (
    data.tag !== 'payRequest' ||
    typeof callback !== 'string' ||
    !/^https:\/\//i.test(callback) ||
    typeof minSendable !== 'number' ||
    typeof maxSendable !== 'number' ||
    minSendable > maxSendable
  ) {
    return fail('bad-response', 'Not an LNURL-pay answer');
  }
  const allowsNostr = data.allowsNostr === true && isHexKey(data.nostrPubkey);
  return {
    success: true,
    data: {
      callback,
      minSendable,
      maxSendable,
      metadata: typeof metadata === 'string' ? metadata : '[]',
      commentAllowed: typeof data.commentAllowed === 'number' ? data.commentAllowed : 0,
      allowsNostr,
      ...(allowsNostr ? { nostrPubkey: data.nostrPubkey as string } : {}),
    },
  };
};

/** `fetch` as JSON, for browsers and Node */
export const defaultFetchJson: FetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  return response.json();
};

const getJson = async (
  url: string,
  fetchJson: FetchJson
): Promise<Result<unknown, LightningError>> => {
  try {
    return { success: true, data: await fetchJson(url) };
  } catch {
    return fail('network', "Couldn't reach the Lightning service");
  }
};

/** The LNURL-pay parameters behind a URL */
export const fetchPayParams = async (
  url: string,
  fetchJson: FetchJson = defaultFetchJson
): Promise<Result<PayParams, LightningError>> => {
  const json = await getJson(url, fetchJson);
  return json.success ? parsePayParams(json.data) : json;
};

export interface InvoiceOptions {
  /** A comment for the payee (LUD-12), cut to what the service accepts */
  comment?: string;
  /** A signed NIP-57 zap request (kind 9734), for services that allow Nostr */
  zapRequest?: object;
  /** The payee's LNURL, as NIP-57 asks to send with a zap */
  lnurl?: string;
  fetchJson?: FetchJson;
}

/** A requested invoice (BOLT11), and its LUD-21 verify link if the service has one */
export interface Invoice {
  pr: string;
  verify?: string;
}

/** Whether an amount (millisatoshis) is one the service takes */
export const amountAllowed = (params: PayParams, amountMsat: number): boolean =>
  Number.isInteger(amountMsat) &&
  amountMsat >= params.minSendable &&
  amountMsat <= params.maxSendable;

/** The URL asking for an invoice: the callback with `amount`, and `comment`, `nostr`, `lnurl` */
export const invoiceUrl = (
  params: PayParams,
  amountMsat: number,
  options: InvoiceOptions = {}
): string => {
  const url = new URL(params.callback);
  url.searchParams.set('amount', String(amountMsat));
  const comment = options.comment?.trim().slice(0, params.commentAllowed);
  if (comment) url.searchParams.set('comment', comment);
  if (options.zapRequest && params.allowsNostr) {
    url.searchParams.set('nostr', JSON.stringify(options.zapRequest));
    if (options.lnurl) url.searchParams.set('lnurl', options.lnurl);
  }
  return url.toString();
};

/** An invoice for an amount (millisatoshis) from the service */
export const requestInvoice = async (
  params: PayParams,
  amountMsat: number,
  options: InvoiceOptions = {}
): Promise<Result<Invoice, LightningError>> => {
  if (!amountAllowed(params, amountMsat)) {
    return fail(
      'amount',
      `Amount must be ${Math.ceil(params.minSendable / 1000)}–${Math.floor(params.maxSendable / 1000)} sats`
    );
  }
  const json = await getJson(
    invoiceUrl(params, amountMsat, options),
    options.fetchJson ?? defaultFetchJson
  );
  if (!json.success) return json;
  const data = json.data as Record<string, unknown> | null;
  if (data?.status === 'ERROR') {
    return fail('service', typeof data.reason === 'string' ? data.reason : 'The service refused');
  }
  if (typeof data?.pr !== 'string' || !/^ln(bc|tb|bcrt)/i.test(data.pr)) {
    return fail('bad-response', 'The service sent no invoice');
  }
  return {
    success: true,
    data: {
      pr: data.pr,
      ...(typeof data.verify === 'string' && /^https:\/\//i.test(data.verify)
        ? { verify: data.verify }
        : {}),
    },
  };
};

/** Whether a LUD-21 verify link says the invoice was paid (`settled: true`) */
export const checkSettled = async (
  verify: string,
  fetchJson: FetchJson = defaultFetchJson
): Promise<boolean> => {
  const json = await getJson(verify, fetchJson);
  return json.success && (json.data as { settled?: unknown } | null)?.settled === true;
};
