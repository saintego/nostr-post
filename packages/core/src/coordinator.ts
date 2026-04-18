/**
 * @nostr-post/core - EventCoordinator
 *
 * The EventCoordinator takes a Manifest and Form Data, then produces a Bundle
 * of unsigned events with cross-linking tags. This is the heart of the
 * "split-storage" system.
 *
 * Architecture: Pure functional approach using data transformation pipelines.
 */

import { validateManifest } from './manifest';
import {
  type ResolvedPostField,
  getActiveKinds,
  getFieldTargets,
  getFieldsByKind,
} from './manifestMappings';
import type {
  EventBundle,
  FormData,
  NostrPostManifest,
  NostrTag,
  PostField,
  Result,
  UnsignedNostrEvent,
  ValidationError,
} from './types';

/**
 * Configuration for event coordination.
 */
export interface CoordinatorConfig {
  pubkey?: string; // Public key for the events (can be added later)
  createdAt?: number; // Unix timestamp (defaults to now)
  selectedFormatId?: string;
  activeKinds?: number[];
  /** Optional per-field tag serializer. Called with (value, field) before the default serializer. */
  tagSerializer?: (value: unknown, field: PostField) => string | undefined;
  /**
   * Optional manifest reference (`a` tag value) to embed in produced events.
   * Format: "30078:<pubkey>:nostr-post:<manifest-id>"
   * When set, each event gets an `["a", "<ref>"]` tag so viewers can auto-fetch the manifest.
   */
  manifestRef?: string;
  /**
   * Optional `d` tag value for parameterized replaceable events (kinds 30000-39999).
   * If not set, an empty string is used as default per NIP-01.
   */
  dTag?: string;
  /**
   * Optional hook to produce extra tags for a field value.
   * Called per tag field after the primary tag is emitted.
   * Used by plugins that need to emit multiple tags from a single field
   * (e.g. venue plugin emits NIP-73 "i" tags and "location" alongside the "g" geohash).
   */
  extraTagsFn?: (value: unknown, field: PostField) => [string, ...string[]][] | undefined;
}

/**
 * Validates form data against a manifest.
 */
export const validateFormData = (
  manifest: NostrPostManifest,
  formData: FormData,
  config: Pick<CoordinatorConfig, 'selectedFormatId' | 'activeKinds'> = {}
): Result<void, ValidationError[]> => {
  const errors: ValidationError[] = [];
  const activeKinds = getActiveKinds(manifest, config);

  // Check all required fields are present
  for (const field of manifest.fields) {
    const hasActiveMapping = getFieldTargets(field).some((target) =>
      activeKinds.includes(target.kind)
    );

    if (field.required && hasActiveMapping && !(field.id in formData)) {
      errors.push({
        field: field.id,
        message: `Required field "${field.id}" is missing`,
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  // Validate field types
  for (const [fieldId, value] of Object.entries(formData)) {
    const field = manifest.fields.find((f) => f.id === fieldId);

    if (!field) {
      errors.push({
        field: fieldId,
        message: `Unknown field "${fieldId}" not in manifest`,
        code: 'UNKNOWN_FIELD',
      });
      continue;
    }

    const typeValidation = validateFieldType(field, value);
    if (!typeValidation.success) {
      errors.push(typeValidation.error);
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors };
  }

  return { success: true, data: undefined };
};

/**
 * Validates a value against a field's type definition.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: typed validation matrix kept explicit for readability
const validateFieldType = (field: PostField, value: unknown): Result<void, ValidationError> => {
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
      if (typeof value !== 'string' || !field.options?.includes(value)) {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be one of: ${field.options?.join(', ')}`,
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
      if (typeof value !== 'string' || value.trim() === '') {
        return {
          success: false,
          error: {
            field: field.id,
            message: `Field "${field.id}" must be a non-empty string reference`,
            code: 'INVALID_REF',
          },
        };
      }
      break;
  }

  return { success: true, data: undefined };
};

/** Base32 alphabet used by geohash encoding. */
const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Type guard for geohash strings.
 */
const isValidGeohash = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (const ch of value) {
    if (!GEOHASH_BASE32.includes(ch)) return false;
  }
  return true;
};

const addAddressableDTagIfNeeded = (
  kind: number,
  tagFields: ResolvedPostField[],
  tags: NostrTag[],
  dTag?: string
) => {
  if (kind < 30000 || kind >= 40000) return;

  const hasDTag = tagFields.some((field) => field.mapTo.tagName === 'd');
  if (hasDTag) return;

  if (dTag !== undefined) {
    tags.push(['d', dTag]);
    return;
  }

  tags.push(['d', '']);
};

const buildContentForKind = (
  kind: number,
  contentFields: ResolvedPostField[],
  formData: FormData
): string => {
  if (contentFields.length === 0) {
    return kind === 30078 || kind === 30079 ? '{}' : '';
  }

  if (kind !== 30078 && kind !== 30079) {
    return contentFields
      .map((field) => formData[field.id])
      .filter((value) => value !== undefined)
      .join('\n');
  }

  const contentObj: Record<string, unknown> = {};
  for (const field of contentFields) {
    const value = formData[field.id];
    if (value === undefined) continue;

    if (field.mapTo.path) {
      setNestedValue(contentObj, field.mapTo.path, value);
      continue;
    }

    contentObj[field.id] = value;
  }

  return JSON.stringify(contentObj);
};

const extractGeohash = (value: unknown): string | undefined => {
  if (isValidGeohash(value)) {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'geohash' in value) {
    const geohash = (value as Record<string, unknown>).geohash;
    if (isValidGeohash(geohash)) {
      return geohash;
    }
  }

  return undefined;
};

const appendTagValue = (
  tags: NostrTag[],
  tagName: string,
  value: unknown,
  config: CoordinatorConfig,
  field: PostField
) => {
  const custom = config.tagSerializer?.(value, field);
  const stringValue = custom !== undefined ? custom : serializeTagValue(value);
  // Skip empty values — plugins can return '' from serializeValue to suppress emission
  if (!stringValue) return;
  tags.push([tagName, stringValue]);
};

const appendGeohashTags = (
  tags: NostrTag[],
  value: unknown,
  config: CoordinatorConfig,
  field: PostField
) => {
  const geohash = extractGeohash(value);
  if (!geohash) {
    appendTagValue(tags, 'g', value, config, field);
    return;
  }

  for (let len = geohash.length; len >= 2; len--) {
    tags.push(['g', geohash.slice(0, len)]);
  }
};

const appendTagMappings = (
  tagFields: ResolvedPostField[],
  formData: FormData,
  config: CoordinatorConfig,
  tags: NostrTag[]
) => {
  for (const field of tagFields) {
    const value = formData[field.id];
    if (value === undefined || !field.mapTo.tagName) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        appendTagValue(tags, field.mapTo.tagName, item, config, field);
      }
      continue;
    }

    if (field.mapTo.tagName === 'g') {
      appendGeohashTags(tags, value, config, field);
      continue;
    }

    appendTagValue(tags, field.mapTo.tagName, value, config, field);
  }
};

const appendExtraTags = (
  tagFields: ResolvedPostField[],
  formData: FormData,
  extraTagsFn: CoordinatorConfig['extraTagsFn'],
  tags: NostrTag[]
) => {
  if (!extraTagsFn) return;

  for (const field of tagFields) {
    const value = formData[field.id];
    if (value === undefined) continue;

    const extras = extraTagsFn(value, field);
    if (!extras) continue;

    for (const tag of extras) {
      tags.push(tag);
    }
  }
};

const dedupeTags = (tags: NostrTag[]): NostrTag[] => {
  const seen = new Set<string>();
  const deduped: NostrTag[] = [];

  for (const tag of tags) {
    const key = JSON.stringify(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(tag);
  }

  return deduped;
};

/**
 * Creates an unsigned Nostr event for a specific kind.
 */
const createEventForKind = (
  kind: number,
  fields: ResolvedPostField[],
  formData: FormData,
  config: CoordinatorConfig
): UnsignedNostrEvent => {
  const tags: NostrTag[] = [];

  const contentFields = fields.filter((f) => f.mapTo.target === 'content');
  const tagFields = fields.filter((f) => f.mapTo.target === 'tag');

  addAddressableDTagIfNeeded(kind, tagFields, tags, config.dTag);

  const content = buildContentForKind(kind, contentFields, formData);

  appendTagMappings(tagFields, formData, config, tags);
  appendExtraTags(tagFields, formData, config.extraTagsFn, tags);

  if (config.manifestRef) {
    tags.push(['a', config.manifestRef]);
  }

  return {
    kind,
    created_at: config.createdAt || Math.floor(Date.now() / 1000),
    tags: dedupeTags(tags),
    content,
    pubkey: config.pubkey || '',
  };
};

/**
 * Serializes a form value into a string suitable for a Nostr tag.
 * Handles primitive types; objects are JSON-serialized as fallback.
 */
const serializeTagValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
};

/**
 * Sets a nested value in an object using dot notation path.
 */
const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
};

/**
 * Adds cross-linking tags between events in a bundle.
 * This is a placeholder for future implementation of event references.
 */
const addCrossLinks = (events: UnsignedNostrEvent[]): UnsignedNostrEvent[] => {
  // Future: Add 'e' tags to link related events
  // For now, return events as-is
  return events;
};

/**
 * Coordinates the creation of a bundle of Nostr events from form data.
 *
 * This is the main entry point for the EventCoordinator.
 */
export const coordinateEvents = (
  manifest: NostrPostManifest,
  formData: FormData,
  config: CoordinatorConfig = {}
): Result<EventBundle, ValidationError[]> => {
  // Validate manifest
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.success) {
    return manifestValidation as Result<EventBundle, ValidationError[]>;
  }

  // Validate form data
  const formValidation = validateFormData(manifest, formData, config);
  if (!formValidation.success) {
    return formValidation as Result<EventBundle, ValidationError[]>;
  }

  const activeKinds = getActiveKinds(manifest, config);

  // If the manifest opts out of linking, strip the manifestRef from config
  const effectiveConfig =
    manifest.linkManifest === false ? { ...config, manifestRef: undefined } : config;

  // Create events for each required kind
  const events: UnsignedNostrEvent[] = [];

  for (const kind of activeKinds) {
    const fieldsForKind = getFieldsByKind(manifest, kind, activeKinds);
    if (fieldsForKind.length === 0) {
      continue;
    }
    const event = createEventForKind(kind, fieldsForKind, formData, effectiveConfig);
    events.push(event);
  }

  // Add cross-linking tags
  const linkedEvents = addCrossLinks(events);

  const bundle: EventBundle = {
    events: linkedEvents,
    manifest,
    metadata: {
      createdAt: config.createdAt || Math.floor(Date.now() / 1000),
      sourceForm: formData,
    },
  };

  return { success: true, data: bundle };
};
