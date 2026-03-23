/**
 * @nostr-post/plugin-hashtag - Core
 *
 * Hashtag chip input plugin: validation, serialization, normalization.
 * Stores as an array of strings. The coordinator maps each entry
 * to a separate ["t", "tag"] Nostr tag.
 *
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export interface HashtagPluginConfig {
  /** Maximum number of hashtags allowed. Default: 20 */
  maxTags?: number;
  /** Suggested/popular tags to offer in autocomplete */
  suggestions?: string[];
  /**
   * When true, also scan a named content field for #hashtags
   * and merge them in. Default: true
   */
  autoExtract?: boolean;
  /** Field ID to auto-extract from (defaults to "content") */
  autoExtractFrom?: string;
}

/** Normalise a single hashtag: lowercase, strip leading #, trim. */
export const normalizeTag = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^\w\u0080-\uffff-]/g, '')
    .trim();

/** Extract #hashtags from a text string. */
export const extractHashtags = (text: string): string[] => {
  const matches = text.match(/#[\w\u0080-\uffff][\w\u0080-\uffff-]*/g);
  if (!matches) return [];
  return [...new Set(matches.map(normalizeTag).filter(Boolean))];
};

export const hashtagPlugin: NostrUIPlugin = {
  id: 'hashtag',
  type: 'string',

  enrichFormData: (
    formData: Record<string, unknown>,
    field: PostField
  ): Record<string, unknown> => {
    const config = (field.metadata as HashtagPluginConfig) ?? {};
    if (config.autoExtract === false) return {};
    const contentField = config.autoExtractFrom ?? 'content';
    const content =
      typeof formData[contentField] === 'string' ? (formData[contentField] as string) : '';
    if (!content) return {};
    const existing = Array.isArray(formData[field.id]) ? (formData[field.id] as string[]) : [];
    const existingSet = new Set(existing);
    const newTags = extractHashtags(content).filter((t) => !existingSet.has(t));
    if (!newTags.length) return {};
    return { [field.id]: [...existing, ...newTags] };
  },

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (!Array.isArray(value)) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Hashtags must be an array of strings',
          code: 'INVALID_TYPE',
        },
      };
    }

    const config = (field.metadata as HashtagPluginConfig) || {};
    const max = config.maxTags ?? 20;

    if (value.length > max) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Maximum ${max} hashtags allowed`,
          code: 'TOO_MANY_TAGS',
        },
      };
    }

    for (const tag of value) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        return {
          success: false,
          error: {
            field: field.id,
            message: 'Each hashtag must be a non-empty string',
            code: 'INVALID_TAG',
          },
        };
      }
    }

    return { success: true, data: undefined };
  },

  /**
   * Serialize: array → comma-separated string.
   * The coordinator will call this when mapping to a single tag value,
   * but the preferred path is the multi-tag expansion in createEventForKind.
   */
  serializeValue: (value: unknown): string => {
    if (Array.isArray(value)) return value.join(',');
    return String(value);
  },

  /** Deserialize: comma-separated string → array */
  deserializeValue: (raw: string): unknown => {
    if (!raw) return [];
    return raw.split(',').map(normalizeTag).filter(Boolean);
  },

  formatValue: (value: unknown): string => {
    if (Array.isArray(value)) return value.map((t) => `#${t}`).join(' ');
    return '';
  },
};
