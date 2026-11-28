/**
 * @nostr-post/core - Field type validation
 *
 * Checks a form value against its field's manifest type. Plugins check the details of
 * their values themselves (their validate hook).
 */

import { isFieldOptionValue, optionValue } from './enumOptions';
import { isValidGeohash } from './geohash';
import { isRefValue } from './postRoles';
import type { PostField, Result, ValidationError } from './types';

/**
 * Validates a value against a field's type definition.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: typed validation matrix kept explicit for readability
export function validateFieldType(field: PostField, value: unknown): Result<void, ValidationError> {
  switch (field.type) {
    case 'string':
      // Allow string[] for array-based plugins (media, hashtag)
      if (typeof value !== 'string' && !Array.isArray(value)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be a string or string array`,
            code: 'INVALID_TYPE',
          },
        };
      }
      if (Array.isArray(value) && value.some((v) => typeof v !== 'string')) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" array must contain only strings`,
            code: 'INVALID_TYPE',
          },
        };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be a valid number`,
            code: 'INVALID_TYPE',
          },
        };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be a boolean`,
            code: 'INVALID_TYPE',
          },
        };
      }
      break;

    case 'enum':
      if (!isFieldOptionValue(field, value)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be one of: ${field.options?.map(optionValue).join(', ')}`,
            code: 'INVALID_ENUM_VALUE',
          },
        };
      }
      break;

    case 'geo':
      // Accept a geohash string OR an object with a valid geohash property (e.g. VenueData)
      if (typeof value === 'object' && value !== null && 'geohash' in value) {
        if (!isValidGeohash((value as Record<string, unknown>).geohash)) {
          return {
            success: false,
            error: {
              field: field.id,
              message: `Field "${field.id}" must contain a valid geohash`,
              code: 'INVALID_GEO',
            },
          };
        }
      } else if (!isValidGeohash(value)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be a valid geohash string`,
            code: 'INVALID_GEO',
          },
        };
      }
      break;

    case 'ref':
      // A reference string (e.g. an address), or picked entities (`{ dTag, resolvedPubkey }`), also
      // ones without a page (yet): the plugin checks them (its validate hook)
      if (!isRefValue(value)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be a reference`,
            code: 'INVALID_REF',
          },
        };
      }
      break;

    case 'date': {
      // `{ start, end?, tzid? }` (the date plugin checks the dates themselves)
      const start = typeof value === 'object' && value !== null ? Reflect.get(value, 'start') : '';
      if (typeof start !== 'string' || start.trim() === '') {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be a date`,
            code: 'INVALID_DATE',
          },
        };
      }
      break;
    }

    case 'profile': {
      // People: `{ pubkey, role?, relay? }` or a list of them, each with a hex pubkey
      const people = Array.isArray(value) ? value : [value];
      const valid = people.every((person) => {
        const pubkey =
          typeof person === 'object' && person !== null ? Reflect.get(person, 'pubkey') : '';
        return typeof pubkey === 'string' && /^[0-9a-f]{64}$/.test(pubkey);
      });
      if (!valid) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must name people by their public key`,
            code: 'INVALID_PROFILE',
          },
        };
      }
      break;
    }

    case 'object': {
      // A plugin's structured value (e.g. support links): objects, one or a list; the plugin
      // checks what's in them (its validate hook)
      const items = Array.isArray(value) ? value : [value];
      if (
        !items.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
      ) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be an object or a list of objects`,
            code: 'INVALID_TYPE',
          },
        };
      }
      break;
    }
  }

  return { success: true, data: undefined };
}
