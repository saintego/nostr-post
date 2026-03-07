/**
 * @nostr-post/core - EventCoordinator
 *
 * The EventCoordinator takes a Manifest and Form Data, then produces a Bundle
 * of unsigned events with cross-linking tags. This is the heart of the
 * "split-storage" system.
 *
 * Architecture: Pure functional approach using data transformation pipelines.
 */

import { getFieldsByKind, validateManifest } from './manifest';
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
  formData: FormData
): Result<void, ValidationError[]> => {
  const errors: ValidationError[] = [];

  // Check all required fields are present
  for (const field of manifest.fields) {
    if (field.required && !(field.id in formData)) {
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

/**
 * Creates an unsigned Nostr event for a specific kind.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: event construction intentionally handles multiple Nostr mapping modes
const createEventForKind = (
  kind: number,
  fields: PostField[],
  formData: FormData,
  config: CoordinatorConfig
): UnsignedNostrEvent => {
  const tags: NostrTag[] = [];
  let content = '';

  // Separate fields by target type
  const contentFields = fields.filter((f) => f.mapTo.target === 'content');
  const tagFields = fields.filter((f) => f.mapTo.target === 'tag');

  // For parameterized replaceable events (kinds 30000-39999), auto-add `d` tag
  if (kind >= 30000 && kind < 40000) {
    // Use manifest id as the d-tag identifier if no explicit d tag exists in the fields
    const hasDTag = tagFields.some((f) => f.mapTo.tagName === 'd');
    if (!hasDTag && config.dTag !== undefined) {
      tags.push(['d', config.dTag]);
    } else if (!hasDTag) {
      // Default d-tag: empty string (NIP-01 spec requires it for addressable events)
      tags.push(['d', '']);
    }
  }

  // Build content (for NIP-78, this will be JSON)
  if (contentFields.length > 0) {
    if (kind === 30078 || kind === 30079) {
      // NIP-78: Structured JSON content
      const contentObj: Record<string, unknown> = {};
      for (const field of contentFields) {
        const value = formData[field.id];
        if (value !== undefined) {
          // Handle path-based storage
          if (field.mapTo.path) {
            setNestedValue(contentObj, field.mapTo.path, value);
          } else {
            contentObj[field.id] = value;
          }
        }
      }
      content = JSON.stringify(contentObj);
    } else {
      // Simple text content (Kind 1, etc.)
      content = contentFields
        .map((f) => formData[f.id])
        .filter((v) => v !== undefined)
        .join('\n');
    }
  }

  // Build tags
  for (const field of tagFields) {
    const value = formData[field.id];
    if (value !== undefined && field.mapTo.tagName) {
      // Array values → one tag per element (hashtags, media URLs, etc.)
      if (Array.isArray(value)) {
        for (const item of value) {
          const custom = config.tagSerializer?.(item, field);
          const stringValue = custom !== undefined ? custom : serializeTagValue(item);
          tags.push([field.mapTo.tagName, stringValue]);
        }
      } else if (field.mapTo.tagName === 'g') {
        // NIP-52: emit geohash at all prefix lengths for relay-side filtering
        // Accept either a geohash string or an object with a .geohash property (e.g. VenueData)
        let gh: string | undefined;
        if (isValidGeohash(value)) {
          gh = value as string;
        } else if (
          typeof value === 'object' &&
          value !== null &&
          'geohash' in value &&
          isValidGeohash((value as Record<string, unknown>).geohash)
        ) {
          gh = (value as Record<string, string>).geohash;
        }

        if (gh) {
          // e.g. "u09tvw" → ["g","u09tvw"], ["g","u09tv"], ["g","u09t"], ["g","u09"], ["g","u0"]
          for (let len = gh.length; len >= 2; len--) {
            tags.push(['g', gh.slice(0, len)]);
          }
        } else {
          const custom = config.tagSerializer?.(value, field);
          const stringValue = custom !== undefined ? custom : serializeTagValue(value);
          tags.push([field.mapTo.tagName, stringValue]);
        }
      } else {
        const custom = config.tagSerializer?.(value, field);
        const stringValue = custom !== undefined ? custom : serializeTagValue(value);
        tags.push([field.mapTo.tagName, stringValue]);
      }
    }
  }

  // Call extraTagsFn hook for each tag field (plugin-provided extra tags)
  if (config.extraTagsFn) {
    for (const field of tagFields) {
      const value = formData[field.id];
      if (value !== undefined) {
        const extras = config.extraTagsFn(value, field);
        if (extras) {
          for (const tag of extras) {
            tags.push(tag);
          }
        }
      }
    }
  }

  // Auto-extract #hashtags from content into `t` tags (NIP-12)
  if (content && kind === 1) {
    const hashtagMatches = content.match(/#[\w\u0080-\uffff][\w\u0080-\uffff-]*/g);
    if (hashtagMatches) {
      // Collect existing `t` tags to avoid duplicates
      const existingT = new Set(tags.filter((t) => t[0] === 't').map((t) => t[1]));
      for (const match of hashtagMatches) {
        const tag = match.slice(1).toLowerCase();
        if (tag && !existingT.has(tag)) {
          tags.push(['t', tag]);
          existingT.add(tag);
        }
      }
    }
  }

  // Add manifest reference tag if configured
  if (config.manifestRef) {
    tags.push(['a', config.manifestRef]);
  }

  return {
    kind,
    created_at: config.createdAt || Math.floor(Date.now() / 1000),
    tags,
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
  const formValidation = validateFormData(manifest, formData);
  if (!formValidation.success) {
    return formValidation as Result<EventBundle, ValidationError[]>;
  }

  // If the manifest opts out of linking, strip the manifestRef from config
  const effectiveConfig =
    manifest.linkManifest === false ? { ...config, manifestRef: undefined } : config;

  // Create events for each required kind
  const events: UnsignedNostrEvent[] = [];

  for (const kind of manifest.requiredKinds) {
    const fieldsForKind = getFieldsByKind(manifest, kind);
    if (fieldsForKind.length > 0) {
      const event = createEventForKind(kind, fieldsForKind, formData, effectiveConfig);
      events.push(event);
    }
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
