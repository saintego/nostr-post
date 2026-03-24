import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

export interface IdentifierPluginConfig {
  prefix?: string;
}

const getPrefix = (field?: PostField): string | undefined => {
  const metadata = (field?.metadata as IdentifierPluginConfig | undefined) ?? {};
  const prefix = metadata.prefix?.trim().toLowerCase();
  return prefix || undefined;
};

const splitIdentifier = (value: string): { prefix?: string; body: string } => {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex === -1) {
    return { body: value.trim() };
  }

  return {
    prefix: value.slice(0, separatorIndex).trim().toLowerCase(),
    body: value.slice(separatorIndex + 1).trim(),
  };
};

const normalizeIdentifier = (value: unknown, field?: PostField): string => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const expectedPrefix = getPrefix(field);
  if (!expectedPrefix) return trimmed;

  const parts = splitIdentifier(trimmed);
  if (!parts.body) return '';
  return `${expectedPrefix}:${parts.body}`;
};

export const identifierPlugin: NostrUIPlugin = {
  id: 'identifier',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'string') {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Identifier must be a string',
          code: 'INVALID_TYPE',
        },
      };
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return { success: true, data: undefined };
    }

    const expectedPrefix = getPrefix(field);
    if (!expectedPrefix) {
      return { success: true, data: undefined };
    }

    const parts = splitIdentifier(trimmed);
    if (parts.prefix && parts.prefix !== expectedPrefix) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Identifier must use prefix ${expectedPrefix}:`,
          code: 'INVALID_PREFIX',
        },
      };
    }

    if (!parts.body) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Identifier value cannot be empty',
          code: 'EMPTY_IDENTIFIER',
        },
      };
    }

    return { success: true, data: undefined };
  },

  serializeValue: (value: unknown, field?: PostField): string => normalizeIdentifier(value, field),

  deserializeValue: (raw: string): unknown => raw,

  formatValue: (value: unknown): string => (typeof value === 'string' ? value : ''),
};
