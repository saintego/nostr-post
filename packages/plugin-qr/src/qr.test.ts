import { describe, expect, it } from 'vitest';
import { qrPlugin, qrTexts } from './core';
import { isQrPayload, qrMatrix, qrScheme, qrSvg } from './qr';

const field = {
  id: 'pay',
  type: 'string',
  uiPlugin: 'qr',
  mapTo: { kind: 1, target: 'tag', tagName: 'pay' },
} as const;

describe('isQrPayload', () => {
  it('accepts the payment and share schemes in any case', () => {
    expect(isQrPayload('lightning:lnbc10n1abc')).toBe(true);
    expect(isQrPayload('LIGHTNING:LNBC10N1ABC')).toBe(true);
    expect(isQrPayload('bitcoin:bc1qxyz?amount=0.001')).toBe(true);
    expect(isQrPayload('nostr:npub1abc')).toBe(true);
    expect(isQrPayload('https://example.com/pay')).toBe(true);
  });

  it('rejects other text and bare schemes', () => {
    expect(isQrPayload('http://example.com')).toBe(false);
    expect(isQrPayload('javascript:alert(1)')).toBe(false);
    expect(isQrPayload('lnbc10n1abc')).toBe(false);
    expect(isQrPayload('lightning:')).toBe(false);
  });

  it('names the scheme in lower case', () => {
    expect(qrScheme(' Bitcoin:bc1q ')).toBe('bitcoin:');
  });
});

describe('qrSvg', () => {
  it('makes a square SVG with one path on a light background', () => {
    const svg = qrSvg('lightning:lnbc10n1abc', { label: 'Pay "me" <now>' });
    expect(svg.success).toBe(true);
    if (!svg.success) return;
    const matrix = qrMatrix('lightning:lnbc10n1abc');
    const size = matrix.success ? matrix.data.size : 0;
    expect(svg.data).toContain(`viewBox="0 0 ${size} ${size}"`);
    expect(svg.data.match(/<path/g)).toHaveLength(1);
    expect(svg.data).toContain('fill="#fff"');
    expect(svg.data).toContain('aria-label="Pay &#34;me&#34; &#60;now&#62;"');
  });

  it('puts a border of light modules around the code', () => {
    const plain = qrMatrix('nostr:npub1abc', { border: 0 });
    const framed = qrMatrix('nostr:npub1abc', { border: 2 });
    if (!plain.success || !framed.success) throw new Error('not encoded');
    expect(framed.data.size).toBe(plain.data.size + 4);
    expect(framed.data.data[0]?.every((dark) => !dark)).toBe(true);
  });

  it('fails for empty and too long text', () => {
    expect(qrSvg('')).toMatchObject({ success: false, error: { code: 'empty' } });
    expect(qrSvg('x'.repeat(5000))).toMatchObject({ success: false, error: { code: 'too-long' } });
  });
});

describe('qrPlugin', () => {
  it('validates one text or a list that fits', () => {
    expect(qrPlugin.validate?.('bitcoin:bc1q', field).success).toBe(true);
    expect(qrPlugin.validate?.(['bitcoin:bc1q', 'nostr:npub1'], field).success).toBe(true);
    expect(qrPlugin.validate?.(['x'.repeat(5000)], field)).toMatchObject({
      success: false,
      error: { code: 'TOO_LONG' },
    });
    expect(qrPlugin.validate?.(42, field).success).toBe(false);
  });

  it('reads the texts of a value', () => {
    expect(qrTexts(['a', '', ' ', 'b'])).toEqual(['a', 'b']);
    expect(qrTexts('a')).toEqual(['a']);
    expect(qrTexts(undefined)).toEqual([]);
  });
});
