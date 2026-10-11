/**
 * The wiki composer's control for an `enum` field: a select with option
 * groups, or for long lists (see isSearchableEnum) a text input that filters
 * the options as you type.
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

export interface EnumControlTexts {
  selectPlaceholder: string;
  searchPlaceholder: string;
}

export function renderEnumControl(
  f: PostField,
  value: unknown,
  onChange: (value: string) => void,
  texts: EnumControlTexts
): TemplateResult {
  const current = typeof value === 'string' ? value : '';

  if (isSearchableEnum(f)) {
    const listId = `field-${f.id}-options`;
    // Typed text that matches no option clears the value; live() then clears the text too
    return html`
      <input
        id="field-${f.id}"
        type="search"
        list=${listId}
        autocomplete="off"
        placeholder=${(f.metadata?.placeholder as string | undefined) ?? texts.searchPlaceholder}
        ?required=${f.required}
        .value=${live(current ? fieldOptionLabel(f, current) : '')}
        @change=${(e: Event) => onChange(optionValueForText(f, (e.target as HTMLInputElement).value))}
      />
      <datalist id=${listId}>
        ${fieldOptions(f).map(
          (opt) => html`<option value=${optionLabel(opt)} label=${ifDefined(opt.group)}></option>`
        )}
      </datalist>
    `;
  }

  return html`
    <select
      id="field-${f.id}"
      ?required=${f.required}
      @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}
    >
      <option value="" ?selected=${!current}>${texts.selectPlaceholder}</option>
      ${groupFieldOptions(f).map(({ group, options }) => {
        const items = options.map(
          (opt) =>
            html`<option value=${opt.value} title=${ifDefined(opt.description)} ?selected=${opt.value === current}>${optionLabel(opt)}</option>`
        );
        return group ? html`<optgroup label=${group}>${items}</optgroup>` : items;
      })}
    </select>
  `;
}
