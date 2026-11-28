/**
 * @nostr-post/plugin-links - <np-links-view> and <np-links-input>
 *
 * The view shows a field's links (`.value`: a link, an entry, or a list), each as <np-link>: a
 * player, a site's button, a QR code or a link, by the rules. With `metadata.layout: 'cards'`
 * (or `grid-items`, which also makes the cards items of the parent's grid) each link is a card.
 * The input edits them: each link as its preview with Edit and Remove; Edit shows its text box
 * (a link, `https://` may be left out, or a site's embed code), and "Label and description"
 * its label, icon and description. "Add link" for more with `metadata.multiple`.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import {
  type LinkEntry,
  linkEntries,
  linkFromEmbedCode,
  parseLinkEntry,
  storedEntry,
} from '../core';
import { normalizeLink, viewLink } from '../rules';
import { linkRules } from '../settings';
import './link';
import { DEFAULT_LINKS_MESSAGES, type LinksMessages } from './linksMessages';
import { linksStyles } from './linksStyles';

@customElement('np-links-view')
export class NpLinksView extends NpElement {
  static override styles = [...npStyles, linksStyles];

  @property({ attribute: false }) value?: unknown;
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<LinksMessages> = {};
  /** The links are cards, items of the parent's grid (e.g. next to a support page's payments) */
  @property({ type: Boolean, reflect: true, attribute: 'grid-items' }) gridItems = false;

  override render() {
    const entries = linkEntries(this.value, this.field);
    if (entries.length === 0) return nothing;
    const cards = this.gridItems || this.field?.metadata?.layout === 'cards';
    return html`<div class=${cards ? 'cards' : 'embeds'}>
      ${entries.map(
        (entry) => html`<np-link
          .entry=${entry}
          .field=${this.field}
          .card=${cards}
          .messages=${this.messages}
          exportparts="card, link, button, menu"
        ></np-link>`
      )}
    </div>`;
  }
}

/** One row of the input: an entry, also an empty or half-typed one */
interface Row extends LinkEntry {
  editing: boolean;
  /** Its label, icon and description boxes are open */
  details?: boolean;
}

@customElement('np-links-input')
export class NpLinksInput extends NpElement {
  static override styles = [...npStyles, linksStyles];

  @property({ attribute: false }) value?: unknown;
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<LinksMessages> = {};

  /** The rows as edited; undefined until the first edit (then the value's entries) */
  @state() _rows?: Row[];

  get _m(): LinksMessages {
    return { ...DEFAULT_LINKS_MESSAGES, ...this.messages };
  }

  get _multiple(): boolean {
    return this.field?.metadata?.multiple === true;
  }

  get _current(): Row[] {
    if (this._rows) return this._rows;
    const stored = (Array.isArray(this.value) ? this.value : [this.value])
      .map(parseLinkEntry)
      .filter((entry): entry is LinkEntry => entry !== undefined)
      .map((entry) => ({ ...entry, editing: false }));
    return stored.length > 0 ? stored : [{ url: '', editing: true }];
  }

  _emit(rows: Row[]): void {
    this._rows = rows;
    const kept = rows
      .filter((row) => row.url.trim())
      .map(({ editing: _, details: __, ...entry }) => storedEntry(entry));
    const value = kept.length === 0 ? undefined : this._multiple ? kept : kept[0];
    this.dispatchEvent(
      new CustomEvent('np-value-changed', { detail: { value }, bubbles: true, composed: true })
    );
  }

  _update(rows: Row[], index: number, change: Partial<Row>): void {
    this._emit(
      rows.map((row, i) => {
        if (i !== index) return row;
        const next: Row = { ...row, ...change };
        for (const key of ['label', 'icon', 'description'] as const) {
          if (!next[key]?.trim()) delete next[key];
        }
        return next;
      })
    );
  }

  _preview(rows: Row[], row: Row, index: number) {
    const m = this._m;
    const view = viewLink(row.url, linkRules(this.field));
    return html`<div class="link-row" part="item">
      <np-link .entry=${row} .field=${this.field} .messages=${this.messages} hide-menu></np-link>
      ${
        view.rule?.provider === 'bandcamp' && view.format !== 'embed'
          ? html`<p class="np-hint">${m.bandcampHint}</p>`
          : nothing
      }
      <div class="np-toolbar">
        <button
          type="button"
          class="np-button np-small"
          part="button"
          @click=${() => this._update(rows, index, { editing: true })}
        >
          ${m.edit}
        </button>
        <button
          type="button"
          class="np-button np-small np-text np-danger"
          part="button"
          @click=${() => this._emit(rows.filter((_, i) => i !== index))}
        >
          ${m.remove}
        </button>
      </div>
    </div>`;
  }

  _editor(rows: Row[], row: Row, index: number) {
    const m = this._m;
    const text = (key: 'label' | 'icon' | 'description', placeholder: string, cls = '') =>
      html`<input
        class="np-input ${cls}"
        part="input"
        placeholder=${placeholder}
        aria-label=${placeholder}
        .value=${live(row[key] ?? '')}
        @change=${(e: Event) => this._update(rows, index, { [key]: (e.target as HTMLInputElement).value.trim() })}
      />`;
    return html`<div class="link-row">
      <div class="row">
        <input
          class="np-input"
          part="input"
          type="text"
          inputmode="url"
          placeholder=${m.placeholder}
          .value=${live(row.url)}
          @change=${(e: Event) => {
            const url = normalizeLink(linkFromEmbedCode((e.target as HTMLInputElement).value));
            // A saved link shows as its preview, unless its details are being edited
            this._update(rows, index, { url, editing: !url || row.details === true });
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
      ${
        row.details
          ? html`<div class="details">
              ${text('icon', m.iconPlaceholder)} ${text('label', m.labelPlaceholder)}
              ${text('description', m.descriptionPlaceholder, 'wide')}
            </div>`
          : nothing
      }
      <div class="np-toolbar">
        ${
          row.details
            ? nothing
            : html`<button
                type="button"
                class="np-button np-small np-text"
                part="button"
                @click=${() => this._update(rows, index, { details: true })}
              >
                ${m.details}
              </button>`
        }
        ${
          row.url.trim()
            ? html`<button
                type="button"
                class="np-button np-small"
                part="button"
                @click=${() => this._update(rows, index, { editing: false, details: false })}
              >
                ${m.done}
              </button>`
            : nothing
        }
        ${
          rows.length > 1
            ? html`<button
                type="button"
                class="np-button np-small np-text np-danger"
                part="button"
                @click=${() => this._emit(rows.filter((_, i) => i !== index))}
              >
                ${m.remove}
              </button>`
            : nothing
        }
      </div>
    </div>`;
  }

  override render() {
    const m = this._m;
    const rows = this._current;
    return html`<div class="embeds">
      ${rows.map((row, index) =>
        row.url.trim() && !row.editing
          ? this._preview(rows, row, index)
          : this._editor(rows, row, index)
      )}
      ${
        this._multiple && rows.every((row) => row.url.trim())
          ? html`<div>
              <button
                type="button"
                class="np-button np-small"
                part="button"
                @click=${() => {
                  this._rows = [...rows, { url: '', editing: true }];
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
    'np-links-view': NpLinksView;
    'np-links-input': NpLinksInput;
  }
}
