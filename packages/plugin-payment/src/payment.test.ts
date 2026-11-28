import { encodeNpub } from '@nostr-post/core/nip19';
import { describe, expect, it } from 'vitest';
import { bitcoinAddress, bitcoinUri, btcAmount } from './bitcoin';
import { paymentPlugin } from './core';
import {
  detectPayment,
  type PaymentMethod,
  paymentMethods,
  registerPaymentMethod,
} from './methods';

// BIP-173 (segwit v0) and BIP-350 (taproot) examples, and the genesis block's address
const SEGWIT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const TAPROOT = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
const LEGACY = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

const field = {
  id: 'pay',
  type: 'string',
  uiPlugin: 'payment',
  mapTo: { kind: 30078, target: 'content', path: 'pay' },
} as const;

describe('bitcoinAddress', () => {
  it('accepts segwit, taproot and legacy addresses, bare or as a bitcoin: URI', () => {
    expect(bitcoinAddress(SEGWIT)).toBe(SEGWIT);
    expect(bitcoinAddress(SEGWIT.toUpperCase())).toBe(SEGWIT.toUpperCase());
    expect(bitcoinAddress(TAPROOT)).toBe(TAPROOT);
    expect(bitcoinAddress(LEGACY)).toBe(LEGACY);
    expect(bitcoinAddress(`bitcoin:${SEGWIT}?amount=0.001&label=Tip`)).toBe(SEGWIT);
  });

  it('rejects a wrong checksum, mixed case and other text', () => {
    expect(bitcoinAddress(`${SEGWIT.slice(0, -1)}5`)).toBeUndefined();
    expect(
      bitcoinAddress(`${SEGWIT.slice(0, 10).toUpperCase()}${SEGWIT.slice(10)}`)
    ).toBeUndefined();
    // A v1 address with a v0 (bech32) checksum
    expect(
      bitcoinAddress('bc1pw508d6qejxtdg4y5r3zarvary0c5xw7kw508d6qejxtdg4y5r3zarvary0c5xw7k7grplx')
    ).toBeUndefined();
    expect(bitcoinAddress('hello')).toBeUndefined();
  });

  it('writes BIP-21 URIs with an amount in BTC', () => {
    expect(btcAmount(21)).toBe('0.00000021');
    expect(btcAmount(100_000_000)).toBe('1');
    expect(bitcoinUri(SEGWIT)).toBe(`bitcoin:${SEGWIT}`);
    expect(bitcoinUri(SEGWIT, 5000)).toBe(`bitcoin:${SEGWIT}?amount=0.00005`);
  });
});

describe('detectPayment', () => {
  it('recognises values without a scheme and stores them in their method form', () => {
    expect(detectPayment(SEGWIT)).toMatchObject({
      method: { id: 'bitcoin' },
      value: `bitcoin:${SEGWIT}`,
    });
    expect(detectPayment('Alice@GetAlby.com')).toMatchObject({
      method: { id: 'lightning' },
      value: 'alice@getalby.com',
    });
    const npub = encodeNpub('a'.repeat(64)) ?? '';
    expect(detectPayment(`nostr:${npub}`)).toMatchObject({
      method: { id: 'lightning' },
      value: npub,
    });
    expect(detectPayment('hello')).toBeUndefined();
    expect(detectPayment(' ')).toBeUndefined();
  });

  it('gives the static QR of a value, with an amount', () => {
    const detected = detectPayment(SEGWIT);
    expect(detected?.method.qr?.(detected.value, 21)).toBe(`bitcoin:${SEGWIT}?amount=0.00000021`);
    expect(detected?.method.display?.(detected.value)).toBe(SEGWIT);
  });

  it('takes methods apps register, first or last', () => {
    const iban: PaymentMethod = {
      id: 'test-iban',
      name: 'Bank transfer',
      icon: '🏦',
      description: 'IBAN',
      detect: (text) =>
        /^CZ\d{22}$/.test(text.replace(/\s/g, '')) ? text.replace(/\s/g, '') : undefined,
      qr: (value, amount) => `SPD*1.0*ACC:${value}${amount ? `*AM:${amount}` : ''}`,
    };
    registerPaymentMethod(iban);
    expect(paymentMethods().at(-1)?.id).toBe('test-iban');
    expect(detectPayment('CZ65 0800 0000 1920 0014 5399')).toMatchObject({
      method: { id: 'test-iban' },
      value: 'CZ6508000000192000145399',
    });
    registerPaymentMethod(iban, { first: true });
    expect(paymentMethods()[0]?.id).toBe('test-iban');
    expect(paymentMethods().filter((m) => m.id === 'test-iban')).toHaveLength(1);
  });
});

describe('paymentPlugin', () => {
  it('validates values any method recognises', () => {
    expect(paymentPlugin.validate?.([SEGWIT, 'alice@getalby.com'], field).success).toBe(true);
    expect(paymentPlugin.validate?.(['alice'], field).success).toBe(false);
  });
});
