/**
 * @nostr-post/plugin-stars - <np-stars-input>
 *
 * Interactive star rating input as a Lit web component.
 * Accepts .value (number) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: number } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StarsPluginConfig } from '../core';

@customElement('np-stars-input')
export class NpStarsInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .stars-row {
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }

    .star {
      font-size: 1.75rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.125rem;
      transition: transform 0.1s, color 0.15s;
      line-height: 1;
    }

    .star:hover {
      transform: scale(1.2);
    }

    .star.active {
      color: #fbbf24;
    }

    .star.inactive {
      color: #d1d5db;
    }

    .value-label {
      margin-left: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }
  `;

  @property({ type: Number })
  value = 0;

  @property({ type: Object })
  field: PostField | null = null;

  private get config(): StarsPluginConfig {
    return (this.field?.metadata as StarsPluginConfig) || {};
  }

  private get max(): number {
    return this.config.max ?? 5;
  }

  private selectStar(rating: number) {
    this.value = rating;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: rating },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const stars = [];
    for (let i = 1; i <= this.max; i++) {
      const active = i <= this.value;
      stars.push(html`
        <button
          type="button"
          class="star ${active ? 'active' : 'inactive'}"
          @click=${() => this.selectStar(i)}
          title="${i} star${i > 1 ? 's' : ''}"
        >${active ? '★' : '☆'}</button>
      `);
    }

    return html`
      <div class="stars-row">
        ${stars}
        ${
          this.config.showNumber
            ? html`<span class="value-label">${this.value}/${this.max}</span>`
            : ''
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-stars-input': NpStarsInput;
  }
}
