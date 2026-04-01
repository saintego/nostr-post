import type { NostrPostManifest, PostField } from '@nostr-post/core/types';

export const isFieldExcluded = (field: PostField, excludeFields?: string[]): boolean => {
  if (excludeFields?.includes(field.id)) return true;
  if (field.visibility?.edit === 'hidden') return true;
  return false;
};

export const isExcludedButPrefilled = (
  field: PostField,
  excludeFields: string[] | undefined,
  prefill: Record<string, unknown> | undefined
): boolean => {
  return (
    isFieldExcluded(field, excludeFields) &&
    (prefill?.[field.id] !== undefined || field.defaultValue !== undefined)
  );
};

export const isFieldReadonly = (field: PostField, readonlyFields?: string[]): boolean => {
  if (readonlyFields?.includes(field.id)) return true;
  if (field.visibility?.edit === 'readonly') return true;
  return false;
};

export const buildInitialFormData = ({
  manifest,
  prefill,
  currentFormData,
  resetUnknownFields,
}: {
  manifest: NostrPostManifest;
  prefill?: Record<string, unknown>;
  currentFormData: Record<string, unknown>;
  resetUnknownFields: boolean;
}): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  for (const field of manifest.fields) {
    if (field.defaultValue !== undefined) {
      defaults[field.id] = field.defaultValue;
    }
  }

  if (prefill) {
    Object.assign(defaults, prefill);
  }

  const allowedIds = new Set(manifest.fields.map((field) => field.id));
  const normalizedCurrentFormData = resetUnknownFields
    ? Object.fromEntries(
        Object.entries(currentFormData).filter(([fieldId]) => allowedIds.has(fieldId))
      )
    : currentFormData;

  return { ...defaults, ...normalizedCurrentFormData };
};

export const hiddenFieldErrorEntries = ({
  manifest,
  errors,
  excludeFields,
  prefill,
}: {
  manifest: NostrPostManifest;
  errors: Record<string, string>;
  excludeFields?: string[];
  prefill?: Record<string, unknown>;
}): Array<[string, string]> => {
  const visibleFieldIds = new Set(
    manifest.fields
      .filter(
        (field) =>
          !isFieldExcluded(field, excludeFields) ||
          isExcludedButPrefilled(field, excludeFields, prefill)
      )
      .map((field) => field.id)
  );

  return Object.entries(errors).filter(([fieldId]) => !visibleFieldIds.has(fieldId));
};

/**
 * Parse an extra-tags string into Nostr tag tuples.
 * Format: "tagname:value,tagname2:value2" — splits on first colon so
 * values containing colons (e.g. "i:osm:node:123") work correctly.
 */
export const parseExtraTags = (input?: string): [string, ...string[]][] => {
  if (!input) return [];
  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const sep = entry.indexOf(':');
      if (sep <= 0) return [];
      const tagName = entry.slice(0, sep).trim();
      const value = entry.slice(sep + 1).trim();
      if (!tagName || !value) return [];
      return [[tagName, value] as [string, string]];
    });
};
