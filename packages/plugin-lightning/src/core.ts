/**
 * @nostr-post/plugin-lightning - Core
 *
 * The `lightning` field plugin: a Lightning address (`alice@getalby.com`), an LNURL or a Nostr
 * profile (`npub`, `nprofile`) to pay; `metadata.multiple` for several, `metadata.amounts` for
 * the preset amounts in sats. No DOM dependencies.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import { parseLightningTarget } from './lnurl';

/** Preset amounts in sats when a field sets none */
export const DEFAULT_AMOUNTS = [21, 100, 1000, 5000];

/** A field's preset amounts in sats (`metadata.amounts`), else the defaults */
export const presetAmounts = (field?: PostField): number[] => {
  const amounts = field?.metadata?.amounts;
  const valid = Array.isArray(amounts)
    ? amounts.filter((a): a is number => typeof a === 'number' && a > 0 && Number.isInteger(a))
    : [];
  return valid.length > 0 ? valid : DEFAULT_AMOUNTS;
};

/** The payee texts of a field's value: one or a list, empty ones left out */
export const lightningTexts = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.trim() !== ''
  );

export const lightningPlugin: NostrUIPlugin = {
  id: 'lightning',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const items = Array.isArray(value) ? value : [value];
    const bad = items.find((item) => typeof item !== 'string' || !parseLightningTarget(item));
    return bad === undefined
      ? { success: true, data: undefined }
      : {
          success: false,
          error: {
            field: field.id,
            message: 'Not a Lightning address, LNURL or npub',
            code: 'INVALID_VALUE',
          },
        };
  },

  jsonSchema: (field: PostField) => {
    const one = { type: 'string', description: 'A Lightning address (name@domain) or an npub' };
    return field.metadata?.multiple === true ? { type: 'array', items: one } : one;
  },

  formatValue: (value: unknown): string => lightningTexts(value).join(', '),
};
