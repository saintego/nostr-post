/**
 * @nostr-post/plugin-payment - Payment methods
 *
 * A registry of ways to pay. Each method recognises its own form of a value (`detect`, also
 * without a scheme: a bare Bitcoin address, a Lightning address), says how it is stored and shown,
 * and, for static methods, the QR payload (`qr`, with an amount when the method takes one).
 * Lightning is dynamic: its component asks for invoices and zaps. Apps add methods with
 * `registerPaymentMethod` (e.g. Czech QR payments, SEPA EPC QR, Monero); `detectPayment` tries
 * them in order, so the first that recognises a value takes it.
 */

import { bitcoinMethod } from './bitcoin';
import { lightningMethod } from './lightningMethod';

export interface PaymentMethod {
  id: string;
  /** Default name, icon and line under it (messages may replace them by id) */
  name: string;
  icon: string;
  description: string;
  /** The stored form of text this method recognises (e.g. `bitcoin:<address>`), else undefined */
  detect: (text: string) => string | undefined;
  /** How a stored value shows and copies (e.g. the bare address) */
  display?: (value: string) => string;
  /** A static method's QR payload, with an amount in sats if the payer set one */
  qr?: (value: string, amountSats?: number) => string | undefined;
  /** Paid through its own flow (Lightning: invoices, zaps), not a static QR */
  dynamic?: boolean;
}

/** A value and the method that recognised it */
export interface DetectedPayment {
  method: PaymentMethod;
  /** The stored form */
  value: string;
}

let methods: PaymentMethod[] = [lightningMethod, bitcoinMethod];

/** Adds a method (`first`: tried before the others); one with the same id is replaced */
export function registerPaymentMethod(method: PaymentMethod, { first = false } = {}): void {
  const others = methods.filter((m) => m.id !== method.id);
  methods = first ? [method, ...others] : [...others, method];
}

/** The methods, in the order they are tried */
export const paymentMethods = (): readonly PaymentMethod[] => methods;

/** The first method that recognises text, and the value's stored form */
export const detectPayment = (text: string): DetectedPayment | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  for (const method of methods) {
    const value = method.detect(trimmed);
    if (value) return { method, value };
  }
  return undefined;
};
