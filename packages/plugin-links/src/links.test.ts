import { describe, expect, it } from 'vitest';
import { linksPlugin } from './core';
import {
  bitcoinAddress,
  checkSupportLink,
  linkHost,
  parseSupportLink,
  supportLinks,
  supportSite,
} from './links';

// BIP-173 (segwit v0) and BIP-350 (taproot) examples, and the genesis block's address
const SEGWIT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const TAPROOT = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
const LEGACY = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';

const field = {
  id: 'links',
  type: 'object',
  uiPlugin: 'links',
  mapTo: { kind: 30078, target: 'content', path: 'links' },
} as const;

describe('bitcoinAddress', () => {
  it('accepts segwit, taproot and legacy addresses', () => {
    expect(bitcoinAddress(SEGWIT)).toBe(SEGWIT);
    expect(bitcoinAddress(SEGWIT.toUpperCase())).toBe(SEGWIT.toUpperCase());
    expect(bitcoinAddress(TAPROOT)).toBe(TAPROOT);
    expect(bitcoinAddress(LEGACY)).toBe(LEGACY);
  });

  it('reads the address of a bitcoin: URI', () => {
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
    expect(bitcoinAddress('')).toBeUndefined();
  });
});

describe('support links', () => {
  it('knows tip sites by host and by GitHub Sponsors path', () => {
    expect(supportSite('https://www.buymeacoffee.com/alice')?.label).toBe('Buy Me a Coffee');
    expect(supportSite('https://github.com/sponsors/alice')?.label).toBe('GitHub Sponsors');
    expect(supportSite('https://coff.ee/alice')?.label).toBe('Buy Me a Coffee');
    expect(supportSite('https://github.com/alice')).toBeUndefined();
    expect(
      supportSite('https://example.com/tip', { 'example.com': { label: 'Ex', icon: '🍺' } })
    ).toEqual({
      label: 'Ex',
      icon: '🍺',
    });
    expect(linkHost('https://www.ko-fi.com/alice')).toBe('ko-fi.com');
  });

  it('allows only https links', () => {
    expect(checkSupportLink({ type: 'link', value: 'https://ko-fi.com/a' }).success).toBe(true);
    for (const value of ['http://ko-fi.com/a', 'javascript:alert(1)', 'ko-fi.com/a']) {
      expect(checkSupportLink({ type: 'link', value })).toMatchObject({
        success: false,
        error: { code: 'not-https' },
      });
    }
  });

  it('keeps the address of a bitcoin: URI and trims notes', () => {
    expect(checkSupportLink({ type: 'bitcoin', value: `bitcoin:${SEGWIT}` })).toEqual({
      success: true,
      data: { type: 'bitcoin', value: SEGWIT },
    });
    expect(checkSupportLink({ type: 'note', value: '  IBAN on request ' })).toMatchObject({
      success: true,
      data: { value: 'IBAN on request' },
    });
    expect(checkSupportLink({ type: 'note', value: ' ' }).success).toBe(false);
  });

  it('reads stored entries: objects, their JSON and plain links; drops invalid ones', () => {
    expect(parseSupportLink('{"type":"note","value":"Hi","label":" "}')).toEqual({
      type: 'note',
      value: 'Hi',
    });
    expect(parseSupportLink('https://ko-fi.com/a')).toEqual({
      type: 'link',
      value: 'https://ko-fi.com/a',
    });
    expect(parseSupportLink({ type: 'email', value: 'a@b' })).toBeUndefined();
    expect(
      supportLinks([
        { type: 'link', value: 'https://ko-fi.com/a', label: 'Coffee' },
        { type: 'link', value: 'http://insecure.example' },
        { type: 'bitcoin', value: LEGACY },
      ])
    ).toEqual([
      { type: 'link', value: 'https://ko-fi.com/a', label: 'Coffee' },
      { type: 'bitcoin', value: LEGACY },
    ]);
  });
});

describe('linksPlugin', () => {
  it('names the first invalid entry', () => {
    expect(linksPlugin.validate?.([{ type: 'bitcoin', value: LEGACY }], field).success).toBe(true);
    expect(
      linksPlugin.validate?.(
        [
          { type: 'bitcoin', value: LEGACY },
          { type: 'link', value: 'http://a.b' },
        ],
        field
      )
    ).toMatchObject({ success: false, error: { message: 'Entry 2: Only https:// links' } });
  });

  it('stores one entry per tag as JSON', () => {
    const entry = { type: 'link', value: 'https://ko-fi.com/a' };
    const raw = linksPlugin.serializeValue?.(entry, field) ?? '';
    expect(linksPlugin.deserializeValue?.(raw, field)).toEqual(entry);
  });
});
