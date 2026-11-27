/**
 * @nostr-post/plugin-links - Core
 *
 * The `links` field plugin (field `type: 'object'`): a list of support entries (`SupportLink`: a
 * link, a Bitcoin address or a note). Store it in a NIP-78 post's content
 * (`mapTo: { target: 'content', path }`), where the list stays a list of objects; a tag holds one
 * entry as JSON each. No DOM dependencies.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import { checkSupportLink, parseSupportLink, type SupportLink } from './links';

export const linksPlugin: NostrUIPlugin = {
  id: 'links',
  type: 'object',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const items = Array.isArray(value) ? value : [value];
    for (const [index, item] of items.entries()) {
      const entry = parseSupportLink(item);
      const checked = entry ? checkSupportLink(entry) : undefined;
      if (!checked?.success) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Entry ${index + 1}: ${checked ? checked.error.message : 'not a support entry'}`,
            code: 'INVALID_VALUE',
          },
        };
      }
    }
    return { success: true, data: undefined };
  },

  jsonSchema: () => ({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['link', 'bitcoin', 'note'] },
        value: { type: 'string', description: 'An https:// link, a Bitcoin address or a note' },
        label: { type: 'string' },
        icon: { type: 'string', description: 'An emoji' },
        description: { type: 'string', description: 'A line under the label' },
      },
      required: ['type', 'value'],
    },
  }),

  formatValue: (value: unknown): string =>
    (Array.isArray(value) ? value : [value])
      .map(parseSupportLink)
      .filter((entry): entry is SupportLink => entry !== undefined)
      .map((entry) => (entry.label ? `${entry.label}: ${entry.value}` : entry.value))
      .join(', '),

  serializeValue: (value: unknown): string => {
    const entry = parseSupportLink(value);
    return entry ? JSON.stringify(entry) : '';
  },

  deserializeValue: (raw: string): unknown => parseSupportLink(raw),
};
