/**
 * @nostr-post/plugin-markdown - Core
 *
 * Markdown editor plugin: validation, serialization.
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export interface MarkdownPluginConfig {
  /** Default editor mode ('raw' | 'wysiwyg'), default: 'wysiwyg' */
  defaultMode?: 'raw' | 'wysiwyg';
  /** Minimum length (default: 0) */
  minLength?: number;
  /** Maximum length (default: unlimited) */
  maxLength?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Editor min height in px (default: 200) */
  minHeight?: number;
}

export const markdownPlugin: NostrUIPlugin = {
  id: 'markdown',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'string') {
      if (field.required) {
        return {
          success: false,
          error: {
            field: field.id,
            message: 'Content is required',
            code: 'REQUIRED',
          },
        };
      }
      return { success: true, data: undefined };
    }

    const config = (field.metadata as MarkdownPluginConfig) || {};
    const min = config.minLength ?? 0;
    const max = config.maxLength;

    if (value.length < min) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Content must be at least ${min} characters`,
          code: 'TOO_SHORT',
        },
      };
    }

    if (max && value.length > max) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Content must be at most ${max} characters`,
          code: 'TOO_LONG',
        },
      };
    }

    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  },

  serializeValue: (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  },

  deserializeValue: (raw: string): unknown => {
    return raw;
  },
};
