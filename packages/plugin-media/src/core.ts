/**
 * @nostr-post/plugin-media - Core
 *
 * Media (image/video) plugin supporting single URL or array of URLs.
 * When mapped to tags, each URL becomes a separate tag (e.g. ["r", url]).
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export interface MediaPluginConfig {
  /** Accepted MIME types (default: ['image/*', 'video/*']) */
  accept?: string[];
  /** Max file size in bytes for upload (default: 10MB) */
  maxSize?: number;
  /** Maximum number of files. Default: 10 */
  maxFiles?: number;
  /** Upload endpoint (default: nostr.build) */
  uploadUrl?: string;
  /** Show URL input field (default: true) */
  allowUrl?: boolean;
  /** Show file upload (default: true) */
  allowUpload?: boolean;
}

/** Check if a string is a plausible URL */
const isUrl = (s: string): boolean => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

/** Detect whether a URL points to a video */
export const isVideoUrl = (url: string): boolean =>
  url.startsWith('data:video') || /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);

/** Detect whether a URL points to an image */
export const isImageUrl = (url: string): boolean =>
  url.startsWith('data:image') ||
  /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url) ||
  url.includes('nostr.build');

/** Normalize value to a string array */
export const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
};

export const mediaPlugin: NostrUIPlugin = {
  id: 'media',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const urls = toArray(value);

    if (urls.length === 0 && field.required) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'At least one media file is required',
          code: 'MISSING_MEDIA',
        },
      };
    }

    const config = (field.metadata as MediaPluginConfig) || {};
    const max = config.maxFiles ?? 10;

    if (urls.length > max) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Maximum ${max} media files allowed`,
          code: 'TOO_MANY_FILES',
        },
      };
    }

    for (const url of urls) {
      if (!url.startsWith('data:') && !isUrl(url)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Invalid media URL: ${url}`,
            code: 'INVALID_URL',
          },
        };
      }
    }

    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string => {
    const urls = toArray(value);
    return urls.map((u) => (u.startsWith('data:') ? '[uploaded file]' : u)).join(', ');
  },

  /** Serialize array → single string or JSON array */
  serializeValue: (value: unknown): string => {
    const urls = toArray(value);
    return urls.length === 1 ? urls[0] : JSON.stringify(urls);
  },

  /** Deserialize back to array */
  deserializeValue: (raw: string): unknown => {
    if (!raw) return [];
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* fall through */
      }
    }
    return [raw];
  },
};
