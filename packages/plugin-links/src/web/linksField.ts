/**
 * <np-links-input>: edits the `links` field's entries (type, value, icon, label and description
 * each, with Add and Remove); invalid ones are marked and left out of the value. Accepts .value
 * (an entry or a list) and .field. The view is <np-links-view> (`linksView.ts`).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  checkSupportLink,
  parseSupportLink,
  type SupportLink,
  type SupportLinkType,
} from '../links';
import { DEFAULT_LINKS_MESSAGES, type LinksMessages } from './linksMessages';
import { linksStyles } from './linksStyles';

/** An empty entry of a type */
const blank = (type: SupportLinkType = 'link'): SupportLink => ({ type, value: '' });

@customElement('np-links-input')
export class NpLinksInput extends NpElement {
  static override styles = [...npStyles, linksStyles];

  @property({ attribute: false }) value?: unknown;
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<LinksMessages> = {};

  /** Entries as typed, also empty and invalid ones; the value has the valid ones */
  @state() _rows?: SupportLink[];

  get _m(): LinksMessages {
    return { ...DEFAULT_LINKS_MESSAGES, ...this.messages };
  }

  get _entries(): SupportLink[] {
    if (this._rows) return this._rows;
    const stored = (Array.isArray(this.value) ? this.value : [this.value])
      .map(parseSupportLink)
      .filter((entry): entry is SupportLink => entry !== undefined);
    return stored.length > 0 ? stored : [blank()];
  }

  _emit(rows: SupportLink[]): void {
    this._rows = rows;
    const kept = rows.flatMap((row) => {
      const checked = checkSupportLink(row);
      return checked.success ? [checked.data] : [];
    });
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: kept.length > 0 ? kept : undefined },
        bubbles: true,
        composed: true,
      })
    );
  }

  _update(rows: SupportLink[], index: number, change: Partial<SupportLink>): void {
    const next = rows.map((row, i) => {
      if (i !== index) return row;
      const merged = { ...row, ...change };
      // Empty label and icon are left out
      if (!merged.label) delete merged.label;
      if (!merged.icon) delete merged.icon;
      if (!merged.description) delete merged.description;
      return merged;
    });
    this._emit(next);
  }

  _error(row: SupportLink): string | undefined {
    if (!row.value.trim()) return undefined;
    const checked = checkSupportLink(row);
    if (checked.success) return undefined;
    return checked.error.code === 'bad-address' ? this._m.badAddress : this._m.notHttps;
  }

  _placeholder(type: SupportLinkType): string {
    const m = this._m;
    if (type === 'bitcoin') return m.bitcoinPlaceholder;
    if (type === 'note') return m.notePlaceholder;
    return m.linkPlaceholder;
  }

  _row(rows: SupportLink[], row: SupportLink, index: number) {
    const m = this._m;
    const error = this._error(row);
    const valueChanged = (e: Event) =>
      this._update(rows, index, { value: (e.target as HTMLInputElement).value });
    return html`<div class="entry-editor" part="card">
      <select
        class="np-input"
        part="input"
        aria-label=${m.type}
        .value=${row.type}
        @change=${(e: Event) =>
          this._update(rows, index, {
            type: (e.target as HTMLSelectElement).value as SupportLinkType,
          })}
      >
        <option value="link">${m.typeLink}</option>
        <option value="bitcoin">${m.typeBitcoin}</option>
        <option value="note">${m.typeNote}</option>
      </select>
      ${
        row.type === 'note'
          ? html`<textarea
              class="np-input"
              part="input"
              rows="2"
              .value=${row.value}
              placeholder=${m.notePlaceholder}
              @change=${valueChanged}
            ></textarea>`
          : html`<input
              class="np-input ${error ? 'np-invalid' : ''}"
              part="input"
              .value=${row.value}
              placeholder=${this._placeholder(row.type)}
              aria-invalid=${error ? 'true' : 'false'}
              @change=${valueChanged}
            />`
      }
      ${error ? html`<span class="np-field-error wide" part="error">${error}</span>` : nothing}
      <input
        class="np-input icon-input"
        part="input"
        .value=${row.icon ?? ''}
        placeholder=${m.iconPlaceholder}
        aria-label=${m.iconPlaceholder}
        @change=${(e: Event) => this._update(rows, index, { icon: (e.target as HTMLInputElement).value.trim() })}
      />
      <input
        class="np-input"
        part="input"
        .value=${row.label ?? ''}
        placeholder=${m.labelPlaceholder}
        aria-label=${m.labelPlaceholder}
        @change=${(e: Event) => this._update(rows, index, { label: (e.target as HTMLInputElement).value.trim() })}
      />
      <input
        class="np-input wide"
        part="input"
        .value=${row.description ?? ''}
        placeholder=${m.descriptionPlaceholder}
        aria-label=${m.descriptionPlaceholder}
        @change=${(e: Event) =>
          this._update(rows, index, { description: (e.target as HTMLInputElement).value.trim() })}
      />
      <div class="entry-actions">
        <button
          type="button"
          class="np-button np-small"
          part="button"
          @click=${() => {
            const next = rows.filter((_, i) => i !== index);
            this._emit(next.length > 0 ? next : [blank()]);
          }}
        >
          ${m.remove}
        </button>
      </div>
    </div>`;
  }

  override render() {
    const m = this._m;
    const rows = this._entries;
    return html`<div class="links">
      ${rows.map((row, index) => this._row(rows, row, index))}
      <div>
        <button
          type="button"
          class="np-button np-small"
          part="button"
          @click=${() => this._emit([...rows, blank()])}
        >
          ${m.add}
        </button>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-links-input': NpLinksInput;
  }
}
