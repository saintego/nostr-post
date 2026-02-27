/**
 * @nostr-post/plugin-stars - Core
 *
 * Star rating plugin: validation, serialization, config.
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

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

  formatValue: (value: unknown): string => {
    if (typeof value !== 'number') return '0';
    const max = 5;
    return '★'.repeat(value) + '☆'.repeat(Math.max(0, max - value));
  },

  serializeValue: (value: unknown, field?: PostField): string => {
    const num = typeof value === 'number' ? value : 0;
    const config = (field?.metadata as StarsPluginConfig) || {};
    const max = config.max ?? 5;
    return `${num}/${max}`;
  },

  deserializeValue: (raw: string): unknown => {
    // Parse "3/5" or plain "3"
    if (raw.includes('/')) {
      return Number(raw.split('/')[0]);
    }
    return Number(raw);
  },
};
