/**
 * User-facing text of <np-qr> and the QR field's input, with English defaults. Apps override any
 * of it with the `messages` property (e.g. translations).
 */
export interface QrMessages {
  /** The image's accessible name */
  qrCode: string;
  /** Opens the code large, for scanning */
  fullScreen: string;
  /** Opens a `lightning:`, `bitcoin:` or `nostr:` URI in the app that handles it (a wallet) */
  openInApp: string;
  /** Opens an `https:` link */
  openLink: string;
  tooLong: string;
  /** The input's placeholder */
  placeholder: string;
  add: string;
  remove: string;
}

export const DEFAULT_QR_MESSAGES: QrMessages = {
  qrCode: 'QR code',
  fullScreen: 'Show the QR code full screen',
  openInApp: 'Open in wallet',
  openLink: 'Open link',
  tooLong: 'Too long for a QR code',
  placeholder: 'lightning:…, bitcoin:…, nostr:… or https://…',
  add: 'Add',
  remove: 'Remove',
};
