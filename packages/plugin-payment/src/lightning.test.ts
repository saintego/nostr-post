import { encodeLnurl, encodeNpub } from '@nostr-post/core/nip19';
import { describe, expect, it } from 'vitest';
import { paymentPlugin, presetAmounts } from './core';
import {
  invoiceUrl,
  lightningAddressUrl,
  type PayParams,
  parseLightningTarget,
  parsePayParams,
  profileLightning,
  requestInvoice,
} from './lnurl';
import { findZapReceipt, type PayDeps, requestPayment, resolvePayee } from './pay';
import { bolt11AmountMsat, buildZapRequest, isZapReceiptFor, type NostrEventLike } from './zap';

const PAYEE = 'a'.repeat(64);
const PAYER = 'b'.repeat(64);
const SERVICE = 'c'.repeat(64);
const INVOICE = 'lnbc210n1pexample0qqqqq';

const params: PayParams = {
  callback: 'https://getalby.com/lnurlp/alice/callback',
  minSendable: 1000,
  maxSendable: 100_000_000,
  metadata: '[["text/plain","Alice"]]',
  commentAllowed: 100,
  allowsNostr: true,
  nostrPubkey: SERVICE,
};

const field = {
  id: 'ln',
  type: 'string',
  uiPlugin: 'payment',
  mapTo: { kind: 1, target: 'tag', tagName: 'ln' },
} as const;

/** Fake deps: a service answering for alice@getalby.com, a profile, a signer and receipts */
const fakeDeps = (receipts: NostrEventLike[] = []): PayDeps & { urls: string[] } => {
  const urls: string[] = [];
  return {
    urls,
    fetchJson: async (url) => {
      urls.push(url);
      if (url === 'https://getalby.com/.well-known/lnurlp/alice') {
        return { tag: 'payRequest', ...params };
      }
      if (url.startsWith(params.callback))
        return { pr: INVOICE, verify: 'https://getalby.com/verify/1' };
      throw new Error('offline');
    },
    fetchProfile: async (pubkey) => (pubkey === PAYEE ? { lud16: 'Alice@GetAlby.com' } : undefined),
    userRelays: async () => ['wss://relay.one', 'wss://relay.two'],
    signEvent: async (event) => ({
      ...(event as Omit<NostrEventLike, 'id' | 'pubkey'>),
      id: 'zr1',
      pubkey: PAYER,
    }),
    fetchReceipts: async () => receipts,
  };
};

describe('targets', () => {
  it('reads Lightning addresses, LNURLs and npubs', () => {
    expect(parseLightningTarget('lightning:Alice@GetAlby.com')).toEqual({
      type: 'address',
      address: 'alice@getalby.com',
    });
    expect(parseLightningTarget(encodeLnurl('https://example.com/lnurlp/x'))).toEqual({
      type: 'lnurl',
      url: 'https://example.com/lnurlp/x',
    });
    expect(parseLightningTarget(`nostr:${encodeNpub(PAYEE)}`)).toEqual({
      type: 'pubkey',
      pubkey: PAYEE,
      relays: [],
    });
    expect(parseLightningTarget('alice')).toBeUndefined();
    expect(parseLightningTarget('alice@localhost')).toBeUndefined();
  });

  it('builds the LNURL-pay URL of an address', () => {
    expect(lightningAddressUrl('alice@getalby.com')).toBe(
      'https://getalby.com/.well-known/lnurlp/alice'
    );
  });

  it("takes a profile's lud16 before its lud06", () => {
    const lud06 = encodeLnurl('https://example.com/pay');
    expect(profileLightning({ lud16: 'a@b.com', lud06 })).toEqual({
      type: 'address',
      address: 'a@b.com',
    });
    expect(profileLightning({ lud06 })).toEqual({ type: 'lnurl', url: 'https://example.com/pay' });
    expect(profileLightning({})).toBeUndefined();
  });
});

describe('LNURL-pay', () => {
  it('parses parameters; zaps only with a valid nostrPubkey', () => {
    expect(parsePayParams({ tag: 'payRequest', ...params })).toEqual({
      success: true,
      data: params,
    });
    const noKey = parsePayParams({ tag: 'payRequest', ...params, nostrPubkey: 'nope' });
    expect(noKey.success && noKey.data.allowsNostr).toBe(false);
    expect(parsePayParams({ status: 'ERROR', reason: 'Unknown user' })).toMatchObject({
      success: false,
      error: { code: 'service', message: 'Unknown user' },
    });
    expect(parsePayParams({ tag: 'withdrawRequest' }).success).toBe(false);
    expect(
      parsePayParams({ tag: 'payRequest', ...params, callback: 'http://insecure' }).success
    ).toBe(false);
  });

  it('asks for an invoice with the amount, a cut comment, and a zap request', () => {
    const url = new URL(
      invoiceUrl({ ...params, commentAllowed: 5 }, 21_000, { comment: 'thanks a lot' })
    );
    expect(url.searchParams.get('amount')).toBe('21000');
    expect(url.searchParams.get('comment')).toBe('thank');
    const zap = new URL(
      invoiceUrl(params, 21_000, { zapRequest: { kind: 9734 }, lnurl: 'LNURL1X' })
    );
    expect(zap.searchParams.get('nostr')).toBe('{"kind":9734}');
    expect(zap.searchParams.get('lnurl')).toBe('LNURL1X');
  });

  it('rejects amounts outside the range before asking', async () => {
    expect(await requestInvoice(params, 500)).toMatchObject({
      success: false,
      error: { code: 'amount' },
    });
  });

  it('reports a network failure and an answer without an invoice', async () => {
    const offline = await requestInvoice(params, 21_000, {
      fetchJson: async () => {
        throw new Error('offline');
      },
    });
    expect(offline).toMatchObject({ success: false, error: { code: 'network' } });
    const empty = await requestInvoice(params, 21_000, { fetchJson: async () => ({}) });
    expect(empty).toMatchObject({ success: false, error: { code: 'bad-response' } });
  });
});

describe('zaps', () => {
  it('builds a zap request with the payee, amount, relays and lnurl', () => {
    const request = buildZapRequest({
      recipient: PAYEE,
      amountMsat: 21_000,
      relays: ['wss://r'],
      lnurl: 'LNURL1X',
      content: 'Great work',
      address: `30078:${PAYEE}:nostr-post-support`,
      createdAt: 1,
    });
    expect(request).toEqual({
      kind: 9734,
      created_at: 1,
      content: 'Great work',
      tags: [
        ['relays', 'wss://r'],
        ['amount', '21000'],
        ['lnurl', 'LNURL1X'],
        ['p', PAYEE],
        ['a', `30078:${PAYEE}:nostr-post-support`],
      ],
    });
  });

  it('reads the amount of a BOLT11 invoice', () => {
    expect(bolt11AmountMsat('lnbc2500u1pvjluez')).toBe(250_000_000);
    expect(bolt11AmountMsat('LIGHTNING:LNBC210N1PEXAMPLE')).toBe(21_000);
    expect(bolt11AmountMsat('lnbc10p1pexample')).toBe(1);
    expect(bolt11AmountMsat('lnbc1pvjluez')).toBeUndefined();
    expect(bolt11AmountMsat('hello')).toBeUndefined();
  });

  const request = {
    id: 'zr1',
    pubkey: PAYER,
    kind: 9734,
    created_at: 1,
    content: '',
    tags: [['amount', '21000']],
  };
  const receipt = (changes: Partial<NostrEventLike> = {}, tags?: string[][]): NostrEventLike => ({
    id: 'r1',
    pubkey: SERVICE,
    kind: 9735,
    created_at: 2,
    content: '',
    tags: tags ?? [
      ['p', PAYEE],
      ['bolt11', INVOICE],
      ['description', JSON.stringify(request)],
    ],
    ...changes,
  });
  const check = { recipient: PAYEE, nostrPubkey: SERVICE, invoice: INVOICE, zapRequestId: 'zr1' };

  it('accepts the receipt of the payment', () => {
    expect(isZapReceiptFor(receipt(), check)).toBe(true);
  });

  it('rejects receipts from another signer, payee, invoice, request or amount', () => {
    expect(isZapReceiptFor(receipt({ pubkey: PAYER }), check)).toBe(false);
    expect(isZapReceiptFor(receipt(), { ...check, recipient: PAYER })).toBe(false);
    expect(isZapReceiptFor(receipt(), { ...check, invoice: 'lnbc1other' })).toBe(false);
    expect(isZapReceiptFor(receipt(), { ...check, zapRequestId: 'other' })).toBe(false);
    const wrongAmount = receipt({}, [
      ['p', PAYEE],
      ['bolt11', 'lnbc1u1pexample'],
      ['description', JSON.stringify(request)],
    ]);
    expect(isZapReceiptFor(wrongAmount, { ...check, invoice: undefined })).toBe(false);
    expect(
      isZapReceiptFor(
        receipt({}, [
          ['p', PAYEE],
          ['description', 'not json'],
        ]),
        check
      )
    ).toBe(false);
  });
});

describe('paying', () => {
  it("pays an npub through its profile's Lightning address, as a zap", async () => {
    const deps = fakeDeps();
    const payee = await resolvePayee(encodeNpub(PAYEE) ?? '', undefined, deps);
    expect(payee).toMatchObject({
      success: true,
      data: { pubkey: PAYEE, url: 'https://getalby.com/.well-known/lnurlp/alice' },
    });
    if (!payee.success) return;
    const payment = await requestPayment(
      payee.data,
      { amountSats: 21, comment: 'Hi', zap: true },
      deps
    );
    expect(payment).toMatchObject({
      success: true,
      data: { pr: INVOICE, amountMsat: 21_000, relays: ['wss://relay.one', 'wss://relay.two'] },
    });
    const asked = new URL(deps.urls.at(-1) ?? '');
    const zap = JSON.parse(asked.searchParams.get('nostr') ?? '{}');
    expect(zap).toMatchObject({ kind: 9734, content: 'Hi', pubkey: PAYER });
    expect(asked.searchParams.get('comment')).toBeNull();
  });

  it('makes a plain invoice for an address without a known owner', async () => {
    const deps = fakeDeps();
    const payee = await resolvePayee('alice@getalby.com', undefined, deps);
    if (!payee.success) throw new Error('not resolved');
    const payment = await requestPayment(
      payee.data,
      { amountSats: 21, comment: 'Hi', zap: true },
      deps
    );
    expect(payment.success && payment.data.zapRequest).toBeUndefined();
    expect(new URL(deps.urls.at(-1) ?? '').searchParams.get('comment')).toBe('Hi');
  });

  it('says so when a profile has no Lightning', async () => {
    const other = 'd'.repeat(64);
    expect(await resolvePayee(encodeNpub(other) ?? '', undefined, fakeDeps())).toMatchObject({
      success: false,
      error: { code: 'no-lightning' },
    });
  });

  it("finds the payment's zap receipt", async () => {
    const deps = fakeDeps();
    const payee = await resolvePayee('alice@getalby.com', PAYEE, deps);
    if (!payee.success) throw new Error('not resolved');
    const payment = await requestPayment(payee.data, { amountSats: 21, zap: true }, deps);
    if (!payment.success) throw new Error('no invoice');
    const description = JSON.stringify(payment.data.zapRequest);
    const receipt = {
      id: 'r1',
      pubkey: SERVICE,
      kind: 9735,
      created_at: 2,
      content: '',
      tags: [
        ['p', PAYEE],
        ['bolt11', INVOICE],
        ['description', description],
      ],
    };
    expect(await findZapReceipt(payee.data, payment.data, fakeDeps([]))).toBeUndefined();
    expect(await findZapReceipt(payee.data, payment.data, fakeDeps([receipt]))).toEqual(receipt);
  });
});

describe('paymentPlugin', () => {
  it('validates payees and reads preset amounts', () => {
    expect(paymentPlugin.validate?.(['alice@getalby.com', encodeNpub(PAYEE)], field).success).toBe(
      true
    );
    expect(paymentPlugin.validate?.('alice', field).success).toBe(false);
    expect(presetAmounts({ ...field, metadata: { amounts: [10, -1, 2.5, 50] } })).toEqual([10, 50]);
    expect(presetAmounts(field)).toEqual([21, 100, 1000, 5000]);
  });
});
