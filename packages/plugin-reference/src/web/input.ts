import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type ReferenceValue, normalizeExternalUrl } from '../core';

const EMPTY: ReferenceValue = { urls: [], p: [], q: [], a: [] };

const decodeValue = (value: unknown): ReferenceValue => {
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      return { ...EMPTY, ...(JSON.parse(value) as Partial<ReferenceValue>) };
    } catch {
      return { ...EMPTY };
    }
  }
  return { ...EMPTY };
};

@customElement('np-reference-input')
export class NpReferenceInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;
    }

    .input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .button {
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .button:hover {
      background: #f9fafb;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #fff;
    }

    .item a {
      flex: 1;
      color: #2563eb;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item a:hover {
      text-decoration: underline;
    }

    .remove {
      border: none;
      background: none;
      color: #dc2626;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }

    .hint {
      font-size: 0.75rem;
      color: #6b7280;
    }
  `;

  @property({ type: String })
  value = '';

  @property({ type: Object })
  field: PostField | null = null;

  @state() private draftUrl = '';

  private get refValue(): ReferenceValue {
    return decodeValue(this.value);
  }

  private emitValue(next: ReferenceValue) {
    this.value = JSON.stringify(next);
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private addUrl() {
    const raw = this.draftUrl.trim();
    if (!raw) return;
    const normalized = normalizeExternalUrl(raw);
    if (!/^https?:\/\//i.test(normalized)) return;

    const current = this.refValue;
    if (current.urls.includes(normalized)) {
      this.draftUrl = '';
      return;
    }

    this.emitValue({
      ...current,
      urls: [...current.urls, normalized],
    });
    this.draftUrl = '';
  }

  private removeUrl(url: string) {
    const current = this.refValue;
    this.emitValue({
      ...current,
      urls: current.urls.filter((candidate) => candidate !== url),
    });
  }

  render() {
    const refs = this.refValue;

    return html`
      <div class="container">
        <div class="row">
          <input
            class="input"
            type="url"
            .value=${this.draftUrl}
            placeholder="https://example.com"
            @input=${(e: Event) => {
              this.draftUrl = (e.target as HTMLInputElement).value;
            }}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                this.addUrl();
              }
            }}
          />
          <button type="button" class="button" @click=${this.addUrl} title="Add URL">
            Add URL
          </button>
        </div>
        <div class="hint">Add external links manually. URLs found in the attached field are also extracted automatically.</div>
        <div class="list">
          ${refs.urls.map(
            (url) => html`
              <div class="item">
                <a href=${url} target="_blank" rel="noopener">${url}</a>
                <button
                  type="button"
                  class="remove"
                  title="Remove URL"
                  @click=${() => this.removeUrl(url)}
                >×</button>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}
