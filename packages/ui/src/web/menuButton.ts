/**
 * <np-menu-button>: a "⋯" button that opens a menu of its children (`np-menu-item` buttons or
 * links, styled by the page or component they belong to). The menu opens under the button,
 * placed against the window (fixed), so a card or a scrolling box around it doesn't cut it off;
 * it closes on a choice, a click elsewhere, Escape, scrolling and resizing. `label` names the
 * button (default "More"). Parts: `button`, `menu`.
 */

import { css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DEFAULT_MENU_BUTTON_MESSAGES, type MenuButtonMessages } from './menuButtonMessages';
import { NpElement } from './npElement';
import { npStyles } from './styles';

export { DEFAULT_MENU_BUTTON_MESSAGES, type MenuButtonMessages } from './menuButtonMessages';

@customElement('np-menu-button')
export class NpMenuButton extends NpElement {
  static override styles = [
    ...npStyles,
    css`
      :host {
        position: relative;
        display: inline-block;
      }
      .np-menu {
        position: fixed;
        z-index: 1000;
      }
    `,
  ];

  /** The button's accessible name instead of "More" */
  @property() label?: string;
  @property({ attribute: false }) messages?: Partial<MenuButtonMessages>;

  @state() _open = false;
  /** Where the menu opens: under the button, its right edge at the button's (window pixels) */
  @state() _place = { top: 0, right: 0 };

  _onOutside = (e: Event) => {
    if (!e.composedPath().includes(this)) this._open = false;
  };

  _onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this._open = false;
  };

  _close = () => {
    this._open = false;
  };

  _toggle(button: HTMLElement): void {
    const box = button.getBoundingClientRect();
    this._place = { top: box.bottom + 4, right: Math.max(8, window.innerWidth - box.right) };
    this._open = !this._open;
  }

  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('_open')) return;
    if (this._open) this._listen();
    else this._unlisten();
  }

  _listen(): void {
    document.addEventListener('click', this._onOutside, true);
    document.addEventListener('keydown', this._onKey);
    window.addEventListener('scroll', this._close, true);
    window.addEventListener('resize', this._close);
  }

  _unlisten(): void {
    document.removeEventListener('click', this._onOutside, true);
    document.removeEventListener('keydown', this._onKey);
    window.removeEventListener('scroll', this._close, true);
    window.removeEventListener('resize', this._close);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unlisten();
  }

  override render() {
    const label = this.label ?? { ...DEFAULT_MENU_BUTTON_MESSAGES, ...this.messages }.more;
    return html`<button
        type="button"
        class="np-icon-button"
        part="button"
        aria-label=${label}
        title=${label}
        aria-haspopup="menu"
        aria-expanded=${this._open ? 'true' : 'false'}
        @click=${(e: Event) => this._toggle(e.currentTarget as HTMLElement)}
      >
        ⋯
      </button>
      ${
        this._open
          ? html`<div
              class="np-menu"
              part="menu"
              role="menu"
              style="top: ${this._place.top}px; right: ${this._place.right}px"
              @click=${() => {
                this._open = false;
              }}
            >
              <slot></slot>
            </div>`
          : nothing
      }`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-menu-button': NpMenuButton;
  }
}
