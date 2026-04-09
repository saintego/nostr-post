/**
 * @nostr-post/core - Manifest validation and parsing
 *
 * Pure functions for validating and working with NostrPostManifest structures.
 * All functions are immutable and side-effect free.
 */

import {
  getFieldTargets,
  getFieldsByKind as getFieldsByKindFromMappings,
  getUsedKinds as getUsedKindsFromMappings,
} from './manifestMappings';
import type {
  NostrPostManifest,
  NostrTarget,
  PostField,
  PublishFormat,
  Result,
  ValidationError,
} from './types';

/**
 * Validates that a NostrTarget is properly configured.
 */
export const validateNostrTarget = (target: NostrTarget): Result<void, ValidationError> => {
  if (target.target === 'tag' && !target.tagName) {
    return {
      success: false,
      error: {
        field: 'tagName',
        message: 'tagName is required when target is "tag"',
        code: 'MISSING_TAG_NAME',
      },
    };
  }

  if (target.kind < 0 || target.kind > 65535) {
    return {
      success: false,
      error: {
        field: 'kind',
        message: 'kind must be between 0 and 65535',
        code: 'INVALID_KIND',
      },
    };
  }

  return { success: true, data: undefined };
};

/**
 * Validates a single PostField definition.
 */
export const validatePostField = (field: PostField): Result<void, ValidationError> => {
  if (!field.id || field.id.trim() === '') {
    return {
      success: false,
      error: {
        field: 'id',
        message: 'Field id is required and cannot be empty',
        code: 'MISSING_FIELD_ID',
      },
    };
  }

  if (!field.uiPlugin || field.uiPlugin.trim() === '') {
    return {
      success: false,
      error: {
        field: 'uiPlugin',
        message: 'uiPlugin is required and cannot be empty',
        code: 'MISSING_UI_PLUGIN',
      },
    };
  }

  const targets = getFieldTargets(field);
  if (targets.length === 0) {
    return {
      success: false,
      error: {
        field: 'mapTo',
        message: 'Field must define at least one mapping target',
        code: 'MISSING_MAP_TARGET',
      },
    };
  }

  for (const target of targets) {
    const targetValidation = validateNostrTarget(target);
    if (!targetValidation.success) {
      return targetValidation;
    }
  }

  if (field.type === 'enum' && (!field.options || field.options.length === 0)) {
    return {
      success: false,
      error: {
        field: 'options',
        message: 'Enum fields must have at least one option',
        code: 'MISSING_ENUM_OPTIONS',
      },
    };
  }

  return { success: true, data: undefined };
};

/**
 * Validates an entire NostrPostManifest.
 */
export const validateManifest = (manifest: NostrPostManifest): Result<void, ValidationError[]> => {
  const errors: ValidationError[] = [];

  // Basic manifest validation
  validateManifestBasics(manifest, errors);

  // Field validation
  validateManifestFields(manifest, errors);

  // Cross-field validation
  validateFieldRelationships(manifest, errors);

  if (errors.length > 0) {
    return { success: false, error: errors };
  }

  return { success: true, data: undefined };
};

/**
 * Validates basic manifest properties.
 */
const validateManifestBasics = (manifest: NostrPostManifest, errors: ValidationError[]): void => {
  if (!manifest.id || manifest.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Manifest id is required',
      code: 'MISSING_MANIFEST_ID',
    });
  }

  if (!manifest.version || manifest.version.trim() === '') {
    errors.push({
      field: 'version',
      message: 'Manifest version is required',
      code: 'MISSING_VERSION',
    });
  }

  if (
    (!manifest.requiredKinds || manifest.requiredKinds.length === 0) &&
    (!manifest.publishFormats || manifest.publishFormats.length === 0)
  ) {
    errors.push({
      field: 'requiredKinds',
      message: 'Manifest must specify requiredKinds or publishFormats',
      code: 'MISSING_REQUIRED_KINDS',
    });
  }

  if (!manifest.fields || manifest.fields.length === 0) {
    errors.push({
      field: 'fields',
      message: 'Manifest must have at least one field',
      code: 'MISSING_FIELDS',
    });
  }
};

const validatePublishFormat = (format: PublishFormat): Result<void, ValidationError> => {
  if (!format.id || format.id.trim() === '') {
    return {
      success: false,
      error: {
        field: 'id',
        message: 'Publish format id is required',
        code: 'MISSING_PUBLISH_FORMAT_ID',
      },
    };
  }

  if (!format.label || format.label.trim() === '') {
    return {
      success: false,
      error: {
        field: 'label',
        message: 'Publish format label is required',
        code: 'MISSING_PUBLISH_FORMAT_LABEL',
      },
    };
  }

  if (!format.kinds || format.kinds.length === 0) {
    return {
      success: false,
      error: {
        field: 'kinds',
        message: 'Publish format must define at least one kind',
        code: 'MISSING_PUBLISH_FORMAT_KINDS',
      },
    };
  }

  return { success: true, data: undefined };
};

/**
 * Validates individual fields in the manifest.
 */
const validateManifestFields = (manifest: NostrPostManifest, errors: ValidationError[]): void => {
  for (const [index, format] of (manifest.publishFormats ?? []).entries()) {
    const formatValidation = validatePublishFormat(format);
    if (!formatValidation.success) {
      errors.push({
        ...formatValidation.error,
        field: `publishFormats.${index}.${formatValidation.error.field}`,
      });
    }
  }

  for (const field of manifest.fields || []) {
    const fieldValidation = validatePostField(field);
    if (!fieldValidation.success) {
      errors.push({
        ...fieldValidation.error,
        field: `fields.${field.id}.${fieldValidation.error.field}`,
      });
    }
  }
};

/**
 * Validates relationships between fields and other manifest properties.
 */
const validateFieldRelationships = (
  manifest: NostrPostManifest,
  errors: ValidationError[]
): void => {
  // Check for duplicate field IDs
  const fieldIds = new Set<string>();
  const formatIds = new Set<string>();
  let defaultFormatCount = 0;
  for (const [index, format] of (manifest.publishFormats ?? []).entries()) {
    if (formatIds.has(format.id)) {
      errors.push({
        field: `publishFormats.${index}.id`,
        message: `Duplicate publish format id: ${format.id}`,
        code: 'DUPLICATE_PUBLISH_FORMAT_ID',
      });
    }
    formatIds.add(format.id);
    if (format.default) defaultFormatCount += 1;
  }

  if (defaultFormatCount > 1) {
    errors.push({
      field: 'publishFormats',
      message: 'Only one publish format can be the default',
      code: 'MULTIPLE_DEFAULT_PUBLISH_FORMATS',
    });
  }

  for (const field of manifest.fields || []) {
    if (fieldIds.has(field.id)) {
      errors.push({
        field: `fields.${field.id}`,
        message: `Duplicate field id: ${field.id}`,
        code: 'DUPLICATE_FIELD_ID',
      });
    }
    fieldIds.add(field.id);
  }

  for (const field of manifest.fields || []) {
    if (!field.attachTo) continue;

    if (field.attachTo === field.id) {
      errors.push({
        field: `fields.${field.id}.attachTo`,
        message: `Field ${field.id} cannot attach to itself`,
        code: 'INVALID_ATTACH_TARGET',
      });
      continue;
    }

    if (!fieldIds.has(field.attachTo)) {
      errors.push({
        field: `fields.${field.id}.attachTo`,
        message: `Field ${field.id} attaches to missing field ${field.attachTo}`,
        code: 'UNKNOWN_ATTACH_TARGET',
      });
    }
  }

  // Verify all requiredKinds are actually used in field mappings
  const usedKinds = new Set(getUsedKindsFromMappings(manifest));
  for (const kind of manifest.requiredKinds || []) {
    if (!usedKinds.has(kind)) {
      errors.push({
        field: 'requiredKinds',
        message: `Required kind ${kind} is not used in any field mapping`,
        code: 'UNUSED_REQUIRED_KIND',
      });
    }
  }

  for (const [index, format] of (manifest.publishFormats ?? []).entries()) {
    for (const kind of format.kinds) {
      if (!usedKinds.has(kind)) {
        errors.push({
          field: `publishFormats.${index}.kinds`,
          message: `Publish format ${format.id} includes kind ${kind} that is not used in any field mapping`,
          code: 'UNUSED_PUBLISH_FORMAT_KIND',
        });
      }
    }
  }
};

/**
 * Gets all fields that map to a specific Nostr kind.
 */
export const getFieldsByKind = (manifest: NostrPostManifest, kind: number): PostField[] => {
  return getFieldsByKindFromMappings(manifest, kind);
};

/**
 * Gets all unique Nostr kinds used in the manifest.
 */
export const getUsedKinds = (manifest: NostrPostManifest): number[] => {
  return getUsedKindsFromMappings(manifest);
};

/**
 * Finds a field by its ID.
 */
export const findFieldById = (
  manifest: NostrPostManifest,
  fieldId: string
): PostField | undefined => {
  return manifest.fields.find((field) => field.id === fieldId);
};

/**
 * Gets all required fields from the manifest.
 */
export const getRequiredFields = (manifest: NostrPostManifest): PostField[] => {
  return manifest.fields.filter((field) => field.required === true);
};
