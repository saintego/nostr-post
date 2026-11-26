/**
 * @nostr-post/web - <nostr-post-support-button>
 *
 * A button that opens a person's support panel (<nostr-post-support>) in a dialog, e.g. a tip jar
 * in a page's footer. Takes the panel's attributes (`npub`, `relays`, `recipients`,
 * `private-context`) and passes them on; `label` replaces the button's text.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import { SUPPORT_MANIFEST } from '@nostr-post/posts';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import '@nostr-post/ui/web/dialog';
import type { NpDialog } from '@nostr-post/ui/web/dialog';
import { html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import './support';
import { DEFAULT_SUPPORT_MESSAGES, type SupportMessages } from './supportMessages';
import { supportStyles } from './supportStyles';

@customElement('nostr-post-support-button')
export class NostrPostSupportButton extends NpElement {
  static override styles = [...npStyles, supportStyles];

  @property() npub = '';
  @property({ type: Array }) relays?: string[];
  @property({ attribute: false }) page?: Record<string, unknown>;
  @property({ attribute: false }) manifest: NostrPostManifest = SUPPORT_MANIFEST;
  @property() recipients?: string;
  @property({ type: Boolean, attribute: 'private-context' }) privateContext = false;
  /** The button's text instead of "♥ Support" */
  @property() label?: string;
  @property({ attribute: false }) messages: Partial<SupportMessages> = {};

  /** The panel is rendered once the dialog first opens, so a closed button reads nothing */
  @state() _opened = false;
  @query('np-dialog') _dialog?: NpDialog;

  get _m(): SupportMessages {
    return { ...DEFAULT_SUPPORT_MESSAGES, ...this.messages };
  }

  _open(): void {
    this._opened = true;
    void this.updateComplete.then(() => this._dialog?.showModal());
  }

  override render() {
    const m = this._m;
    return html`<button type="button" class="np-button np-tonal" part="button" @click=${() => this._open()}>
        ${this.label ?? m.button}
      </button>
      <np-dialog heading=${m.heading()} backdrop-close>
        ${
          this._opened
            ? html`<nostr-post-support
                npub=${this.npub}
                .relays=${this.relays}
                .page=${this.page}
                .manifest=${this.manifest}
                .recipients=${this.recipients}
                .privateContext=${this.privateContext}
                .messages=${this.messages}
                hide-heading
                exportparts="card, header, button"
              ></nostr-post-support>`
            : ''
        }
      </np-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-support-button': NostrPostSupportButton;
  }
}
