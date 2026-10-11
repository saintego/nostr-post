/**
 * The input of an `enum` field: a select with option groups, or for long lists
 * (see isSearchableEnum) a text input that filters the options as you type.
 */

import {
  fieldOptionLabel,
  fieldOptions,
  groupFieldOptions,
  isSearchableEnum,
  optionLabel,
  optionValueForText,
} from '@nostr-post/core/enumOptions';
import type { PostField } from '@nostr-post/core/types';
import { type TemplateResult, html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';

export function renderEnumInput(
  field: PostField,
  value: unknown,
  onChange: (value: string) => void
): TemplateResult {
  const current = typeof value === 'string' ? value : '';

  if (isSearchableEnum(field)) {
    const listId = `enum-options-${field.id}`;
    // Typed text that matches no option clears the value; live() then clears the text too
    return html`
      <input
        type="search"
        list=${listId}
        autocomplete="off"
        placeholder=${(field.metadata?.placeholder as string | undefined) ?? 'Type to search...'}
        .value=${live(current ? fieldOptionLabel(field, current) : '')}
        @change=${(e: Event) =>
          onChange(optionValueForText(field, (e.target as HTMLInputElement).value))}
      />
      <datalist id=${listId}>
        ${fieldOptions(field).map(
          (opt) => html`<option value=${optionLabel(opt)} label=${ifDefined(opt.group)}></option>`
        )}
      </datalist>
    `;
  }

  return html`
    <select @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}>
      <option value="">Select...</option>
      ${groupFieldOptions(field).map(({ group, options }) => {
        const items = options.map(
          (opt) =>
            html`<option value=${opt.value} title=${ifDefined(opt.description)} ?selected=${current === opt.value}>${optionLabel(opt)}</option>`
        );
        return group ? html`<optgroup label=${group}>${items}</optgroup>` : items;
      })}
    </select>
  `;
}
