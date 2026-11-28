/**
 * <np-link>: one link, shown as its rule says (`viewLink`): a player (<np-embed>), the site's own
 * button (its colours), a QR code (<np-qr>) or a plain link; with a ⋯ menu next to it: QR code
 * (full screen), Copy link, Share (the system's share sheet, where there is one) and Open. With
 * `card`, a card of one shape: icon, name, a line under it (the entry's description, else the
 * link), then the link. Accepts `.entry` (a link with a label, icon, description) or `.url`,
 * `.field` (its rules, `metadata.showUrl`) or `.rules`. `hide-menu` leaves the menu out.
 * Parts: `card`, `link`, `button`, `menu`.
 */

import '@nostr-post/plugin-qr/web';
import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { copyText } from '@nostr-post/ui/web/copy';
import '@nostr-post/ui/web/dialog';
import type { NpDialog } from '@nostr-post/ui/web/dialog';
import '@nostr-post/ui/web/menu-button';
import { html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { LinkEntry } from '../core';
import { type LinkRule, type LinkView, viewLink } from '../rules';
import { linkRules, linkText, showsUrl } from '../settings';
import './embed';
import { DEFAULT_LINKS_MESSAGES, type LinksMessages } from './linksMessages';
import { linksStyles } from './linksStyles';

/** An entry's or rule's icon, else a link's */
const iconOf = (entry: LinkEntry, view: LinkView): string =>
  entry.icon ?? view.rule?.icon ?? (view.format === 'qr' ? '▦' : '🔗');

@customElement('np-link')
export class NpLink extends NpElement {
  static override styles = [...npStyles, linksStyles];

  @property() url = '';
  @property({ attribute: false }) entry?: LinkEntry;
  @property({ attribute: false }) field?: PostField;
  /** The rules (default: the field's, the app's and the built-in ones) */
  @property({ attribute: false }) rules?: LinkRule[];
  /** A card of one shape (icon, name, a line under it, the link) */
  @property({ type: Boolean, reflect: true }) card = false;
  @property({ type: Boolean, attribute: 'hide-menu' }) hideMenu = false;
  @property({ attribute: false }) messages: Partial<LinksMessages> = {};

  @state() _copied = false;
  @query('np-dialog') _qrDialog?: NpDialog;

  get _m(): LinksMessages {
    return { ...DEFAULT_LINKS_MESSAGES, ...this.messages };
  }

  get _entry(): LinkEntry {
    return this.entry ?? { url: this.url };
  }

  async _copy(url: string): Promise<void> {
    this._copied = await copyText(url);
    setTimeout(() => {
      this._copied = false;
    }, 1500);
  }

  _menu(view: LinkView, name: string) {
    if (this.hideMenu) return nothing;
    const m = this._m;
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const web = /^https?:/i.test(view.url);
    return html`<np-menu-button .label=${m.more} exportparts="button, menu">
        ${
          view.format === 'qr'
            ? nothing
            : html`<button type="button" class="np-menu-item" role="menuitem" @click=${() => this._qrDialog?.showModal()}>
                ▦ ${m.qrCode}
              </button>`
        }
        <button type="button" class="np-menu-item" role="menuitem" @click=${() => void this._copy(view.url)}>
          ⧉ ${this._copied ? m.copied : m.copy}
        </button>
        ${
          canShare
            ? html`<button
                type="button"
                class="np-menu-item"
                role="menuitem"
                @click=${() => void navigator.share({ title: name, url: view.url }).catch(() => undefined)}
              >
                ⇪ ${m.share}
              </button>`
            : nothing
        }
        <a
          class="np-menu-item"
          role="menuitem"
          href=${view.url}
          target=${web ? '_blank' : nothing}
          rel="noopener noreferrer"
          >↗ ${m.open}</a
        >
      </np-menu-button>
      <np-dialog heading=${name} backdrop-close>
        <np-qr .text=${view.url}></np-qr>
      </np-dialog>`;
  }

  _body(entry: LinkEntry, view: LinkView, name: string, rules: LinkRule[]) {
    const icon = iconOf(entry, view);
    switch (view.format) {
      case 'embed':
        return html`<np-embed
          .url=${view.url}
          .rules=${rules}
          .showUrl=${showsUrl(this.field)}
          .messages=${this.messages}
        ></np-embed>`;
      case 'qr':
        return html`<np-qr .text=${view.url}></np-qr>`;
      case 'button': {
        const brand = view.rule?.brand;
        return html`<a
          class="np-button link-button ${brand ? 'brand' : 'np-filled'}"
          part="link"
          style=${brand ? styleMap({ '--np-brand-background': brand.background, '--np-brand-color': brand.color }) : nothing}
          href=${view.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span aria-hidden="true">${icon}</span> ${name} ↗
        </a>`;
      }
      default:
        return html`<a class="link" part="link" href=${view.url} target="_blank" rel="noopener noreferrer">
          ${entry.icon ? html`<span aria-hidden="true">${entry.icon}</span> ` : nothing}${entry.label ?? linkText(view.url)}
          ↗
        </a>`;
    }
  }

  override render() {
    const entry = this._entry;
    if (!entry.url.trim()) return nothing;
    const rules = this.rules ?? linkRules(this.field);
    const view = viewLink(entry.url, rules);
    const name = entry.label ?? view.rule?.name ?? linkText(view.url);
    const body = this._body(entry, view, name, rules);
    if (!this.card) {
      return html`<div class="link-line">
        <div class="link-body">${body}</div>
        ${this._menu(view, name)}
      </div>`;
    }
    return html`<div class="np-card np-outlined card" part="card">
      <div class="card-head">
        <div class="np-card-header">
          <span class="np-card-icon" aria-hidden="true">${iconOf(entry, view)}</span>
          <div>
            <p class="np-card-title">${name}</p>
            <p class="np-card-subtitle">${entry.description ?? linkText(view.url)}</p>
          </div>
        </div>
        ${this._menu(view, name)}
      </div>
      ${body}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-link': NpLink;
  }
}
