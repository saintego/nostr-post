/**
 * @nostr-post/core - A manifest's form data as JSON Schema
 *
 * Describes what a composer's form data looks like, so a post can be filled in from text by
 * something that answers in JSON, e.g. an AI with structured outputs: the schema comes from the
 * manifest's fields (labels and descriptions become the properties' descriptions), and
 * `parseFormJson` turns the JSON (or text containing it) back into form data. Field values the field type alone
 * doesn't describe (a date, picked entities) come from the field's plugin (`jsonSchema`).
 *
 * The schema is strict, as structured outputs require: every property is listed in `required`,
 * optional ones accept `null`, and objects allow no other properties.
 */

import { getSelectablePublishFormats } from './manifestMappings';
import type { FieldOption, NostrPostManifest, PostField, Result } from './types';

/** A JSON Schema (draft 2020-12 subset) */
export type JsonSchema = { [key: string]: unknown };

/** The property that holds the chosen publish format, when a manifest offers several */
export const PUBLISH_FORMAT_KEY = 'publishFormat';

export interface FormJsonSchemaOptions {
  /**
   * The schema of a field's value: a schema, `null` to leave the field out, or `undefined`
   * for the default of its type (`string`, `number`, `boolean`, `enum`; other types are left
   * out). Usually the field plugin's `jsonSchema`.
   */
  fieldSchema?: (field: PostField) => JsonSchema | null | undefined;
}

const optionValue = (option: FieldOption): string =>
  typeof option === 'string' ? option : option.value;

const optionText = (option: FieldOption): string =>
  typeof option === 'string' || !option.label || option.label === option.value
    ? optionValue(option)
    : `${option.value} (${option.label})`;

/** A field's value by its type alone */
const typeSchema = (field: PostField): JsonSchema | null => {
  const multiple = field.metadata?.multiple === true;
  const one = (schema: JsonSchema): JsonSchema =>
    multiple ? { type: 'array', items: schema } : schema;
  switch (field.type) {
    case 'string':
      return one({ type: 'string' });
    case 'number':
      return one({ type: 'number' });
    case 'boolean':
      return { type: 'boolean' };
    case 'enum':
      return field.options?.length ? one({ enum: field.options.map(optionValue) }) : null;
    default:
      return null;
  }
};

/** What the field is, for whoever fills it in: its label, description and options */
const fieldText = (field: PostField): string => {
  const label = field.metadata?.label ?? field.id;
  const description = field.metadata?.description;
  const options =
    field.type === 'enum' && field.options?.some((o) => typeof o !== 'string' && o.label)
      ? `One of: ${field.options.map(optionText).join(', ')}`
      : undefined;
  return [description ? `${label}: ${description}` : label, options].filter(Boolean).join('. ');
};

const nullable = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, { type: 'null' }] });

/** Whether a field is filled in by the composer's user (hidden and read-only ones aren't) */
const isEditable = (field: PostField): boolean =>
  (field.visibility?.edit ?? 'visible') === 'visible';

/**
 * The JSON Schema of `manifest`'s form data: one property per editable field it can describe,
 * plus `publishFormat` when the manifest lets the user choose between formats.
 */
export function formJsonSchema(
  manifest: NostrPostManifest,
  options: FormJsonSchemaOptions = {}
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  for (const field of manifest.fields.filter(isEditable)) {
    const fromPlugin = options.fieldSchema?.(field);
    const schema = fromPlugin === undefined ? typeSchema(field) : fromPlugin;
    if (!schema) continue;
    const text = fieldText(field);
    const described = {
      ...schema,
      description: schema.description ? `${text}. ${schema.description}` : text,
    };
    properties[field.id] = field.required ? described : nullable(described);
  }
  const formats = getSelectablePublishFormats(manifest);
  if (formats.length > 1 && !(PUBLISH_FORMAT_KEY in properties)) {
    properties[PUBLISH_FORMAT_KEY] = {
      enum: formats.map((format) => format.id),
      description: `How to publish: ${formats
        .map((f) => `${f.id}: ${f.description ?? f.label}`)
        .join('; ')}`,
    };
  }
  const schema: JsonSchema = {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
  const description = manifest.metadata?.description;
  return description ? { ...schema, description } : schema;
}

/** `value` without nulls, empty strings and empty lists (nested too); undefined when nothing's left */
const withoutEmpty = (value: unknown): unknown => {
  if (value === null || value === undefined || value === '') return undefined;
  if (Array.isArray(value)) {
    const items = value.map(withoutEmpty).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, withoutEmpty(item)] as const)
      .filter(([, item]) => item !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
};

/** Form data parsed from JSON: the chosen publish format, if any, and the fields' values */
export interface FormJson {
  formatId?: string;
  formData: Record<string, unknown>;
}

/**
 * The JSON object in `text`: the text itself, or the object inside prose or code fences (as
 * AIs often wrap it)
 */
export const findJsonObject = (text: string): Result<unknown> => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { success: false, error: new Error('No JSON object') };
  try {
    return { success: true, data: JSON.parse(text.slice(start, end + 1)) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

/**
 * Form data from JSON in `formJsonSchema`'s shape, given as text (possibly wrapped in prose or
 * code fences) or already parsed: the manifest's fields only, without empty values, and the
 * chosen publish format if it's one of the manifest's.
 */
export function parseFormJson(manifest: NostrPostManifest, input: unknown): Result<FormJson> {
  const parsed: Result<unknown> =
    typeof input === 'string' ? findJsonObject(input) : { success: true, data: input };
  if (!parsed.success) return parsed;
  const values = parsed.data;
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return { success: false, error: new Error('Not a JSON object') };
  }
  const formData: Record<string, unknown> = {};
  for (const field of manifest.fields) {
    const value = withoutEmpty((values as Record<string, unknown>)[field.id]);
    if (value !== undefined) formData[field.id] = value;
  }
  const format = (values as Record<string, unknown>)[PUBLISH_FORMAT_KEY];
  const formatId = getSelectablePublishFormats(manifest).some((f) => f.id === format)
    ? (format as string)
    : undefined;
  return { success: true, data: formatId ? { formatId, formData } : { formData } };
}
