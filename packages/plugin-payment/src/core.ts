/**
 * @nostr-post/plugin-payment - Core
 *
 * The `payment` field plugin (also under its former id `lightning`): ways to pay, one or a list
 * (`metadata.multiple`), each a value a payment method recognises: a Lightning address
 * (`alice@getalby.com`), an LNURL or an npub, an on-chain Bitcoin address, or what an app's
 * methods add. `metadata.amounts`: the preset amounts in sats. No DOM dependencies.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import { detectPayment } from './methods';

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

/** The texts of a field's value: one or a list, empty ones left out */
export const paymentTexts = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is string => typeof v === 'string' && v.trim() !== ''
  );

const definition = (id: string): NostrUIPlugin => ({
  id,
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const items = Array.isArray(value) ? value : [value];
    const bad = items.find((item) => typeof item !== 'string' || !detectPayment(item));
    return bad === undefined
      ? { success: true, data: undefined }
      : {
          success: false,
          error: {
            field: field.id,
            message: 'Not a way to pay (a Lightning address, npub or Bitcoin address)',
            code: 'INVALID_VALUE',
          },
        };
  },

  jsonSchema: (field: PostField) => {
    const one = {
      type: 'string',
      description: 'A Lightning address (name@domain), an npub or a Bitcoin address',
    };
    return field.metadata?.multiple === true ? { type: 'array', items: one } : one;
  },

  formatValue: (value: unknown): string => paymentTexts(value).join(', '),
});

export const paymentPlugin: NostrUIPlugin = definition('payment');

/** The same plugin under its former id, for manifests that use `uiPlugin: 'lightning'` */
export const lightningPlugin: NostrUIPlugin = definition('lightning');
