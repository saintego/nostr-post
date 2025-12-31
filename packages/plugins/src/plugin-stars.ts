/**
 * @nostr-post/plugins - Stars rating plugin
 *
 * A plugin for rendering star ratings (1-5 stars)
 */

import type { NostrUIPlugin, PostField, RenderContext, Result, ValidationError } from './types';

export interface StarsPluginConfig {
  min?: number;
  max?: number;
  step?: number;
  showNumber?: boolean;
}

export const starsPlugin: NostrUIPlugin = {
  id: 'stars',
  type: 'number',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'number') {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Rating must be a number',
          code: 'INVALID_TYPE',
        },
      };
    }

    const config = (field.metadata as StarsPluginConfig) || {};
    const min = config.min ?? 1;
    const max = config.max ?? 5;

    if (value < min || value > max) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Rating must be between ${min} and ${max}`,
          code: 'OUT_OF_RANGE',
        },
      };
    }

    return { success: true, data: undefined };
  },

  renderInput: (ctx: RenderContext): HTMLElement => {
    const config = (ctx.field.metadata as StarsPluginConfig) || {};
    const max = config.max ?? 5;
    const currentValue = typeof ctx.value === 'number' ? ctx.value : 0;

    const container = document.createElement('div');
    container.className = 'stars-plugin-input';
    container.style.cssText = 'display: flex; gap: 0.25rem; align-items: center;';

    // Create star buttons
    for (let i = 1; i <= max; i++) {
      const star = document.createElement('button');
      star.type = 'button';
      star.textContent = i <= currentValue ? '★' : '☆';
      star.style.cssText = `
        font-size: 1.5rem;
        background: none;
        border: none;
        cursor: pointer;
        color: ${i <= currentValue ? '#fbbf24' : '#d1d5db'};
        padding: 0.25rem;
      `;
      star.onclick = () => ctx.onChange(i);
      container.appendChild(star);
    }

    if (config.showNumber) {
      const label = document.createElement('span');
      label.textContent = `${currentValue}/${max}`;
      label.style.cssText = 'margin-left: 0.5rem; color: #6b7280;';
      container.appendChild(label);
    }

    return container;
  },

  renderView: (value: unknown, field: PostField): HTMLElement => {
    const config = (field.metadata as StarsPluginConfig) || {};
    const max = config.max ?? 5;
    const rating = typeof value === 'number' ? value : 0;

    const container = document.createElement('div');
    container.className = 'stars-plugin-view';
    container.style.cssText = 'display: flex; gap: 0.125rem; color: #fbbf24;';

    for (let i = 1; i <= max; i++) {
      const star = document.createElement('span');
      star.textContent = i <= rating ? '★' : '☆';
      star.style.fontSize = '1.25rem';
      container.appendChild(star);
    }

    return container;
  },

  formatValue: (value: unknown): string => {
    return typeof value === 'number' ? value.toFixed(1) : '0';
  },
};
