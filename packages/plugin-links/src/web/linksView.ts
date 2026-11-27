/**
 * <np-links-view>: the `links` field's entries as cards of one shape (icon, name, a line under it,
 * then the entry):
 * - a link: a button to the site, in the site's own colours for known tip sites (Buy Me a Coffee's
 *   yellow, …), opened in a new tab with `rel="noopener noreferrer"`;
 * - a Bitcoin address: its QR code (tap for full screen), the address, Copy and Open in wallet;
 * - a note: its text.
 * With `grid-items`, the cards become items of the parent's grid (e.g. next to the Lightning cards
 * of a support panel). Accepts .value (an entry or a list) and .field (`metadata.sites`: more tip
 * sites, keyed by host). Parts: `card`, `link`.
 */

import '@nostr-post/plugin-qr/web';
import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  bitcoinUri,
  KNOWN_SUPPORT_SITES,
  linkHost,
  type SupportLink,
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

/** A link without its scheme and `www.`, as a card's line shows it */
const shortLink = (link: string): string =>
  link.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');

const header = (icon: string, title: string, subtitle?: string) =>
  html`<div class="np-card-header">
    <span class="np-card-icon" aria-hidden="true">${icon}</span>
    <div>
      <p class="np-card-title">${title}</p>
      ${subtitle ? html`<p class="np-card-subtitle">${subtitle}</p>` : nothing}
    </div>
  </div>`;

@customElement('np-links-view')
export class NpLinksView extends NpElement {
  static override styles = [...npStyles, linksStyles];

  @property({ attribute: false }) value?: unknown;
  @property({ attribute: false }) field?: PostField;
  @property({ attribute: false }) messages: Partial<LinksMessages> = {};
  /** The cards are items of the parent's grid instead of a grid of their own */
  @property({ type: Boolean, reflect: true, attribute: 'grid-items' }) gridItems = false;

  get _m(): LinksMessages {
    return { ...DEFAULT_LINKS_MESSAGES, ...this.messages };
  }

  _link(entry: SupportLink, sites: Record<string, SupportSite>) {
    const site = supportSite(entry.value, sites);
    const name = entry.label ?? site?.label ?? linkHost(entry.value);
    const icon = entry.icon ?? site?.icon ?? '🔗';
    const brand = site?.brand
      ? styleMap({
          '--np-brand-background': site.brand.background,
          '--np-brand-color': site.brand.color,
        })
      : undefined;
    return html`${header(icon, name, entry.description ?? shortLink(entry.value))}
      <a
        class="np-button link-button ${brand ? 'brand' : 'np-filled'}"
        part="link"
        style=${brand ?? nothing}
        href=${entry.value}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span aria-hidden="true">${icon}</span>
        ${this._m.open(name)}
      </a>`;
  }

  _bitcoin(entry: SupportLink) {
    const m = this._m;
    return html`${header(entry.icon ?? '₿', entry.label ?? m.bitcoin, entry.description ?? m.bitcoinDescription)}
      <np-qr .text=${bitcoinUri(entry.value)} .caption=${entry.value}></np-qr>`;
  }

  _note(entry: SupportLink) {
    return html`${entry.label ? header(entry.icon ?? '📝', entry.label, entry.description) : nothing}
      <p class="note">${!entry.label && entry.icon ? `${entry.icon} ` : ''}${entry.value}</p>`;
  }

  override render() {
    const entries = supportLinks(this.value);
    if (entries.length === 0) return nothing;
    const sites = sitesOf(this.field);
    return html`<div class="cards">
      ${entries.map((entry) => {
        const body =
          entry.type === 'link'
            ? this._link(entry, sites)
            : entry.type === 'bitcoin'
              ? this._bitcoin(entry)
              : this._note(entry);
        return html`<div class="np-card np-outlined method" part="card">${body}</div>`;
      })}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-links-view': NpLinksView;
  }
}
