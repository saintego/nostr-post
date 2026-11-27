/**
 * <np-dialog-button>: a button (`label`) that opens its children in a dialog (<np-dialog> with
 * `heading`), e.g. a support page behind "♥ Support" in a footer, or a page's details. The
 * children are in the page from the start (hidden while closed); `open` opens it from code. Fires
 * `np-open` when it opens and `close` when it closes. `variant`: the button's look (`tonal`
 * default, `filled`, `outlined`, `text`). Parts: `button`, `dialog`, `header`.
 */

import { css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import './dialog';
import type { NpDialog } from './dialog';
import { NpElement } from './npElement';
import { npStyles } from './styles';

@customElement('np-dialog-button')
export class NpDialogButton extends NpElement {
  static override styles = [
    ...npStyles,
    css`
      :host {
        display: inline-block;
      }
      np-dialog::part(dialog) {
        width: min(44rem, 100vw - 2rem);
      }
    `,
  ];

  @property() label = '';
  @property() heading = '';
  @property() variant: 'tonal' | 'filled' | 'outlined' | 'text' = 'tonal';

  @query('np-dialog') _dialog?: NpDialog;

  /** Opens the dialog */
  open(): void {
    this._dialog?.showModal();
    this.dispatchEvent(new Event('np-open'));
  }

  close(): void {
    this._dialog?.close();
  }

  override render() {
    return html`<button
        type="button"
        class="np-button np-${this.variant}"
        part="button"
        @click=${() => this.open()}
      >
        ${this.label}
      </button>
      <np-dialog
        heading=${this.heading || this.label}
        backdrop-close
        exportparts="dialog, header"
        @close=${() => this.dispatchEvent(new Event('close'))}
      >
        <slot></slot>
      </np-dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-dialog-button': NpDialogButton;
  }
}
