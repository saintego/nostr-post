/**
 * @nostr-post/plugin-payment - On-chain Bitcoin
 *
 * An on-chain address, bare or as a `bitcoin:` URI: segwit and taproot (`bc1…`) checked fully
 * (bech32 / bech32m checksum), legacy (`1…`, `3…`) by their format. Its QR payload is a BIP-21
 * `bitcoin:` URI, with the amount when the payer sets one.
 */

import type { PaymentMethod } from './methods';

const BECH32_CHARS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

const polymod = (values: number[]): number => {
  const gen = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    gen.forEach((g, i) => {
      if ((top >>> i) & 1) chk ^= g;
    });
  }
  return chk >>> 0;
};

/** Whether a `bc1…` / `tb1…` address has a valid bech32 (v0) or bech32m (v1+) checksum */
const validSegwit = (address: string): boolean => {
  const lower = address.toLowerCase();
  if (lower !== address && address.toUpperCase() !== address) return false;
  const sep = lower.lastIndexOf('1');
  const hrp = lower.slice(0, sep);
  if (hrp !== 'bc' && hrp !== 'tb') return false;
  const data = [...lower.slice(sep + 1)].map((c) => BECH32_CHARS.indexOf(c));
  if (data.length < 8 || data.some((d) => d < 0)) return false;
  const expanded = [
    ...[...hrp].map((c) => c.charCodeAt(0) >> 5),
    0,
    ...[...hrp].map((c) => c.charCodeAt(0) & 31),
  ];
  const check = polymod([...expanded, ...data]);
  const version = data[0];
  return version === 0 ? check === BECH32_CONST : check === BECH32M_CONST;
};

/** Legacy (`1…`) and script (`3…`) addresses and their testnet forms: format only, no checksum */
const BASE58_ADDRESS = /^[13mn2][1-9A-HJ-NP-Za-km-z]{25,34}$/;

/**
 * A Bitcoin address from text: the address itself or a `bitcoin:` URI (its address, without the
 * amount or other parameters). Segwit addresses (`bc1…`) are checked fully (checksum), legacy
 * ones by their format. Undefined for anything else.
 */
export const bitcoinAddress = (text: string): string | undefined => {
  const bare = text
    .trim()
    .replace(/^bitcoin:/i, '')
    .split('?')[0];
  if (!bare) return undefined;
  if (/^(bc|tb)1/i.test(bare)) return validSegwit(bare) ? bare : undefined;
  return BASE58_ADDRESS.test(bare) ? bare : undefined;
};

/** BTC amount of sats as BIP-21 writes it: up to 8 decimals, no trailing zeros */
export const btcAmount = (sats: number): string =>
  (sats / 100_000_000).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');

/** The BIP-21 URI of an address, with an amount in sats if given */
export const bitcoinUri = (address: string, amountSats?: number): string =>
  amountSats && amountSats > 0
    ? `bitcoin:${address}?amount=${btcAmount(amountSats)}`
    : `bitcoin:${address}`;

/** On-chain Bitcoin as a payment method: stored as `bitcoin:<address>` */
export const bitcoinMethod: PaymentMethod = {
  id: 'bitcoin',
  name: 'Bitcoin',
  icon: '₿',
  description: 'On-chain payment',
  detect: (text) => {
    const address = bitcoinAddress(text);
    return address ? `bitcoin:${address}` : undefined;
  },
  display: (value) => bitcoinAddress(value) ?? value,
  qr: (value, amountSats) => {
    const address = bitcoinAddress(value);
    return address ? bitcoinUri(address, amountSats) : undefined;
  },
};
