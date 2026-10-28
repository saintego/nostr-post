/**
 * @nostr-post/plugin-embed - <np-embed-view> and <np-embed-input>
 *
 * The view shows a field's links as players (<np-embed>). The input edits them: one link per
 * row with a preview, "Add link" for more when `metadata.multiple` is set.
 * Both accept .value (a link or a list) and .field.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { linksOf } from '../core';
import './embed';
import { DEFAULT_EMBED_MESSAGES, type EmbedMessages } from './embedMessages';
import { embedStyles } from './embedStyles';

@customElement('np-embed-view')
export class NpEmbedView extends LitElement {
  static override styles = embedStyles;

  @property({ type: Array }) value?: string | string[];
  @property({ type: Object }) field?: PostField;
  @property({ type: Object }) messages: Partial<EmbedMessages> = {};

  override render() {
    const links = linksOf(this.value);
    if (links.length === 0) return nothing;
    return html`<div class="embeds">
      ${links.map((url) => html`<np-embed .url=${url} .messages=${this.messages}></np-embed>`)}
    </div>`;
  }
}

@customElement('np-embed-input')
export class NpEmbedInput extends LitElement {
  static override styles = embedStyles;

  @property({ type: Array }) value?: string | string[];
  @property({ type: Object }) field?: PostField;
  @property({ type: Object }) messages: Partial<EmbedMessages> = {};

  /** Empty rows the user added ("Add link"); the value has only the filled ones */
  @state() _blank = 0;

  get _m(): EmbedMessages {
    return { ...DEFAULT_EMBED_MESSAGES, ...this.messages };
  }

  get _multiple(): boolean {
    return this.field?.metadata?.multiple === true;
  }

  /** The rows: the value's links (typed text too) and the added empty ones, at least one */
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
    return html`<div class="embeds">
      ${rows.map(
        (row, index) => html`
          <div class="row">
            <input
              type="url"
              placeholder=${m.placeholder}
              .value=${live(row)}
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
                    class="small"
                    @click=${() => this._emit(rows.filter((_, i) => i !== index))}
                  >
                    ${m.remove}
                  </button>`
                : nothing
            }
          </div>
          ${row.trim() ? html`<np-embed .url=${row.trim()} .messages=${this.messages}></np-embed>` : nothing}
        `
      )}
      ${
        this._multiple && rows.every((row) => row.trim())
          ? html`<button type="button" class="small" @click=${() => {
              this._blank += 1;
            }}>
              ${m.addLink}
            </button>`
          : nothing
      }
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-embed-view': NpEmbedView;
    'np-embed-input': NpEmbedInput;
  }
}
