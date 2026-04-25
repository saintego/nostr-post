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
   * extraTags implementation.
   *
   * Given the WikiEntityData selected by the picker, returns the tags to
   * append to the published event:
   *   ["a", "30818:<pubkey>:<dTag>"]
   *   ["i", "<externalId>"]  (one per external ID)
   */
  extraTags: (value: unknown, _field: PostField): [string, ...string[]][] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }
    const entity = value as WikiEntityData;
    const result: [string, ...string[]][] = [
      ['a', `30818:${entity.resolvedPubkey}:${entity.dTag}`],
    ];

    for (const id of entity.externalIds ?? []) {
      result.push(['i', id]);
    }

    return result;
  },
};
