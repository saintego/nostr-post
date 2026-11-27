/**
 * <np-qr>: text as a QR code, with the text under it (long ones, like Lightning invoices,
 * shortened in the middle; `caption` shows and copies other text, e.g. the address of a
 * `bitcoin:` URI), Copy, and a link that opens it: "Open in wallet" for `lightning:`, `bitcoin:`
 * and `nostr:` URIs, "Open link" for `https:` links. A tap on the code opens it full screen, for
 * scanning with another phone. The code is made locally.
 * Parts: `image`, `text`, `button`, `link`.
 */

import '@nostr-post/ui/web/copy';
import '@nostr-post/ui/web/dialog';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import type { NpDialog } from '@nostr-post/ui/web/dialog';
import { html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { qrMatrix, qrScheme, qrSvg } from '../qr';
import { DEFAULT_QR_MESSAGES, type QrMessages } from './qrMessages';
import { qrStyles } from './qrStyles';

/** Texts longer than this show shortened (start … end); Copy copies all of it */
const SHOWN_CHARS = 48;

/** Text shortened in the middle to at most `SHOWN_CHARS` characters */
export const shortText = (text: string): string =>
  text.length <= SHOWN_CHARS ? text : `${text.slice(0, 30)}…${text.slice(-14)}`;

/**
 * The image's width in rem: a quarter rem a module, at least 12rem, so the modules of a long
 * invoice stay big enough to scan (the layout narrows it to the space it has)
 */
export const qrWidthRem = (modules: number): number => Math.max(12, modules * 0.25);

@customElement('np-qr')
export class NpQr extends NpElement {
  static override styles = [...npStyles, qrStyles];

  @property() text = '';
  /** Shown under the code and copied instead of the text, e.g. an address without `bitcoin:` */
  @property() caption?: string;
  /** Show the text under the code (default true) */
  @property({ type: Boolean, attribute: 'show-text' }) showText = true;
  /** Show the Open link for URIs that have one (default true) */
  @property({ type: Boolean, attribute: 'show-link' }) showLink = true;
  @property({ attribute: false }) messages: Partial<QrMessages> = {};

  @query('np-dialog') _dialog?: NpDialog;

  get _m(): QrMessages {
    return { ...DEFAULT_QR_MESSAGES, ...this.messages };
  }

  _link(text: string) {
    const scheme = qrScheme(text);
    if (!this.showLink || !scheme) return nothing;
    const m = this._m;
    return scheme === 'https:'
      ? html`<a class="np-button np-small" part="link" href=${text} target="_blank" rel="noopener noreferrer"
          >${m.openLink}</a
        >`
      : html`<a class="np-button np-small np-filled" part="link" href=${text}>${m.openInApp}</a>`;
  }

  /** The code large on white, for scanning with another phone */
  _fullScreen(svg: string, shown: string) {
    return html`<np-dialog heading=${this._m.qrCode} backdrop-close>
      <div class="qr-large">${unsafeHTML(svg)}</div>
      <p class="qr-text qr-large-text">${shown}</p>
    </np-dialog>`;
  }

  override render() {
    const text = this.text.trim();
    if (!text) return nothing;
    const m = this._m;
    const svg = qrSvg(text, { label: m.qrCode });
    if (!svg.success) return html`<p class="np-message np-error">${m.tooLong}</p>`;
    const matrix = qrMatrix(text);
    const width = matrix.success ? qrWidthRem(matrix.data.size) : 12;
    const shown = this.caption?.trim() || text;
    return html`<div class="qr">
      <button
        type="button"
        class="qr-image"
        part="image"
        style="width: ${width}rem"
        title=${m.fullScreen}
        aria-label=${m.fullScreen}
        @click=${() => this._dialog?.showModal()}
      >
        ${unsafeHTML(svg.data)}
      </button>
      ${this.showText ? html`<span class="qr-text" part="text" title=${shown}>${shortText(shown)}</span>` : nothing}
      <div class="qr-actions">
        <np-copy .text=${shown} exportparts="button"></np-copy>
        ${this._link(text)}
      </div>
      ${this._fullScreen(svg.data, shown)}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-qr': NpQr;
  }
}
