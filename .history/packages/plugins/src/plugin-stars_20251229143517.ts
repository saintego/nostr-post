/**
 * @nostr-post/plugins - Stars rating plugin
 *
 * A plugin for rendering star ratings (1-5 stars)
 */

import type {
  FieldType,
  NostrUIPlugin,
  PostField,
  Result,
  ValidationError,
} from '../../core/src/types';

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
};
