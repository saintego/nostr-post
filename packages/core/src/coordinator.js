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
/**
 * Validates form data against a manifest.
 */
export const validateFormData = (manifest, formData) => {
    const errors = [];
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
const validateFieldType = (field, value) => {
    switch (field.type) {
        case 'string':
            if (typeof value !== 'string') {
                return {
                    success: false,
                    error: {
                        field: field.id,
                        message: `Field "${field.id}" must be a string`,
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
            if (!isValidGeoValue(value)) {
                return {
                    success: false,
                    error: {
                        field: field.id,
                        message: `Field "${field.id}" must be a valid geo coordinate`,
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
/**
 * Type guard for geo coordinates.
 */
const isValidGeoValue = (value) => {
    if (typeof value !== 'object' || value === null)
        return false;
    const geo = value;
    return (typeof geo.lat === 'number' &&
        typeof geo.lon === 'number' &&
        geo.lat >= -90 &&
        geo.lat <= 90 &&
        geo.lon >= -180 &&
        geo.lon <= 180);
};
/**
 * Creates an unsigned Nostr event for a specific kind.
 */
const createEventForKind = (kind, fields, formData, config) => {
    const tags = [];
    let content = '';
    // Separate fields by target type
    const contentFields = fields.filter((f) => f.mapTo.target === 'content');
    const tagFields = fields.filter((f) => f.mapTo.target === 'tag');
    // Build content (for NIP-78, this will be JSON)
    if (contentFields.length > 0) {
        if (kind === 30078 || kind === 30079) {
            // NIP-78: Structured JSON content
            const contentObj = {};
            for (const field of contentFields) {
                const value = formData[field.id];
                if (value !== undefined) {
                    // Handle path-based storage
                    if (field.mapTo.path) {
                        setNestedValue(contentObj, field.mapTo.path, value);
                    }
                    else {
                        contentObj[field.id] = value;
                    }
                }
            }
            content = JSON.stringify(contentObj);
        }
        else {
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
            const stringValue = String(value);
            tags.push([field.mapTo.tagName, stringValue]);
        }
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
 * Sets a nested value in an object using dot notation path.
 */
const setNestedValue = (obj, path, value) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
};
/**
 * Adds cross-linking tags between events in a bundle.
 * This is a placeholder for future implementation of event references.
 */
const addCrossLinks = (events) => {
    // Future: Add 'e' tags to link related events
    // For now, return events as-is
    return events;
};
/**
 * Coordinates the creation of a bundle of Nostr events from form data.
 *
 * This is the main entry point for the EventCoordinator.
 */
export const coordinateEvents = (manifest, formData, config = {}) => {
    // Validate manifest
    const manifestValidation = validateManifest(manifest);
    if (!manifestValidation.success) {
        return manifestValidation;
    }
    // Validate form data
    const formValidation = validateFormData(manifest, formData);
    if (!formValidation.success) {
        return formValidation;
    }
    // Create events for each required kind
    const events = [];
    for (const kind of manifest.requiredKinds) {
        const fieldsForKind = getFieldsByKind(manifest, kind);
        if (fieldsForKind.length > 0) {
            const event = createEventForKind(kind, fieldsForKind, formData, config);
            events.push(event);
        }
    }
    // Add cross-linking tags
    const linkedEvents = addCrossLinks(events);
    const bundle = {
        events: linkedEvents,
        manifest,
        metadata: {
            createdAt: config.createdAt || Math.floor(Date.now() / 1000),
            sourceForm: formData,
        },
    };
    return { success: true, data: bundle };
};
//# sourceMappingURL=coordinator.js.map