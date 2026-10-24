/**
 * <np-completing-textarea>: the composer's text field when attached plugins offer completions
 * while typing (`textareaCompletion`, e.g. `@name` mentions). Typing after a trigger shows
 * what the plugin finds; ↑/↓ choose, Enter or Tab inserts, Esc closes.
 *
 * Light DOM, so the composer's textarea styles apply. Finding and replacing the typed text
 * is core's `completionAt` / `applyCompletion`.
 */

import {
  applyCompletion,
  type CompletionMatch,
  completionAt,
} from '@nostr-post/core/textCompletion';
import type { PostField, TextCompletion } from '@nostr-post/plugins/types';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

/** A plugin's completions, for the field it's attached with */
export interface Completer {
  trigger: string;
  search: (query: string, field: PostField) => Promise<TextCompletion[]>;
  field: PostField;
}

/** Wait this long after typing before searching; shorter queries aren't searched */
const SEARCH_DELAY_MS = 300;
const MIN_QUERY = 2;

@customElement('np-completing-textarea')
export class NpCompletingTextarea extends LitElement {
  @property({ attribute: false }) value = '';
  @property({ attribute: false }) completers: Completer[] = [];
  @property({ attribute: false }) onInput?: (value: string) => void;
  @property({ attribute: false }) onPaste?: (e: ClipboardEvent) => void;
  @property({ attribute: false }) onDrop?: (e: DragEvent) => void;

  @state() _items: TextCompletion[] = [];
  @state() _active = 0;

  _match?: CompletionMatch;
  _timer?: ReturnType<typeof setTimeout>;
  /** Counts searches, so an older, slower one doesn't replace a newer one's results */
  _searches = 0;

  override createRenderRoot() {
    return this;
  }

  get _textarea(): HTMLTextAreaElement | null {
    return this.querySelector('textarea');
  }

  _close(): void {
    clearTimeout(this._timer);
    this._searches++;
    this._match = undefined;
    this._items = [];
  }

  _onInput(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    this.onInput?.(textarea.value);
    const caret = textarea.selectionStart ?? textarea.value.length;
    for (const completer of this.completers) {
      const match = completionAt(textarea.value, caret, completer.trigger);
      if (!match || match.query.length < MIN_QUERY) continue;
      this._match = match;
      clearTimeout(this._timer);
      this._timer = setTimeout(() => void this._search(completer, match.query), SEARCH_DELAY_MS);
      return;
    }
    this._close();
  }

  async _search(completer: Completer, query: string): Promise<void> {
    const search = ++this._searches;
    const items = await completer.search(query, completer.field).catch(() => []);
    if (search !== this._searches) return;
    this._items = items.slice(0, 8);
    this._active = 0;
  }

  _pick(item: TextCompletion): void {
    const textarea = this._textarea;
    if (!textarea || !this._match) return;
    const { text, caret } = applyCompletion(textarea.value, this._match, item.insert);
    this._close();
    textarea.value = text;
    textarea.setSelectionRange(caret, caret);
    textarea.focus();
    this.onInput?.(text);
  }

  _onKeydown(e: KeyboardEvent): void {
    if (this._items.length === 0) return;
    const count = this._items.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this._active = (this._active + (e.key === 'ArrowDown' ? 1 : count - 1)) % count;
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const item = this._items[this._active];
      if (item) this._pick(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this._close();
    }
  }

  override render() {
    return html`
      <div class="completing">
        <textarea
          .value=${live(this.value)}
          @input=${this._onInput}
          @keydown=${this._onKeydown}
          @blur=${() => this._close()}
          @paste=${(e: ClipboardEvent) => this.onPaste?.(e)}
          @drop=${(e: DragEvent) => this.onDrop?.(e)}
          @dragover=${(e: DragEvent) => e.preventDefault()}
          aria-autocomplete="list"
          aria-expanded=${this._items.length > 0 ? 'true' : 'false'}
        ></textarea>
        ${
          this._items.length > 0
            ? html`<ul class="completions" role="listbox">
                ${this._items.map(
                  (item, index) => html`<li
                    role="option"
                    class=${index === this._active ? 'active' : ''}
                    aria-selected=${index === this._active ? 'true' : 'false'}
                    @mousedown=${(e: MouseEvent) => {
                      // Keep the textarea focused: the click inserts instead of closing
                      e.preventDefault();
                      this._pick(item);
                    }}
                  >
                    ${item.image ? html`<img src=${item.image} alt="" />` : html`<span class="no-image"></span>`}
                    <span class="label">${item.label}</span>
                    ${item.detail ? html`<span class="detail">${item.detail}</span>` : nothing}
                  </li>`
                )}
              </ul>`
            : nothing
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-completing-textarea': NpCompletingTextarea;
  }
}
