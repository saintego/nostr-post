import { DEFAULT_LIGHTNING_MESSAGES, type LightningMessages } from './lightningMessages';

/**
 * User-facing text of the `payment` field's view and input and of <np-payment-qr>, with English
 * defaults (Lightning's own text is `LightningMessages`, which this includes). Apps override any
 * of it with the `messages` property (e.g. translations).
 */
export interface PaymentMessages extends LightningMessages {
  /** A method's name and the line under it, by method id (default: the method's own) */
  methods: Record<string, { name?: string; description?: string }>;
  /** Puts an amount in a static method's QR */
  qrAmount: string;
  /** Back to the QR without an amount */
  anyAmount: string;
  /** The input: what a box recognised, e.g. "₿ Bitcoin" */
  detected: (icon: string, name: string) => string;
  invalidPayment: string;
}

export const DEFAULT_PAYMENT_MESSAGES: PaymentMessages = {
  ...DEFAULT_LIGHTNING_MESSAGES,
  methods: {},
  qrAmount: 'Set an amount',
  anyAmount: 'Any amount',
  placeholder: 'name@wallet.com, npub1… or a Bitcoin address',
  detected: (icon, name) => `${icon} ${name}`,
  invalidPayment: 'Not a Lightning address, npub or Bitcoin address',
};
