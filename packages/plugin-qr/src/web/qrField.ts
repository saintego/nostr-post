/**
 * <np-qr-view> and <np-qr-input>: the `qr` field. The view shows each text of the value as a QR
 * code (<np-qr>); the input edits the texts, one box each ("Add" for more with
 * `metadata.multiple`), with the code of a filled one under it.
 * Both accept .value (a text or a list) and .field.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { qrTexts } from '../core';
import './qr';
import { DEFAULT_QR_MESSAGES, type QrMessages } from './qrMessages';
import { qrStyles } from './qrStyles';

@customElement('np-qr-view')
export class NpQrView extends NpElement {
  static override styles = [...npStyles, qrStyles];

  @property({ attribute: false }) value?: string | string[];
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<QrMessages> = {};

  override render() {
    const texts = qrTexts(this.value);
    if (texts.length === 0) return nothing;
    return html`<div class="qrs">
      ${texts.map((text) => html`<np-qr .text=${text} .messages=${this.messages}></np-qr>`)}
    </div>`;
  }
}

@customElement('np-qr-input')
export class NpQrInput extends NpElement {
  static override styles = [...npStyles, qrStyles];

  @property({ attribute: false }) value?: string | string[];
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<QrMessages> = {};

  /** Empty boxes the user added; the value has only the filled ones */
  @state() _blank = 0;

  get _m(): QrMessages {
    return { ...DEFAULT_QR_MESSAGES, ...this.messages };
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

  _emit(rows: string[]): void {
    this._blank = rows.filter((r) => !r.trim()).length;
    const kept = rows.map((r) => r.trim()).filter(Boolean);
    const value = kept.length === 0 ? undefined : this._multiple ? kept : kept[0];
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  _set(rows: string[], index: number, text: string): void {
    const next = [...rows];
    next[index] = text;
    this._emit(next);
  }

  override render() {
    const m = this._m;
    const rows = this._rows;
    return html`<div class="qrs">
      ${rows.map(
        (row, index) => html`<div>
          <div class="qr-row">
            <input
              class="np-input"
              part="input"
              .value=${row}
              placeholder=${m.placeholder}
              @change=${(e: Event) => this._set(rows, index, (e.target as HTMLInputElement).value)}
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
          ${row.trim() ? html`<np-qr .text=${row.trim()} .messages=${this.messages}></np-qr>` : nothing}
        </div>`
      )}
      ${
        this._multiple && rows.every((row) => row.trim())
          ? html`<button
              type="button"
              class="np-button np-small"
              part="button"
              @click=${() => {
                this._blank += 1;
              }}
            >
              ${m.add}
            </button>`
          : nothing
      }
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-qr-view': NpQrView;
    'np-qr-input': NpQrInput;
  }
}
