/**
 * @nostr-post/plugin-stars - <np-stars-view>
 *
 * Read-only star rating display as a Lit web component.
 * Shows stars visually plus a [value]/[max] text indicator so
 * it works across rating systems (5-star, 10-point, percentage, etc.).
 *
 * Accepts .value (number) and .field (PostField).
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StarsPluginConfig } from '../core';

@customElement('np-stars-view')
export class NpStarsView extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .stars {
      display: inline-flex;
      gap: 0.0625rem;
    }

    .star {
      font-size: 1.25rem;
      line-height: 1;
    }

    .active {
      color: #fbbf24;
    }

    .inactive {
      color: #d1d5db;
    }

    .rating-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin-left: 0.25rem;
    }
  `;

  @property({ type: Number })
  value = 0;

  @property({ type: Object })
  field: PostField | null = null;

  private get config(): StarsPluginConfig {
    return (this.field?.metadata as StarsPluginConfig) || {};
  }

  render() {
    const max = this.config.max ?? 5;
    const rating = typeof this.value === 'number' ? this.value : 0;
    const stars = [];

    for (let i = 1; i <= max; i++) {
      const active = i <= rating;
      stars.push(
        html`<span class="star ${active ? 'active' : 'inactive'}"
          >${active ? '★' : '☆'}</span
        >`
      );
    }

    return html`
      <span class="stars">${stars}</span>
      <span class="rating-text">${rating}/${max}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-stars-view': NpStarsView;
  }
}
