/**
 * @nostr-post/plugin-qr - QR codes as SVG
 *
 * `qrSvg(text)` encodes text (a `lightning:` invoice, a `bitcoin:` address, a `nostr:` link, a web
 * link) as a QR code in an SVG string: made locally, no requests, no DOM.
 */

import type { Result } from '@nostr-post/plugins/types';
import { encode } from 'uqr';

/** The URI schemes QR codes here are meant for (wallets and Nostr apps open them when scanned) */
export const QR_SCHEMES = ['lightning:', 'bitcoin:', 'nostr:', 'https:'] as const;

export type QrScheme = (typeof QR_SCHEMES)[number];

/** Whether text is a URI with one of `QR_SCHEMES` (any letter case), e.g. `lightning:lnbc1…` */
export const isQrPayload = (text: string): boolean => qrScheme(text) !== undefined;

/** The text's scheme among `QR_SCHEMES`, in lower case; undefined for other text */
export const qrScheme = (text: string): QrScheme | undefined => {
  const lower = text.trim().toLowerCase();
  return QR_SCHEMES.find((scheme) => lower.startsWith(scheme) && lower.length > scheme.length);
};

export interface QrSvgOptions {
  /** Error correction: `L` (7%), `M` (15%, default), `Q` (25%), `H` (30%) */
  ecc?: 'L' | 'M' | 'Q' | 'H';
  /** Light modules around the code, in modules (default 2; scanners want some) */
  border?: number;
  /** The image's accessible name (`aria-label`) */
  label?: string;
  /** Color of the dark modules (default black: QR codes scan best dark on light) */
  dark?: string;
  /** Color of the background (default white) */
  light?: string;
}

export interface QrError {
  /** `empty`: no text; `too-long`: more than a QR code holds */
  code: 'empty' | 'too-long';
  message: string;
}

/** A QR code's modules: `size` × `size`, `true` for dark */
export interface QrMatrix {
  size: number;
  data: boolean[][];
}

const escapeXml = (text: string): string =>
  text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The QR code of text as a matrix of modules, with `border` light modules around it */
export const qrMatrix = (
  text: string,
  options: Pick<QrSvgOptions, 'ecc' | 'border'> = {}
): Result<QrMatrix, QrError> => {
  if (!text) return { success: false, error: { code: 'empty', message: 'Nothing to encode' } };
  try {
    const { size, data } = encode(text, { ecc: options.ecc ?? 'M', border: options.border ?? 2 });
    return { success: true, data: { size, data } };
  } catch {
    return {
      success: false,
      error: { code: 'too-long', message: 'Too long for a QR code' },
    };
  }
};

/**
 * The QR code of text as an SVG string: one path for the dark modules on a light square, scaled to
 * any size (`viewBox` in modules, `shape-rendering="crispEdges"`)
 */
export const qrSvg = (text: string, options: QrSvgOptions = {}): Result<string, QrError> => {
  const matrix = qrMatrix(text, options);
  if (!matrix.success) return matrix;
  const { size, data } = matrix.data;
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
    .join('');
  const label = options.label ? ` role="img" aria-label="${escapeXml(options.label)}"` : '';
  const light = escapeXml(options.light ?? '#fff');
  const dark = escapeXml(options.dark ?? '#000');
  return {
    success: true,
    data:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"${label}>` +
      `<rect width="${size}" height="${size}" fill="${light}"/><path fill="${dark}" d="${path}"/></svg>`,
  };
};
