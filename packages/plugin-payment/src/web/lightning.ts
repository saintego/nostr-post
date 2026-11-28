/**
 * <np-lightning>: pay one payee (`target`: a Lightning address, an LNURL or an npub), as a card.
 * It shows the payee's LNURL as a QR code right away (any wallet pays it, asking for the amount);
 * "Pay a set amount" lets the payer pick a preset amount or type one, add a message, and pay: as a NIP-57 zap when the payee's
 * service allows it, the payee's pubkey is known (`recipient`, or the npub's) and the payer has a
 * signer, else a plain invoice. The invoice is paid with the browser's WebLN wallet when there is
 * one, else shown as a QR code with a `lightning:` link; then the zap receipt (or LUD-21 verify
 * link) says it was paid. Says plainly that zaps are public (`private-context`: in a private
 * conversation, that the receipt reveals who paid whom). Parts: `card`, `button`, `input`.
 */

import '@nostr-post/plugin-qr/web';
import type { Result } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DEFAULT_AMOUNTS } from '../core';
import { checkSettled, type LightningError, parseLightningTarget, payUri, payUrl } from '../lnurl';
import {
  canZap,
  defaultPayDeps,
  findZapReceipt,
  hasWebln,
  type PayDeps,
  type Payee,
  type Payment,
  payWithWebln,
  requestPayment,
  resolvePayee,
} from '../pay';
import { DEFAULT_LIGHTNING_MESSAGES, type LightningMessages } from './lightningMessages';
import {
  renderAmounts,
  renderCardHeader,
  renderInvoice,
  renderZapChoice,
  targetLabel,
} from './lightningParts';
import { lightningStyles } from './lightningStyles';

/** How often the receipt or verify link is checked, and for how long (ms) */
const WATCH_EVERY_MS = 3000;
const WATCH_FOR_MS = 10 * 60 * 1000;

export type PaymentStatus = 'idle' | 'requesting' | 'invoice' | 'paying' | 'paid' | 'zapped';

@customElement('np-lightning')
export class NpLightning extends NpElement {
  static override styles = [...npStyles, lightningStyles];

  /** Who to pay: a Lightning address, an LNURL or an npub/nprofile */
  @property() target = '';
  /** Hex pubkey the target belongs to (e.g. the page's owner), so an address can be zapped */
  @property() recipient?: string;
  /** What is zapped besides the payee, e.g. a support page's address (`<kind>:<pubkey>:<d>`) */
  @property() address?: string;
  /** Preset amounts in sats */
  @property({ attribute: false }) amounts: number[] = DEFAULT_AMOUNTS;
  /** Shown in a private conversation: warns that a zap's receipt is public */
  @property({ type: Boolean, attribute: 'private-context' }) privateContext = false;
  @property({ attribute: false }) messages: Partial<LightningMessages> = {};
  /** Requests, profiles, relays and signing; `@nostr-post/signer`'s by default */
  @property({ attribute: false }) deps?: PayDeps;

  @state() _payee?: Result<Payee, LightningError>;
  @state() _amount?: number;
  @state() _comment = '';
  @state() _zap = true;
  @state() _status: PaymentStatus = 'idle';
  @state() _payment?: Payment;
  @state() _error?: string;
  /** The amount form is open (else the "Pay a set amount" button under the static QR) */
  @state() _amountOpen = false;

  _timer?: ReturnType<typeof setInterval>;
  _loaded?: string;

  get _m(): LightningMessages {
    return { ...DEFAULT_LIGHTNING_MESSAGES, ...this.messages };
  }

  get _deps(): PayDeps {
    return this.deps ?? defaultPayDeps();
  }

  override willUpdate(changed: Map<string, unknown>): void {
    const key = `${this.target}|${this.recipient ?? ''}`;
    if ((changed.has('target') || changed.has('recipient')) && key !== this._loaded) {
      this._loaded = key;
      void this._load();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopWatching();
  }

  async _load(): Promise<void> {
    this._reset();
    this._payee = undefined;
    if (!this.target.trim()) return;
    this._payee = await resolvePayee(this.target, this.recipient, this._deps);
  }

  _reset(): void {
    this._stopWatching();
    this._payment = undefined;
    this._status = 'idle';
    this._error = undefined;
  }

  get _canZap(): boolean {
    return (
      this._payee?.success === true &&
      canZap(this._payee.data) &&
      this._deps.signEvent !== undefined
    );
  }

  async _request(payee: Payee): Promise<void> {
    const amount = this._amount ?? this.amounts[0] ?? DEFAULT_AMOUNTS[0] ?? 21;
    this._status = 'requesting';
    this._error = undefined;
    const payment = await requestPayment(
      payee,
      {
        amountSats: amount,
        comment: this._comment,
        zap: this._zap && this._canZap,
        address: this.address,
      },
      this._deps
    );
    if (!payment.success) {
      this._status = 'idle';
      this._error = payment.error.message;
      return;
    }
    this._payment = payment.data;
    this._status = 'invoice';
    this._watch(payee, payment.data);
    if (hasWebln()) void this._payWithWallet();
  }

  async _payWithWallet(): Promise<void> {
    if (!this._payment) return;
    this._status = 'paying';
    const paid = await payWithWebln(this._payment.pr);
    if (this._status !== 'paying') return;
    if (paid.success) this._status = this._payment.zapRequest ? 'invoice' : 'paid';
    else {
      this._status = 'invoice';
      this._error = paid.error.message;
    }
  }

  _watch(payee: Payee, payment: Payment): void {
    this._stopWatching();
    if (!payment.zapRequest && !payment.verify) return;
    const until = Date.now() + WATCH_FOR_MS;
    this._timer = setInterval(async () => {
      if (Date.now() > until) return this._stopWatching();
      const done = payment.zapRequest
        ? (await findZapReceipt(payee, payment, this._deps)) !== undefined
        : await checkSettled(payment.verify ?? '', this._deps.fetchJson);
      if (done && this._payment === payment) {
        this._status = payment.zapRequest ? 'zapped' : 'paid';
        this._stopWatching();
      }
    }, WATCH_EVERY_MS);
  }

  _stopWatching(): void {
    clearInterval(this._timer);
    this._timer = undefined;
  }

  _form(payee: Payee) {
    const m = this._m;
    const zap = this._zap && this._canZap;
    const amount = this._amount ?? this.amounts[0] ?? 0;
    const { minSendable, maxSendable, commentAllowed } = payee.params;
    const inRange = amount * 1000 >= minSendable && amount * 1000 <= maxSendable;
    const busy = this._status === 'requesting';
    return html`
      ${renderAmounts(this.amounts, amount, m, (value) => {
        this._amount = value;
      })}
      ${
        zap || commentAllowed > 0
          ? html`<textarea
              class="np-input"
              part="input"
              rows="2"
              maxlength=${zap ? 280 : commentAllowed}
              placeholder=${m.message}
              aria-label=${m.message}
              .value=${this._comment}
              @input=${(e: Event) => {
                this._comment = (e.target as HTMLTextAreaElement).value;
              }}
            ></textarea>`
          : nothing
      }
      ${renderZapChoice({
        signerCanZap: this._canZap,
        serviceZaps: canZap(payee),
        zap,
        privateContext: this.privateContext,
        m,
        onChange: (on) => {
          this._zap = on;
        },
      })}
      ${
        inRange
          ? nothing
          : html`<p class="np-message np-error">
              ${m.amountRange(Math.ceil(minSendable / 1000), Math.floor(maxSendable / 1000))}
            </p>`
      }
      <div class="ln-actions">
        <button
          type="button"
          class="np-button np-filled"
          part="button primary"
          ?disabled=${busy || !inRange}
          @click=${() => this._request(payee)}
        >
          ${busy ? m.requesting : zap ? m.zapButton(amount) : m.invoiceButton(amount)}
        </button>
      </div>
    `;
  }

  /** The QR any wallet pays without an amount: the payee's LNURL, and what it shows and copies */
  _staticQr(target: string) {
    const payee = this._payee?.success ? this._payee.data : undefined;
    const parsed = parseLightningTarget(target);
    const url = payee?.url ?? (parsed ? payUrl(parsed) : undefined);
    if (!url) return html`<p class="np-hint">${this._m.loading}</p>`;
    const address = payee?.address ?? (parsed?.type === 'address' ? parsed.address : undefined);
    return html`<np-qr .text=${payUri(url)} .caption=${address ?? targetLabel(target)}></np-qr>`;
  }

  _amountPart() {
    const m = this._m;
    const payee = this._payee;
    if (payee && !payee.success) {
      return html`<p class="np-message np-error">${payee.error.message}</p>
        <div>
          <button type="button" class="np-button np-small" part="button" @click=${() => this._load()}>
            ${m.retry}
          </button>
        </div>`;
    }
    if (!this._amountOpen) {
      return html`<button
        type="button"
        class="np-button np-tonal wide"
        part="button"
        ?disabled=${!payee}
        @click=${() => {
          this._amountOpen = true;
        }}
      >
        ${m.setAmount}
      </button>`;
    }
    return payee ? this._form(payee.data) : nothing;
  }

  override render() {
    const m = this._m;
    const target = this.target.trim();
    if (!target) return nothing;
    const body = this._payment
      ? renderInvoice(this._payment, this._status, m, {
          onWallet: hasWebln() ? () => this._payWithWallet() : undefined,
          onNew: () => this._reset(),
        })
      : html`${this._staticQr(target)}${this._amountPart()}`;
    return html`<div class="ln np-card np-outlined" part="card">
      ${renderCardHeader('⚡', m.title, m.description)}
      ${body}
      ${this._error ? html`<p class="np-message np-error">${this._error}</p>` : nothing}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-lightning': NpLightning;
  }
}
