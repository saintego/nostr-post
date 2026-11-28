/**
 * @nostr-post/plugin-qr - Core
 *
 * The `qr` field plugin: a field whose value is text to show as a QR code (a `lightning:` or
 * `bitcoin:` URI, a `nostr:` link, a web link); `metadata.multiple` for several. Validation
 * checks that each fits in a QR code. No DOM dependencies.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import { qrMatrix } from './qr';

/** The texts of a field's value: one or a list, empty ones left out */
export const qrTexts = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.trim() !== ''
  );

export const qrPlugin: NostrUIPlugin = {
  id: 'qr',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const items = Array.isArray(value) ? value : [value];
    if (!items.every((item) => typeof item === 'string')) {
      return {
        success: false,
        error: { field: field.id, message: 'Must be text', code: 'INVALID_TYPE' },
      };
    }
    const tooLong = qrTexts(value).find((text) => !qrMatrix(text.trim()).success);
    return tooLong === undefined
      ? { success: true, data: undefined }
      : {
          success: false,
          error: { field: field.id, message: 'Too long for a QR code', code: 'TOO_LONG' },
        };
  },

  jsonSchema: (field: PostField) => {
    const one = { type: 'string', description: 'A lightning:, bitcoin:, nostr: or https: URI' };
    return field.metadata?.multiple === true ? { type: 'array', items: one } : one;
  },

  formatValue: (value: unknown): string => qrTexts(value).join(', '),
};
