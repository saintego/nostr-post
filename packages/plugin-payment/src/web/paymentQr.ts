/**
 * <np-payment-qr>: a static way to pay (on-chain Bitcoin, or a method an app registered) as a
 * card: the method's icon, name and line, the QR of the value (tap for full screen) with the
 * address under it, Copy and Open in wallet; "Set an amount" puts an amount in the QR for
 * methods that take one. `.value` is a stored payment value (`bitcoin:<address>`).
 * Parts: `card`, `button`, `input`.
 */

import '@nostr-post/plugin-qr/web';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DEFAULT_AMOUNTS } from '../core';
import { detectPayment } from '../methods';
import { renderAmounts, renderCardHeader } from './lightningParts';
import { lightningStyles } from './lightningStyles';
import { DEFAULT_PAYMENT_MESSAGES, type PaymentMessages } from './paymentMessages';

@customElement('np-payment-qr')
export class NpPaymentQr extends NpElement {
  static override styles = [...npStyles, lightningStyles];

  @property() value = '';
  @property({ attribute: false }) amounts: number[] = DEFAULT_AMOUNTS;
  @property({ attribute: false }) messages: Partial<PaymentMessages> = {};

  /** The amount in sats put in the QR; undefined: any amount (the payer's wallet asks) */
  @state() _amount?: number;
  @state() _amountOpen = false;

  get _m(): PaymentMessages {
    return { ...DEFAULT_PAYMENT_MESSAGES, ...this.messages };
  }

  _amountPart(takesAmount: boolean) {
    const m = this._m;
    if (!takesAmount) return nothing;
    if (!this._amountOpen) {
      return html`<button
        type="button"
        class="np-button np-tonal wide"
        part="button"
        @click=${() => {
          this._amountOpen = true;
          this._amount = this.amounts[0];
        }}
      >
        ${m.qrAmount}
      </button>`;
    }
    return html`${renderAmounts(this.amounts, this._amount ?? 0, m, (amount) => {
      this._amount = amount;
    })}
      <div>
        <button
          type="button"
          class="np-button np-small"
          part="button"
          @click=${() => {
            this._amountOpen = false;
            this._amount = undefined;
          }}
        >
          ${m.anyAmount}
        </button>
      </div>`;
  }

  override render() {
    const detected = detectPayment(this.value);
    if (!detected?.method.qr) return nothing;
    const { method, value } = detected;
    const own = this._m.methods[method.id] ?? {};
    const payload = method.qr?.(value, this._amount);
    // Does the method put an amount in its QR? (its payload changes with one)
    const takesAmount = method.qr?.(value, 1) !== method.qr?.(value);
    return html`<div class="ln np-card np-outlined" part="card">
      ${renderCardHeader(method.icon, own.name ?? method.name, own.description ?? method.description)}
      ${payload ? html`<np-qr .text=${payload} .caption=${method.display?.(value) ?? value}></np-qr>` : nothing}
      ${this._amountPart(takesAmount)}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-payment-qr': NpPaymentQr;
  }
}
