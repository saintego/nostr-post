/**
 * @nostr-post/plugin-wiki-entity - Core
 *
 * Plugin definition for the wiki-entity-picker field type.
 * Used in review manifests to select an entity and emit its `a` + `i` tags.
 *
 * No DOM dependencies — safe for SSR/Node.
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from '@nostr-post/plugins/types';
import { normalizeDTag } from '@nostr-post/wiki';

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
  /**
   * Set to `false` to suppress `extraTags` emission for this field.
   * Useful when referencing an entity from another entity manifest to avoid
   * copying the referenced entity's `i` tags into the referencing event.
   * Defaults to `true` (extra tags are emitted).
   */
  emitExtraTags?: boolean;
}

/** Parses a `30818:<pubkey>:<d-tag>` address into a minimal entity value. */
function parseWikiAddress(raw: string): WikiEntityData | undefined {
  const parts = raw.split(':');
  if (parts.length < 3 || parts[0] !== '30818') {
    return undefined;
  }
  const resolvedPubkey = parts[1];
  const dTag = parts.slice(2).join(':');
  if (!resolvedPubkey || !dTag) {
    return undefined;
  }
  return { dTag, resolvedPubkey, externalIds: [] };
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
    if (typeof entity.dTag !== 'string' || entity.dTag.length === 0) {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Selected entity is missing a d-tag',
          code: 'INVALID_VALUE',
        },
      };
    }

    if (typeof entity.resolvedPubkey !== 'string' || entity.resolvedPubkey.length === 0) {
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
   * Deserialises the canonical NIP-54 `a`-tag address back into the minimal
   * structured value expected by the picker for prefill/edit flows.
   */
  deserializeValue: (raw: string, _field: PostField): WikiEntityData | undefined =>
    parseWikiAddress(raw),

  /**
   * Rebuilds the full entity value from an event's tags for view/edit flows.
   * Unlike `deserializeValue` (single tag value only), this also restores the
   * `i` tags copied from the entity, so re-publishing an edit keeps them.
   */
  resolveFromTags: (tags: string[][], field: PostField): WikiEntityData | undefined => {
    const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
    const tagName = targets.find((t) => t.target === 'tag' && t.tagName)?.tagName ?? 'a';
    const address = tags.find((t) => t[0] === tagName && t[1]?.startsWith('30818:'))?.[1];
    if (!address) return undefined;
    const entity = parseWikiAddress(address);
    if (!entity) return undefined;
    const config = field.metadata as WikiEntityPickerConfig | undefined;
    if (config?.emitExtraTags !== false) {
      entity.externalIds = tags.filter((t) => t[0] === 'i' && t[1]).map((t) => t[1]);
    }
    return entity;
  },

  /**
   * extraTags implementation.
   *
   * Emits only the `i` tags copied from the entity at selection time for
   * cross-platform discovery. The `a` tag is handled by `serializeValue`
   * together with the field's `mapTo.tagName: 'a'` — no duplication.
   */
  extraTags: (value: unknown, field: PostField): [string, ...string[]][] => {
    const config = field.metadata as WikiEntityPickerConfig | undefined;
    if (config?.emitExtraTags === false) return [];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return [];
    }
    const entity = value as WikiEntityData;
    const ids = Array.isArray(entity.externalIds) ? entity.externalIds : [];
    return ids.map((id): [string, string] => ['i', id]);
  },
};

/**
 * Client-side relevance check for search results: true when the entity's
 * title or d-tag contains the query (case-insensitive, also comparing the
 * normalized slug form so "pliny the" matches "pliny-the-elder").
 */
export function matchesEntityQuery(tags: string[][], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const slug = normalizeDTag(q);
  const dTag = tags.find((t) => t[0] === 'd')?.[1]?.toLowerCase() ?? '';
  const title = tags.find((t) => t[0] === 'title')?.[1]?.toLowerCase() ?? '';
  return title.includes(q) || dTag.includes(q) || (slug !== '' && dTag.includes(slug));
}
