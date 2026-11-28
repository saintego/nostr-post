/**
 * <np-copy>: a button that copies `text` to the clipboard and says so ("Copied", or "Couldn't
 * copy" when the browser refuses) for a moment. `label` replaces its text (default "Copy").
 * Fires `np-copied` with `{ ok }`. Part: `button`.
 */

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type CopyMessages, DEFAULT_COPY_MESSAGES } from './copyMessages';
import { NpElement } from './npElement';
import { npStyles } from './styles';

export { type CopyMessages, DEFAULT_COPY_MESSAGES } from './copyMessages';

/** How long "Copied" shows, in ms */
const SHOWN_MS = 1500;

/** Copies text to the clipboard; false when the browser refuses or has no clipboard */
export const copyText = async (text: string): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => false);
};

@customElement('np-copy')
export class NpCopy extends NpElement {
  static override styles = [...npStyles];

  @property() text = '';
  /** The button's text instead of "Copy" */
  @property() label?: string;
  @property({ attribute: false }) messages?: Partial<CopyMessages>;

  @state() _result?: boolean;
  _timer?: ReturnType<typeof setTimeout>;

  get _m(): CopyMessages {
    return { ...DEFAULT_COPY_MESSAGES, ...this.messages };
  }

  async _copy(): Promise<void> {
    const ok = await copyText(this.text);
    this._result = ok;
    this.dispatchEvent(
      new CustomEvent('np-copied', { detail: { ok }, bubbles: true, composed: true })
    );
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._result = undefined;
    }, SHOWN_MS);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  override render() {
    const m = this._m;
    const text =
      this._result === undefined ? (this.label ?? m.copy) : this._result ? m.copied : m.failed;
    return html`<button
      type="button"
      class="np-button np-small"
      part="button"
      aria-live="polite"
      ?disabled=${!this.text}
      @click=${() => this._copy()}
    >
      ${text}
    </button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-copy': NpCopy;
  }
}
