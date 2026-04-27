/**
 * @nostr-post/plugin-wiki-entity - Core
 *
 * Plugin definition for the wiki-entity-picker field type.
 * Used in review manifests to select an entity and emit its `a` + `i` tags.
 *
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';

/**
 * Data shape stored for a wiki-entity-picker field.
 * This is what the coordinator sees in formData[fieldId].
 */
export interface WikiEntityData {
  /** NIP-54 d-tag of the selected entity (e.g. "pliny-the-elder") */
  dTag: string;
  /** Pubkey of the canonical (resolved) version of the entity */
  resolvedPubkey: string;
  /** All `i` tag values copied from the entity at selection time */
  externalIds: string[];
  /** Human-readable display name */
  displayName?: string;
}

/**
 * Metadata config available in the manifest field.
 * { "id": "beer", "uiPlugin": "wiki-entity-picker",
 *   "metadata": { "entityManifest": "beer-entity-v1" } }
 */
export interface WikiEntityPickerConfig {
  /** ID of the manifest that defines the entity type being picked */
  entityManifest?: string;
  /** Relays to search for entities */
  relays?: string[];
  /** Minimum characters before triggering a search */
  minSearchLength?: number;
}

export const wikiEntityPickerPlugin: NostrUIPlugin = {
  id: 'wiki-entity-picker',
  type: 'ref',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (value === undefined || value === null) {
      if (field.required) {
        return {
          success: false,
          error: {
            field: field.id,
            message: 'Please select an entity',
            code: 'REQUIRED',
          },
        };
      }
      return { success: true, data: undefined };
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Entity picker value must be an object',
          code: 'INVALID_TYPE',
        },
      };
    }

    const entity = value as Record<string, unknown>;
    if (typeof entity['dTag'] !== 'string' || entity['dTag'].length === 0) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Selected entity is missing a d-tag',
          code: 'INVALID_VALUE',
        },
      };
    }

    if (typeof entity['resolvedPubkey'] !== 'string' || entity['resolvedPubkey'].length === 0) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Selected entity is missing a resolved pubkey',
          code: 'INVALID_VALUE',
        },
      };
    }

    return { success: true, data: undefined };
  },

  /**
   * Serialises the field value into the canonical string that becomes the tag
   * value. For wiki-entity-picker this is the NIP-54 `a`-tag address:
   *   "30818:<resolvedPubkey>:<dTag>"
   *
   * This is what the coordinator writes as the primary tag value (combined
   * with `mapTo.tagName: 'a'`). `extraTags` is then reserved solely for
   * supplemental `i` tags copied from the entity.
   */
  serializeValue: (value: unknown): string => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const entity = value as WikiEntityData;
    return `30818:${entity.resolvedPubkey}:${entity.dTag}`;
  },

  /**
   * extraTags implementation.
   *
   * Emits only the `i` tags copied from the entity at selection time for
   * cross-platform discovery. The `a` tag is handled by `serializeValue`
   * together with the field's `mapTo.tagName: 'a'` — no duplication.
   */
  extraTags: (value: unknown, _field: PostField): [string, ...string[]][] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }
    const entity = value as WikiEntityData;
    const ids = Array.isArray(entity.externalIds) ? entity.externalIds : [];
    return ids.map((id): [string, string] => ['i', id]);
  },
};
