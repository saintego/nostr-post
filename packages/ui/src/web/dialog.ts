/**
 * <np-dialog>: a modal dialog with a title (`heading`), a Close button and its content (the
 * element's children). Open it with the `open` property (or attribute), `showModal()` or by
 * rendering it with `open`; it closes on Close, Escape, `close()`, and with `backdrop-close` on
 * a click outside it (a press that began inside, e.g. selecting text, doesn't count). It fires
 * `close` when it closes. Parts: `dialog`, `header`, `button`; size it with `::part(dialog)`.
 */

import { html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { DEFAULT_DIALOG_MESSAGES, type DialogMessages } from './dialogMessages';
import { NpElement } from './npElement';
import { npStyles } from './styles';

export { DEFAULT_DIALOG_MESSAGES, type DialogMessages } from './dialogMessages';

/** Whether a pointer at (x, y) is outside the element's box (on the backdrop) */
const outside = (el: Element, x: number, y: number): boolean => {
  const r = el.getBoundingClientRect();
  return x < r.left || x > r.right || y < r.top || y > r.bottom;
};

@customElement('np-dialog')
export class NpDialog extends NpElement {
  static override styles = [...npStyles];

  @property() heading = '';
  @property({ type: Boolean, reflect: true }) open = false;
  /** Close on a click outside the dialog */
  @property({ type: Boolean, attribute: 'backdrop-close' }) backdropClose = false;
  @property({ attribute: false }) messages?: Partial<DialogMessages>;

  @query('dialog') _dialog?: HTMLDialogElement;
  /** The last press began on the backdrop */
  _pressedOutside = false;

  get _m(): DialogMessages {
    return { ...DEFAULT_DIALOG_MESSAGES, ...this.messages };
  }

  showModal(): void {
    this.open = true;
  }

  close(): void {
    this.open = false;
  }

  override updated(): void {
    const dialog = this._dialog;
    if (!dialog) return;
    if (this.open && !dialog.open) dialog.showModal();
    else if (!this.open && dialog.open) dialog.close();
  }

  _onClose(): void {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  }

  _onPointerDown(e: PointerEvent): void {
    this._pressedOutside = e.target === this._dialog && outside(this._dialog, e.clientX, e.clientY);
  }

  _onClick(e: MouseEvent): void {
    const dialog = this._dialog;
    const pressed = this._pressedOutside;
    this._pressedOutside = false;
    if (!this.backdropClose || !pressed || !dialog || e.target !== dialog) return;
    if (outside(dialog, e.clientX, e.clientY)) this.close();
  }

  override render() {
    return html`<dialog
      class="np-dialog"
      part="dialog"
      aria-label=${this.heading}
      @close=${() => this._onClose()}
      @pointerdown=${(e: PointerEvent) => this._onPointerDown(e)}
      @click=${(e: MouseEvent) => this._onClick(e)}
    >
      <div class="np-dialog-header" part="header">
        <h2 class="np-dialog-title">${this.heading}</h2>
        <button type="button" class="np-button np-text" part="button" @click=${() => this.close()}>
          ${this._m.close}
        </button>
      </div>
      <div class="np-dialog-body"><slot></slot></div>
    </dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-dialog': NpDialog;
  }
}
