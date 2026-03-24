import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ReferenceValue } from '../core';

const decodeValue = (value: unknown): ReferenceValue => {
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as Partial<ReferenceValue>;
      return {
        urls: parsed.urls ?? [],
        p: parsed.p ?? [],
        q: parsed.q ?? [],
        a: parsed.a ?? [],
      };
    } catch {
      return { urls: [], p: [], q: [], a: [] };
    }
  }
  return { urls: [], p: [], q: [], a: [] };
};

@customElement('np-reference-view')
export class NpReferenceView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    a {
      color: #2563eb;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    a:hover {
      text-decoration: underline;
    }
  `;

  @property({ type: String })
  value = '';

  render() {
    const refs = decodeValue(this.value);
    if (!refs.urls.length) return nothing;

    return html`
      <div class="list">
        ${refs.urls.map((url) => html`<a href=${url} target="_blank" rel="noopener">${url}</a>`)}
      </div>
    `;
  }
}
