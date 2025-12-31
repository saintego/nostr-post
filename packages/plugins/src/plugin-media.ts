/**
 * @nostr-post/plugins - Media upload plugin
 *
 * A plugin for handling image and video uploads
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from './types';

export interface MediaPluginConfig {
  accept?: string[]; // File types: ['image/*', 'video/*']
  maxSize?: number; // Max file size in bytes
  multiple?: boolean;
}

export const mediaPlugin: NostrUIPlugin = {
  id: 'media',
  type: 'string',
  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'string') {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Media URL must be a string',
          code: 'INVALID_TYPE',
        },
      };
    }

    // Basic URL validation
    try {
      new URL(value);
    } catch {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Invalid media URL',
          code: 'INVALID_URL',
        },
      };
    }

    return { success: true, data: undefined };
  },
};
