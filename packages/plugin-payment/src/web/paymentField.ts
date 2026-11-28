/**
 * <np-payment-view> and <np-payment-input>: the `payment` field. The view
 * shows each value as a card of its method: Lightning as <np-lightning> (its LNURL QR, invoices,
 * zaps), static methods (on-chain Bitcoin) as <np-payment-qr>, with the field's preset amounts
 * (`metadata.amounts`). A page showing the field passes whose it is (`.author`, hex; also
 * `.recipient`) and what is zapped (`.address`), so a Lightning address on it can be zapped. The
 * cards are a grid; with `grid-items` they become items of the parent's grid. The input edits the
 * values, one box each ("Add" with `metadata.multiple`), saying what it recognised.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { paymentTexts, presetAmounts } from '../core';
import { detectPayment } from '../methods';
import './lightning';
import { lightningStyles } from './lightningStyles';
import { DEFAULT_PAYMENT_MESSAGES, type PaymentMessages } from './paymentMessages';
import './paymentQr';

@customElement('np-payment-view')
export class NpPaymentView extends NpElement {
  static override styles = [...npStyles, lightningStyles];

  @property({ attribute: false }) value?: string | string[];
  @property({ attribute: false }) field?: PostField;
  /** Hex pubkey of whose the field is (the event's author, as views pass it) */
  @property({ attribute: false }) author?: string;
  /** The same as `author`, for pages that name the payee themselves */
  @property({ attribute: false }) recipient?: string;
  /** What is zapped besides the payee, e.g. the event's address */
  @property({ attribute: false }) address?: string;
  @property({ type: Boolean, attribute: 'private-context' }) privateContext = false;
  /** The cards are items of the parent's grid instead of a grid of their own */
  @property({ type: Boolean, reflect: true, attribute: 'grid-items' }) gridItems = false;
  @property({ attribute: false }) messages: Partial<PaymentMessages> = {};

  override render() {
    const values = paymentTexts(this.value);
    if (values.length === 0) return nothing;
    const amounts = presetAmounts(this.field);
    return html`<div class="lns">
      ${values.map((value) => {
        const detected = detectPayment(value);
        if (!detected) return nothing;
        if (detected.method.dynamic) {
          return html`<np-lightning
            .target=${detected.value}
            .recipient=${this.recipient ?? this.author}
            .address=${this.address}
            .amounts=${amounts}
            .privateContext=${this.privateContext}
            .messages=${this.messages}
            exportparts="card, button, input"
          ></np-lightning>`;
        }
        return html`<np-payment-qr
          .value=${detected.value}
          .amounts=${amounts}
          .messages=${this.messages}
          exportparts="card, button, input"
        ></np-payment-qr>`;
      })}
    </div>`;
  }
}

@customElement('np-payment-input')
export class NpPaymentInput extends NpElement {
  static override styles = [...npStyles, lightningStyles];

  @property({ attribute: false }) value?: string | string[];
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<PaymentMessages> = {};

  /** Empty boxes the user added; the value has only the filled ones */
  @state() _blank = 0;

  get _m(): PaymentMessages {
    return { ...DEFAULT_PAYMENT_MESSAGES, ...this.messages };
  }

  get _multiple(): boolean {
    return this.field?.metadata?.multiple === true;
  }

  get _rows(): string[] {
    const items = (Array.isArray(this.value) ? this.value : [this.value]).filter(
      (v): v is string => typeof v === 'string'
    );
    const rows = [...items, ...Array<string>(this._blank).fill('')];
    return rows.length > 0 ? rows : [''];
  }

  /** Stores each box in its method's form (a bare Bitcoin address as `bitcoin:…`) */
  _emit(rows: string[]): void {
    this._blank = rows.filter((r) => !r.trim()).length;
    const kept = rows
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => detectPayment(r)?.value ?? r);
    const value = kept.length === 0 ? undefined : this._multiple ? kept : kept[0];
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  _status(row: string) {
    const m = this._m;
    if (!row.trim()) return nothing;
    const detected = detectPayment(row);
    if (!detected)
      return html`<span class="np-field-error" part="error">${m.invalidPayment}</span>`;
    const name = m.methods[detected.method.id]?.name ?? detected.method.name;
    return html`<span class="np-hint">${m.detected(detected.method.icon, name)} ✓</span>`;
  }

  override render() {
    const m = this._m;
    const rows = this._rows;
    return html`<div class="ln-rows">
      ${rows.map((row, index) => {
        const invalid = row.trim() !== '' && !detectPayment(row);
        return html`<div>
          <div class="ln-row">
            <input
              class="np-input ${invalid ? 'np-invalid' : ''}"
              part="input"
              .value=${row}
              placeholder=${m.placeholder}
              aria-invalid=${invalid ? 'true' : 'false'}
              @change=${(e: Event) => {
                const next = [...rows];
                next[index] = (e.target as HTMLInputElement).value;
                this._emit(next);
              }}
            />
            ${
              rows.length > 1
                ? html`<button
                    type="button"
                    class="np-button np-small"
                    part="button"
                    @click=${() => this._emit(rows.filter((_, i) => i !== index))}
                  >
                    ${m.remove}
                  </button>`
                : nothing
            }
          </div>
          ${this._status(row)}
        </div>`;
      })}
      ${
        this._multiple && rows.every((row) => row.trim())
          ? html`<div>
              <button
                type="button"
                class="np-button np-small"
                part="button"
                @click=${() => {
                  this._blank += 1;
                }}
              >
                ${m.add}
              </button>
            </div>`
          : nothing
      }
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-payment-view': NpPaymentView;
    'np-payment-input': NpPaymentInput;
  }
}
