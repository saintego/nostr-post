/**
 * @nostr-post/plugin-media - Core
 *
 * Media (image/video) plugin supporting single URL or array of URLs.
 * When mapped to tags, each URL becomes a separate tag (e.g. ["r", url]).
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import {
  describeMediaFiles,
  imetaUrls,
  mediaImetaTags,
  readsImeta,
  writesImeta,
} from './mediaFiles';
import { toArray } from './values';

export interface MediaPluginConfig {
  /** Accepted MIME types (default: ['image/*', 'video/*']) */
  accept?: string[];
  /** Max file size in bytes for upload (default: 10MB) */
  maxSize?: number;
  /** Maximum number of files. Default: 10 */
  maxFiles?: number;
  /**
   * NIP-96 / NIP-98 upload endpoint, tried after the Blossom servers (default: nostr.build,
   * where the server chooses the file's URL)
   */
  uploadUrl?: string;
  /**
   * Blossom servers to upload to (BUD-02: the file's URL is its hash), after the user's own
   * (their kind 10063 list) and before `uploadUrl`
   */
  blossomServers?: string[];
  /** `false`: don't upload to the user's own Blossom servers (their kind 10063 list) */
  userServers?: boolean;
  /**
   * Also write an `imeta` tag per file (NIP-92: type, hash, size, dimensions) next to the
   * mapped tag. Fields mapped to the `imeta` tag itself (NIP-68 pictures, kind 20) always do
   */
  imeta?: boolean;
  /** Show URL input field (default: true) */
  allowUrl?: boolean;
  /** Show file upload (default: true) */
  allowUpload?: boolean;
  /**
   * Auto-extract image/video URLs from the attachTo field (or urlAutoExtractFrom).
   * Default: true
   */
  urlAutoExtract?: boolean;
  /**
   * Field ID to auto-extract media URLs from. Deprecated — prefer PostField.attachTo.
   * Used only for legacy manifests that have not been updated to use attachTo.
   */
  urlAutoExtractFrom?: string;
  /**
   * Photo quality before the user picks one (they can change it; their pick is remembered).
   * Default 'mid'
   */
  quality?: MediaQuality;
  /** Let the user pick the photo quality (default: true) */
  qualityChoice?: boolean;
  /**
   * Keep JPEG photos' metadata (EXIF: where and when it was taken, the camera), e.g. for a
   * photo log. By default it's removed before upload. Shrinking (Low, Medium) drops it anyway:
   * it's kept at Full quality
   */
  keepMetadata?: boolean;
  /**
   * `false`: never offer "Upload later" in this field, even where the composer does
   * (`upload-later`), e.g. a photo the post can't wait for
   */
  uploadLater?: boolean;
  /**
   * A description per photo for people who can't see it (`alt` in its `imeta` tag, NIP-92):
   * an input under each photo
   */
  alt?: boolean;
}

/** How much photos are shrunk on the device before upload: smaller uploads faster */
export type MediaQuality = 'low' | 'mid' | 'full';

export const MEDIA_QUALITIES: readonly MediaQuality[] = ['low', 'mid', 'full'];

/** Longest side (px) and JPEG quality per level; `full` uploads the original file */
export const MEDIA_QUALITY_PRESETS: Record<
  MediaQuality,
  { maxSide: number; jpegQuality: number } | undefined
> = {
  low: { maxSide: 1280, jpegQuality: 0.7 },
  mid: { maxSide: 2048, jpegQuality: 0.82 },
  full: undefined,
};

export const isMediaQuality = (value: unknown): value is MediaQuality =>
  MEDIA_QUALITIES.includes(value as MediaQuality);

/**
 * Whether a file type is accepted by `accept` (MIME types, `image/*` style wildcards; default
 * photos and videos)
 */
export const acceptsType = (
  type: string,
  accept: readonly string[] = ['image/*', 'video/*']
): boolean =>
  accept.some((pattern) =>
    pattern.endsWith('/*')
      ? type.startsWith(pattern.slice(0, -1))
      : pattern.toLowerCase() === type.toLowerCase()
  );

/** Whether a file of this type is shrunk: photos, not GIFs (animation), SVGs or videos */
export const isCompressibleImage = (type: string): boolean =>
  /^image\/(jpeg|png|webp|heic|heif|avif)$/i.test(type);

/**
 * Why an upload failed: no connection (`network`), no progress for a while (`stalled`), the
 * server failed (`server`, HTTP 5xx), refused it or answered nonsense (`rejected`), or the
 * user stopped it (`cancelled`)
 */
/** `sign-in`: the server wants NIP-98 auth and no one is signed in */
export type UploadFailureKind =
  | 'network'
  | 'stalled'
  | 'server'
  | 'rejected'
  | 'sign-in'
  | 'cancelled';

/** An upload aborts when no progress arrives for this long (ms); once sent, twice as long */
export const UPLOAD_STALL_MS = 30_000;

/** Waits before trying a failed upload again (ms): two retries */
export const UPLOAD_RETRY_DELAYS_MS: readonly number[] = [3_000, 10_000];

/** Whether trying again may help: the connection or the server, not a refusal or the user */
export const isRetryableUpload = (kind: UploadFailureKind): boolean =>
  kind === 'network' || kind === 'stalled' || kind === 'server';

/** Size that fits `maxSide`, keeping the aspect ratio; never larger than the original */
export const scaledSize = (
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } => {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

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

export { toArray } from './values';

/** Extract image/video URLs from a text string. */
export const extractMediaUrls = (text: string): string[] => {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const raw of matches) {
    if (seen.has(raw) || (!isImageUrl(raw) && !isVideoUrl(raw))) continue;
    if (!isUrl(raw)) continue;
    seen.add(raw);
    urls.push(raw);
  }
  return urls;
};

export const mediaPlugin: NostrUIPlugin = {
  id: 'media',
  type: 'string',

  enrichFormData: (
    formData: Record<string, unknown>,
    field: PostField
  ): Record<string, unknown> => {
    const config = (field.metadata as MediaPluginConfig) ?? {};
    if (config.urlAutoExtract === false) return {};
    // Resolve source field by manifest field ID. No implicit default.
    const sourceField = field.attachTo ?? config.urlAutoExtractFrom;
    if (!sourceField) return {};
    const content =
      typeof formData[sourceField] === 'string' ? (formData[sourceField] as string) : '';
    if (!content) return {};

    const urls = extractMediaUrls(content);
    if (!urls.length) return {};

    const existing = toArray(formData[field.id]);
    const existingSet = new Set(existing);
    const newUrls = urls.filter((u) => !existingSet.has(u));
    if (!newUrls.length) return {};

    return { [field.id]: [...existing, ...newUrls] };
  },

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
      // `pending:` a file that uploads later: its URL replaces it before the post is signed
      if (!url.startsWith('data:') && !url.startsWith('pending:') && !isUrl(url)) {
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

  jsonSchema: () => ({
    type: 'array',
    items: { type: 'string', description: 'An image or video URL (https://…)' },
  }),

  /** Photos or videos, portrait or not: a publish format's `select` picks by them */
  describeMedia: (value: unknown) => describeMediaFiles(value),

  formatValue: (value: unknown): string => {
    const urls = toArray(value);
    return urls.map((u) => (u.startsWith('data:') ? '[uploaded file]' : u)).join(', ');
  },

  /**
   * Serialize array → single string or JSON array. Nothing for the `imeta` tag: `extraTags`
   * writes whole `imeta` tags
   */
  serializeValue: (value: unknown, field?: PostField): string => {
    if (field && readsImeta(field)) return '';
    const urls = toArray(value);
    return urls.length === 1 ? (urls[0] ?? '') : JSON.stringify(urls);
  },

  /** An `imeta` tag per file (type, hash, size, dimensions as far as known), when the field writes them */
  extraTags: (value: unknown, field: PostField): [string, ...string[]][] =>
    writesImeta(field) ? mediaImetaTags(value) : [],

  /** For a field mapped to `imeta`: its files' URLs; otherwise the default reading of its tag */
  resolveFromTags: (tags: string[][], field: PostField): unknown => {
    if (!readsImeta(field)) return undefined;
    const urls = imetaUrls(tags);
    return urls.length > 0 ? urls : undefined;
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
