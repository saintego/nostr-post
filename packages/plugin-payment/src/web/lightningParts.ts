/**
 * Template parts of <np-lightning>: the amount choice and the invoice with its state.
 */

import { html, nothing } from 'lit';
import type { Payment } from '../pay';
import type { PaymentStatus } from './lightning';
import type { LightningMessages } from './lightningMessages';

/** A target as shown: an address as it is, an npub or LNURL shortened */
export const targetLabel = (target: string): string => {
  const text = target.replace(/^(lightning|nostr):/i, '');
  return text.includes('@') || text.length <= 24 ? text : `${text.slice(0, 12)}…${text.slice(-6)}`;
};

/** The preset amounts as chips and a box for another amount */
export const renderAmounts = (
  amounts: number[],
  selected: number,
  m: LightningMessages,
  onSelect: (amount: number) => void
) => {
  const custom = amounts.includes(selected) ? '' : String(selected);
  return html`<div class="amounts" role="group">
    ${amounts.map(
      (amount) => html`<button
        type="button"
        class="np-chip ${amount === selected ? 'np-selected' : ''}"
        part="button"
        aria-pressed=${amount === selected}
        @click=${() => onSelect(amount)}
      >
        ${m.sats(amount)}
      </button>`
    )}
    <input
      class="np-input"
      part="input"
      type="number"
      min="1"
      step="1"
      inputmode="numeric"
      placeholder=${m.customAmount}
      aria-label=${m.customAmount}
      .value=${custom}
      @input=${(e: Event) => {
        const value = Math.floor(Number((e.target as HTMLInputElement).value));
        if (value > 0) onSelect(value);
      }}
    />
  </div>`;
};

/** The invoice: paid, or its QR code and link, the wallet button and the wait for the receipt */
export const renderInvoice = (
  payment: Payment,
  status: PaymentStatus,
  m: LightningMessages,
  actions: { onWallet?: () => void; onNew: () => void }
) => {
  const again = html`<button type="button" class="np-button np-small" part="button" @click=${actions.onNew}>
    ${m.newPayment}
  </button>`;
  if (status === 'paid' || status === 'zapped') {
    return html`<p class="np-message np-success" role="status">
        ${status === 'zapped' ? m.zapReceived : m.paid}
      </p>
      <div>${again}</div>`;
  }
  const watching = payment.zapRequest !== undefined || payment.verify !== undefined;
  return html`<np-qr .text=${`lightning:${payment.pr}`}></np-qr>
    <div class="ln-actions">
      ${
        actions.onWallet
          ? html`<button
              type="button"
              class="np-button np-filled"
              part="button primary"
              ?disabled=${status === 'paying'}
              @click=${actions.onWallet}
            >
              ${status === 'paying' ? m.paying : m.payWithWallet}
            </button>`
          : nothing
      }
      ${again}
    </div>
    ${watching ? html`<p class="np-hint" role="status">${m.waiting}</p>` : nothing}`;
};

/**
 * "Send as a zap" when the payer can zap (else, when the service could, that it needs a signer),
 * and, for a zap, that zaps are public (in a private conversation: that the receipt is)
 */
export const renderZapChoice = (options: {
  signerCanZap: boolean;
  serviceZaps: boolean;
  zap: boolean;
  privateContext: boolean;
  m: LightningMessages;
  onChange: (zap: boolean) => void;
}) => {
  const { signerCanZap, serviceZaps, zap, privateContext, m, onChange } = options;
  const choice = signerCanZap
    ? html`<label class="zap-choice">
        <input
          type="checkbox"
          class="np-checkbox"
          .checked=${zap}
          @change=${(e: Event) => onChange((e.target as HTMLInputElement).checked)}
        />
        ${m.asZap}
      </label>`
    : serviceZaps
      ? html`<p class="np-hint">${m.zapNeedsSigner}</p>`
      : nothing;
  const note = zap
    ? html`<p class="np-hint">${privateContext ? m.zapPrivateContext : m.zapPublic}</p>`
    : nothing;
  return html`${choice}${note}`;
};

/** A payment card's header: the method's icon, name and the line under it */
export const renderCardHeader = (icon: string, name: string, description?: string) =>
  html`<div class="np-card-header">
    <span class="np-card-icon" aria-hidden="true">${icon}</span>
    <div>
      <p class="np-card-title">${name}</p>
      ${description ? html`<p class="np-card-subtitle">${description}</p>` : nothing}
    </div>
  </div>`;
