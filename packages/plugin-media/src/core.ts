/**
 * @nostr-post/plugin-media - Core
 *
 * Media (image/video) plugin: validation, serialization.
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export interface MediaPluginConfig {
  /** Accepted MIME types (default: image/*,video/*) */
  accept?: string;
  /** Max file size in bytes for upload (default: 10MB) */
  maxSize?: number;
  /** Upload endpoint (default: nostr.build) */
  uploadUrl?: string;
  /** Show URL input field (default: true) */
  allowUrl?: boolean;
  /** Show file upload (default: true) */
  allowUpload?: boolean;
}

const URL_PATTERN = /^https?:\/\/.+/i;

export const mediaPlugin: NostrUIPlugin = {
  id: 'media',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'string' || value.trim() === '') {
      if (field.required) {
        return {
          success: false,
          error: {
            field: field.id,
            message: 'Media URL is required',
            code: 'REQUIRED',
          },
        };
      }
      return { success: true, data: undefined };
    }

    if (!URL_PATTERN.test(value)) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Must be a valid URL (https://...)',
          code: 'INVALID_URL',
        },
      };
    }

    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string => {
    if (typeof value !== 'string' || !value) return '';
    return value;
  },

  serializeValue: (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  },

  deserializeValue: (raw: string): unknown => {
    return raw;
  },
};
