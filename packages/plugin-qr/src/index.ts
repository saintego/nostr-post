/**
 * @nostr-post/plugin-qr - Core entrypoint
 *
 * Import this for QR codes without a UI (`qrSvg`, `qrMatrix`, `isQrPayload`) and the field plugin.
 * Import '@nostr-post/plugin-qr/web' for <np-qr> and the field's input and view.
 */
export { qrPlugin, qrTexts } from './core';
export {
  isQrPayload,
  QR_SCHEMES,
  type QrError,
  type QrMatrix,
  type QrScheme,
  type QrSvgOptions,
  qrMatrix,
  qrScheme,
  qrSvg,
} from './qr';
