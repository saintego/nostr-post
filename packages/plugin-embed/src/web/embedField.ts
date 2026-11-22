/**
 * @nostr-post/plugin-embed - <np-embed-view> and <np-embed-input>
 *
 * The view shows a field's links as players (<np-embed>). The input edits them: each link as
 * its preview with Edit and Remove (Edit shows its text box), "Add link" for more when
 * `metadata.multiple` is set.
 * Both accept .value (a link or a list) and .field.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { linkFromEmbedCode, linksOf } from '../core';
import './embed';
import { renderLinkEditor, renderLinkPreview } from './embedInputRow';
import { DEFAULT_EMBED_MESSAGES, type EmbedMessages } from './embedMessages';
import { embedStyles } from './embedStyles';

@customElement('np-embed-view')
export class NpEmbedView extends NpElement {
  static override styles = [...npStyles, embedStyles];

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
export class NpEmbedInput extends NpElement {
  static override styles = [...npStyles, embedStyles];

  @property({ type: Array }) value?: string | string[];
  @property({ type: Object }) field?: PostField;
  @property({ type: Object }) messages: Partial<EmbedMessages> = {};

  /** Empty rows the user added ("Add link"); the value has only the filled ones */
  @state() _blank = 0;
  /** Rows with a link the user is editing (their text box shows instead of the preview) */
  @state() _editing = new Set<number>();

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

  _setEditing(index: number, on: boolean): void {
    const next = new Set(this._editing);
    if (on) next.add(index);
    else next.delete(index);
    this._editing = next;
  }

  /** A row's typed link: saved, and shown as its preview again */
  _commit(rows: string[], index: number, text: string): void {
    const next = [...rows];
    next[index] = linkFromEmbedCode(text);
    this._setEditing(index, false);
    this._emit(next);
  }

  _remove(rows: string[], index: number): void {
    this._editing = new Set();
    this._emit(rows.filter((_, i) => i !== index));
  }

  override render() {
    const m = this._m;
    const rows = this._rows;
    return html`<div class="embeds">
      ${rows.map((row, index) =>
        row.trim() && !this._editing.has(index)
          ? renderLinkPreview(row.trim(), m, this.messages, {
              onEdit: () => this._setEditing(index, true),
              onRemove: () => this._remove(rows, index),
            })
          : renderLinkEditor(row, m, {
              focus: this._editing.has(index),
              onCommit: (text) => this._commit(rows, index, text),
              onRemove: rows.length > 1 ? () => this._remove(rows, index) : undefined,
            })
      )}
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
                ${m.addLink}
              </button>
            </div>`
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
