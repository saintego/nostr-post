/**
 * User-facing text of <np-lightning> and the `lightning` field, with English defaults. Apps
 * override any of it with the `messages` property (e.g. translations).
 */
export interface LightningMessages {
  loading: string;
  retry: string;
  /** Amount buttons: "21 sats" */
  sats: (amount: number) => string;
  customAmount: string;
  /** The message box: public on a zap, a comment for the payee otherwise */
  message: string;
  /** Pay as a zap, with the payer's signer */
  asZap: string;
  /** Zaps are public */
  zapPublic: string;
  /** In a private chat, the receipt reveals who paid whom */
  zapPrivateContext: string;
  /** The payee's service allows zaps but there's no signer */
  zapNeedsSigner: string;
  zapButton: (amount: number) => string;
  invoiceButton: (amount: number) => string;
  requesting: string;
  payWithWallet: string;
  paying: string;
  waiting: string;
  /** A zap receipt arrived */
  zapReceived: string;
  /** The invoice was paid (wallet or verify link) */
  paid: string;
  newPayment: string;
  /** The amount is outside what the service takes */
  amountRange: (min: number, max: number) => string;
  /** The input's placeholder */
  placeholder: string;
  add: string;
  remove: string;
  invalidTarget: string;
}

export const DEFAULT_LIGHTNING_MESSAGES: LightningMessages = {
  loading: 'Loading…',
  retry: 'Try again',
  sats: (amount) => `${amount.toLocaleString()} sats`,
  customAmount: 'Other amount',
  message: 'Message (optional)',
  asZap: 'Send as a zap',
  zapPublic: 'Zaps are public: anyone can see who zapped whom, how much and the message.',
  zapPrivateContext:
    'This is a private conversation, but a zap is not: its receipt on relays shows who paid whom.',
  zapNeedsSigner: 'Sign in with Nostr to send a zap, or pay without one.',
  zapButton: (amount) => `⚡ Zap ${amount.toLocaleString()} sats`,
  invoiceButton: (amount) => `⚡ Pay ${amount.toLocaleString()} sats`,
  requesting: 'Getting the invoice…',
  payWithWallet: 'Pay with browser wallet',
  paying: 'Paying…',
  waiting: 'Waiting for the payment…',
  zapReceived: 'Zap received. Thank you!',
  paid: 'Paid. Thank you!',
  newPayment: 'Another amount',
  amountRange: (min, max) => `Amount must be ${min.toLocaleString()}–${max.toLocaleString()} sats`,
  placeholder: 'name@wallet.com or npub1…',
  add: 'Add',
  remove: 'Remove',
  invalidTarget: 'Not a Lightning address, LNURL or npub',
};
