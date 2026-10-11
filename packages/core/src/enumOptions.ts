/**
 * @nostr-post/core - Enum options
 *
 * Helpers over an `enum` field's options, which are plain strings or
 * `EnumOption` objects with a label, description and group.
 */

import type { EnumOption, FieldOption, PostField, Result, ValidationError } from './types';

/** The option as an object: a plain string becomes `{ value }` */
export const toEnumOption = (option: FieldOption): EnumOption =>
  typeof option === 'string' ? { value: option } : option;

/** The stored value of an option */
export const optionValue = (option: FieldOption): string =>
  typeof option === 'string' ? option : option.value;

/** The display text of an option: its label, else its value */
export const optionLabel = (option: FieldOption): string =>
  typeof option === 'string' ? option : option.label || option.value;

/** The field's options as objects (empty when it has none) */
export const fieldOptions = (field: PostField): EnumOption[] =>
  (field.options ?? []).map(toEnumOption);

/** The option with this value, if the field has one */
export const findFieldOption = (field: PostField, value: unknown): EnumOption | undefined =>
  typeof value === 'string' ? fieldOptions(field).find((o) => o.value === value) : undefined;

/** Whether the value is one of the field's options */
export const isFieldOptionValue = (field: PostField, value: unknown): value is string =>
  findFieldOption(field, value) !== undefined;

/**
 * The option a stored text stands for: its value, else a case-insensitive
 * match of its value or label (infobox rows store labels, and events published
 * before an option had a separate label store that text).
 */
export const matchFieldOption = (field: PostField, raw: string): EnumOption | undefined => {
  const options = fieldOptions(field);
  const text = raw.trim();
  const lower = text.toLowerCase();
  return (
    options.find((o) => o.value === text) ??
    options.find((o) => o.value.toLowerCase() === lower || optionLabel(o).toLowerCase() === lower)
  );
};

/** The display text for a stored value: the option's label, else the value itself */
export const fieldOptionLabel = (field: PostField, value: string): string => {
  const option = matchFieldOption(field, value);
  return option ? optionLabel(option) : value;
};

/** Options grouped by `group`, in first-seen order; ungrouped options under `''` */
export const groupFieldOptions = (field: PostField): { group: string; options: EnumOption[] }[] => {
  const groups: { group: string; options: EnumOption[] }[] = [];
  for (const option of fieldOptions(field)) {
    const name = option.group ?? '';
    let entry = groups.find((g) => g.group === name);
    if (!entry) {
      entry = { group: name, options: [] };
      groups.push(entry);
    }
    entry.options.push(option);
  }
  return groups;
};

/** Enum fields with more options than this get a search input instead of a select */
export const SEARCHABLE_OPTION_COUNT = 20;

/**
 * Whether an enum field is picked by typing to search (`metadata.searchable`),
 * by default when it has more than SEARCHABLE_OPTION_COUNT options.
 */
export const isSearchableEnum = (field: PostField): boolean => {
  const searchable = field.metadata?.searchable;
  if (typeof searchable === 'boolean') return searchable;
  return (field.options?.length ?? 0) > SEARCHABLE_OPTION_COUNT;
};

/** The value for text typed into a search input: the matching option's value, else `''` */
export const optionValueForText = (field: PostField, text: string): string =>
  text.trim() ? (matchFieldOption(field, text)?.value ?? '') : '';

const optionsError = (message: string): Result<void, ValidationError> => ({
  success: false,
  error: { field: 'options', message, code: 'INVALID_ENUM_OPTIONS' },
});

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string';

/** Why an option is malformed, if it is */
const optionProblem = (option: unknown): string | undefined => {
  if (typeof option === 'string') {
    return option === '' ? 'Options must not be empty' : undefined;
  }
  const record =
    typeof option === 'object' && option !== null ? (option as Record<string, unknown>) : {};
  if (typeof record.value !== 'string' || record.value === '') {
    return 'Each option must be a non-empty string or have a non-empty string value';
  }
  if (!['label', 'description', 'group', 'code'].every((k) => isOptionalString(record[k]))) {
    return `Option "${record.value}": label, description, group and code must be strings`;
  }
  return undefined;
};

/**
 * Checks a field's options: an `enum` field needs at least one; each option is a
 * string or an object with a non-empty string `value` (and string label,
 * description, group); values are unique.
 */
export const validateFieldOptions = (field: PostField): Result<void, ValidationError> => {
  const options: unknown[] = field.options ?? [];
  if (field.type === 'enum' && options.length === 0) {
    return {
      success: false,
      error: {
        field: 'options',
        message: 'Enum fields must have at least one option',
        code: 'MISSING_ENUM_OPTIONS',
      },
    };
  }
  const seen = new Set<string>();
  for (const option of options) {
    const problem = optionProblem(option);
    if (problem) return optionsError(problem);
    const value = optionValue(option as FieldOption);
    if (seen.has(value)) return optionsError(`Option "${value}" is listed twice`);
    seen.add(value);
  }
  return { success: true, data: undefined };
};
