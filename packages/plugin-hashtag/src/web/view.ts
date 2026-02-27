/**
 * @nostr-post/plugin-hashtag - <np-hashtag-view>
 *
 * Read-only hashtag pill display.
 * Accepts .value (string[]) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('np-hashtag-view')
export class NpHashtagView extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .tag {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      background: #ede9fe;
      border-radius: 9999px;
      font-size: 0.8rem;
      color: #6d28d9;
      font-weight: 500;
    }
  `;

  @property({ type: Array })
  value: string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    const tags = Array.isArray(this.value) ? this.value : [];
    if (tags.length === 0) return nothing;

    return html`
      <div class="tags">
        ${tags.map((tag) => html`<span class="tag">#${tag}</span>`)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-hashtag-view': NpHashtagView;
  }
}
