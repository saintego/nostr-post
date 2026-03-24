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
      flex-wrap: wrap;
    }

    .star {
      font-size: 1.75rem;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.125rem;
      transition:
        transform 0.1s,
        color 0.15s;
      line-height: 1;
      position: relative;
      width: 1.75rem;
      height: 1.75rem;
    }

    .star:hover {
      transform: scale(1.2);
    }

    .star-glyph {
      position: absolute;
      inset: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      user-select: none;
    }

    .star-bg {
      color: #d1d5db;
    }

    .star-fill {
      color: #fbbf24;
      overflow: hidden;
      white-space: nowrap;
    }

    .value-label {
      margin-left: 0.5rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .value-input {
      margin-left: 0.5rem;
      width: 4.75rem;
      font-size: 0.875rem;
      padding: 0.125rem 0.375rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
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

  private get min(): number {
    return this.config.min ?? 1;
  }

  private get step(): number {
    const step = this.config.step ?? 1;
    return step > 0 ? step : 1;
  }

  private clampAndSnap(raw: number): number {
    const clamped = Math.min(this.max, Math.max(this.min, raw));
    const snapped = this.min + Math.round((clamped - this.min) / this.step) * this.step;
    return Number(snapped.toFixed(10));
  }

  private emitValue(next: number) {
    this.value = next;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: next },
        bubbles: true,
        composed: true,
      })
    );
  }

  private selectStar(event: MouseEvent, starIndex: number) {
    if (this.step >= 1) {
      this.emitValue(this.clampAndSnap(starIndex));
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const ratio = rect.width > 0 ? x / rect.width : 1;
    const raw = starIndex - 1 + ratio;
    this.emitValue(this.clampAndSnap(raw));
  }

  private onManualInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = Number.parseFloat(input.value);
    if (Number.isNaN(raw)) return;
    this.emitValue(this.clampAndSnap(raw));
  }

  private fillPercent(starIndex: number): number {
    const fill = this.value - (starIndex - 1);
    return Math.max(0, Math.min(1, fill)) * 100;
  }

  render() {
    const stars = [];
    for (let i = 1; i <= this.max; i++) {
      const fill = this.fillPercent(i);
      stars.push(html`
        <button
          type="button"
          class="star"
          @click=${(e: MouseEvent) => this.selectStar(e, i)}
          title="${i} star${i > 1 ? 's' : ''}"
        >
          <span class="star-glyph star-bg">★</span>
          <span class="star-glyph star-fill" style="width: ${fill}%">★</span>
        </button>
      `);
    }

    return html`
      <div class="stars-row">
        ${stars}
        <input
          class="value-input"
          type="number"
          min="${this.min}"
          max="${this.max}"
          step="${this.step}"
          .value=${String(this.value || '')}
          @input=${this.onManualInput}
          aria-label="Rating value"
        />
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
