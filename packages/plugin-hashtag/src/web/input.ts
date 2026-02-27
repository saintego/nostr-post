/**
 * @nostr-post/plugin-hashtag - <np-hashtag-input>
 *
 * Chip-style hashtag editor with inline text input, remove buttons,
 * batch entry (comma/space separated), and optional suggestions.
 *
 * Accepts .value (string[]) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: string[] } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type HashtagPluginConfig, normalizeTag } from '../core';

@customElement('np-hashtag-input')
export class NpHashtagInput extends LitElement {
  static styles = css`
    :host { display: block; }
    .container { display: flex; flex-direction: column; gap: 0.5rem; }

    .chip-box {
      display: flex; flex-wrap: wrap; gap: 0.375rem; align-items: center;
      min-height: 2.25rem; padding: 0.375rem;
      border: 1px solid #d1d5db; border-radius: 6px; background: #fff;
      cursor: text; transition: border-color 0.15s;
    }
    .chip-box:focus-within {
      border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .chip {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.2rem 0.5rem; background: #ede9fe; border-radius: 9999px;
      font-size: 0.8rem; color: #6d28d9; font-weight: 500;
    }
    .chip .remove {
      background: none; border: none; cursor: pointer;
      color: #6d28d9; padding: 0 2px; font-size: 1rem; line-height: 1;
    }
    .chip .remove:hover { color: #4c1d95; }

    .inline-input {
      border: none; outline: none; flex: 1; min-width: 100px;
      font-size: 0.875rem; padding: 0.2rem; background: transparent;
    }

    .suggestions {
      display: flex; flex-wrap: wrap; gap: 0.25rem;
    }
    .suggestion-btn {
      padding: 0.15rem 0.5rem; border: 1px solid #e5e7eb; border-radius: 9999px;
      background: #f9fafb; cursor: pointer; font-size: 0.75rem; color: #6b7280;
      transition: background 0.15s;
    }
    .suggestion-btn:hover { background: #ede9fe; color: #6d28d9; border-color: #c4b5fd; }

    .hint { font-size: 0.75rem; color: #9ca3af; }
  `;

  @property({ type: Array })
  value: string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  @state() private inputValue = '';

  private get config(): HashtagPluginConfig {
    return (this.field?.metadata as HashtagPluginConfig) || {};
  }

  private get maxTags(): number {
    return this.config.maxTags ?? 20;
  }

  private get suggestions(): string[] {
    return (this.config.suggestions ?? []).filter((s) => !this.value.includes(s));
  }

  private emitValue(tags: string[]) {
    this.value = tags;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: tags },
        bubbles: true,
        composed: true,
      })
    );
  }

  private addTags(raw: string) {
    const newTags = raw
      .split(/[,\s]+/)
      .map(normalizeTag)
      .filter((t) => t.length > 0 && !this.value.includes(t));

    if (newTags.length === 0) return;
    if (this.value.length + newTags.length > this.maxTags) return;

    this.emitValue([...this.value, ...newTags]);
    this.inputValue = '';
  }

  private removeTag(tag: string) {
    this.emitValue(this.value.filter((t) => t !== tag));
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      this.addTags(this.inputValue);
    }
    if (e.key === 'Backspace' && this.inputValue === '' && this.value.length > 0) {
      this.emitValue(this.value.slice(0, -1));
    }
  }

  private handleBlur() {
    if (this.inputValue.trim()) {
      this.addTags(this.inputValue);
    }
  }

  private focusInput() {
    this.shadowRoot?.querySelector<HTMLInputElement>('.inline-input')?.focus();
  }

  render() {
    return html`
      <div class="container">
        <div class="chip-box" @click=${this.focusInput}>
          ${this.value.map(
            (tag) => html`
              <span class="chip">
                #${tag}
                <button type="button" class="remove" @click=${() => this.removeTag(tag)}>×</button>
              </span>
            `
          )}
          ${
            this.value.length < this.maxTags
              ? html`
            <input
              class="inline-input"
              type="text"
              placeholder=${this.value.length === 0 ? 'Add hashtags…' : ''}
              .value=${this.inputValue}
              @input=${(e: Event) => {
                this.inputValue = (e.target as HTMLInputElement).value;
              }}
              @keydown=${this.handleKeydown}
              @blur=${this.handleBlur}
            />
          `
              : nothing
          }
        </div>

        ${
          this.suggestions.length > 0
            ? html`
          <div class="suggestions">
            ${this.suggestions.map(
              (s) => html`
                <button type="button" class="suggestion-btn" @click=${() => this.addTags(s)}>#${s}</button>
              `
            )}
          </div>
        `
            : nothing
        }

        <div class="hint">Press Enter or comma to add. #hashtags in your post content are auto-included.</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-hashtag-input': NpHashtagInput;
  }
}
