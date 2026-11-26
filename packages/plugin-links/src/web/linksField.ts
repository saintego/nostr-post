/**
 * <np-links-view> and <np-links-input>: the `links` field, a list of support entries.
 *
 * The view shows links as buttons with the site's icon, name and host (opened in a new tab with
 * `rel="noopener noreferrer"`), Bitcoin addresses with Copy and a QR code on request, and notes as
 * text. The input edits the entries: type, value, label and icon each, with Add and Remove.
 * Both accept .value (an entry or a list) and .field (`metadata.sites`: names and icons of more
 * tip sites, keyed by host).
 */

import '@nostr-post/plugin-qr/web';
import type { PostField } from '@nostr-post/plugins/types';
import '@nostr-post/ui/web/copy';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  bitcoinUri,
  checkSupportLink,
  KNOWN_SUPPORT_SITES,
  linkHost,
  parseSupportLink,
  type SupportLink,
  type SupportLinkType,
  type SupportSite,
  supportLinks,
  supportSite,
} from '../links';
import { DEFAULT_LINKS_MESSAGES, type LinksMessages } from './linksMessages';
import { linksStyles } from './linksStyles';

const sitesOf = (field?: PostField): Record<string, SupportSite> => ({
  ...KNOWN_SUPPORT_SITES,
  ...((field?.metadata?.sites as Record<string, SupportSite> | undefined) ?? {}),
});

@customElement('np-links-view')
export class NpLinksView extends NpElement {
  static override styles = [...npStyles, linksStyles];

  @property({ attribute: false }) value?: unknown;
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<LinksMessages> = {};

  /** Bitcoin addresses whose QR code is shown */
  @state() _qr = new Set<string>();

  get _m(): LinksMessages {
    return { ...DEFAULT_LINKS_MESSAGES, ...this.messages };
  }

  _toggleQr(address: string): void {
    const next = new Set(this._qr);
    if (next.has(address)) next.delete(address);
    else next.add(address);
    this._qr = next;
  }

  _link(entry: SupportLink, sites: Record<string, SupportSite>) {
    const site = supportSite(entry.value, sites);
    const host = linkHost(entry.value);
    const icon = entry.icon ?? site?.icon ?? '🔗';
    return html`<a
      class="link-entry np-button np-outlined"
      part="link"
      href=${entry.value}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span aria-hidden="true">${icon}</span>
      <span>${entry.label ?? site?.label ?? host}</span>
      ${entry.label || site ? html`<span class="host">${host} ↗</span>` : html`<span aria-hidden="true">↗</span>`}
    </a>`;
  }

  _bitcoin(entry: SupportLink) {
    const m = this._m;
    const shown = this._qr.has(entry.value);
    return html`<div class="bitcoin-row">
        <span aria-hidden="true">${entry.icon ?? '₿'}</span>
        <span>${entry.label ?? m.bitcoin}</span>
      </div>
      <code class="address" part="text">${entry.value}</code>
      <div class="bitcoin-row">
        <np-copy .text=${entry.value} exportparts="button"></np-copy>
        <button
          type="button"
          class="np-button np-small"
          part="button"
          aria-expanded=${shown}
          @click=${() => this._toggleQr(entry.value)}
        >
          ${shown ? m.hideQr : m.showQr}
        </button>
      </div>
      ${shown ? html`<np-qr .text=${bitcoinUri(entry.value)} .showText=${false}></np-qr>` : nothing}`;
  }

  override render() {
    const entries = supportLinks(this.value);
    if (entries.length === 0) return nothing;
    const sites = sitesOf(this.field);
    return html`<ul class="links" part="list">
      ${entries.map((entry) => {
        if (entry.type === 'link') return html`<li>${this._link(entry, sites)}</li>`;
        if (entry.type === 'bitcoin') return html`<li class="bitcoin">${this._bitcoin(entry)}</li>`;
        return html`<li><p class="note">${entry.icon ? `${entry.icon} ` : ''}${entry.value}</p></li>`;
      })}
    </ul>`;
  }
}

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
    'np-links-view': NpLinksView;
    'np-links-input': NpLinksInput;
  }
}
