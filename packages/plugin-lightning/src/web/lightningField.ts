/**
 * <np-lightning-view> and <np-lightning-input>: the `lightning` field. The view shows each payee
 * of the value as <np-lightning>, with the field's preset amounts (`metadata.amounts`); a page
 * that shows the field passes whose it is (`.recipient`, hex) and what is zapped (`.address`), so
 * a Lightning address on it can be zapped. The input edits the payees, one box each ("Add" for
 * more with `metadata.multiple`). Both accept .value (a text or a list) and .field.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { lightningTexts, presetAmounts } from '../core';
import { parseLightningTarget } from '../lnurl';
import './lightning';
import { DEFAULT_LIGHTNING_MESSAGES, type LightningMessages } from './lightningMessages';
import { lightningStyles } from './lightningStyles';

@customElement('np-lightning-view')
export class NpLightningView extends NpElement {
  static override styles = [...npStyles, lightningStyles];

  @property({ attribute: false }) value?: string | string[];
  @property({ attribute: false }) field?: PostField;
  /** Hex pubkey of whose the field is (a page's author) */
  @property({ attribute: false }) recipient?: string;
  /** What is zapped besides the payee, e.g. the page's address */
  @property({ attribute: false }) address?: string;
  @property({ type: Boolean, attribute: 'private-context' }) privateContext = false;
  @property({ attribute: false }) messages: Partial<LightningMessages> = {};

  override render() {
    const targets = lightningTexts(this.value);
    if (targets.length === 0) return nothing;
    const amounts = presetAmounts(this.field);
    return html`<div class="lns">
      ${targets.map(
        (target) => html`<np-lightning
          .target=${target}
          .recipient=${this.recipient}
          .address=${this.address}
          .amounts=${amounts}
          .privateContext=${this.privateContext}
          .messages=${this.messages}
          exportparts="card, button, input"
        ></np-lightning>`
      )}
    </div>`;
  }
}

@customElement('np-lightning-input')
export class NpLightningInput extends NpElement {
  static override styles = [...npStyles, lightningStyles];

  @property({ attribute: false }) value?: string | string[];
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<LightningMessages> = {};

  /** Empty boxes the user added; the value has only the filled ones */
  @state() _blank = 0;

  get _m(): LightningMessages {
    return { ...DEFAULT_LIGHTNING_MESSAGES, ...this.messages };
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

  override render() {
    const m = this._m;
    const rows = this._rows;
    return html`<div class="lns">
      ${rows.map((row, index) => {
        const invalid = row.trim() !== '' && !parseLightningTarget(row);
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
          ${invalid ? html`<span class="np-field-error" part="error">${m.invalidTarget}</span>` : nothing}
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
    'np-lightning-view': NpLightningView;
    'np-lightning-input': NpLightningInput;
  }
}
