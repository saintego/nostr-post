/**
 * @nostr-post/wiki - The wiki composer's own inputs: text, number, textarea and `enum`
 * selects, for fields without a plugin input
 */

import type { PostField } from '@nostr-post/core/types';
import { html } from 'lit';
import { renderEnumControl } from './enumControl';
import type { WikiComposerMessages } from './wikiComposerMessages';

/** An empty number input clears the value instead of storing 0. */
const parseNumberInput = (raw: string): number | undefined =>
  raw === '' ? undefined : Number(raw);

export function renderNativeControl(
  f: PostField,
  value: unknown,
  onChange: (value: unknown) => void,
  messages: WikiComposerMessages
) {
  const placeholder = (f.metadata?.placeholder as string | undefined) ?? '';

  if (f.uiPlugin === 'textarea') {
    return html`
      <textarea
        id="field-${f.id}"
        .value=${String(value ?? '')}
        placeholder=${placeholder}
        ?required=${f.required}
        @input=${(e: InputEvent) => onChange((e.target as HTMLTextAreaElement).value)}
      ></textarea>
    `;
  }

  if ((f.uiPlugin === 'select' || f.type === 'enum') && f.options?.length) {
    return renderEnumControl(f, value, onChange, messages);
  }

  // Number or text
  const isNumber = f.type === 'number';
  return html`
    <input
      id="field-${f.id}"
      type=${isNumber ? 'number' : 'text'}
      .value=${String(value ?? '')}
      placeholder=${placeholder}
      ?required=${f.required}
      @input=${(e: InputEvent) => {
        const raw = (e.target as HTMLInputElement).value;
        onChange(isNumber ? parseNumberInput(raw) : raw);
      }}
    />
  `;
}
