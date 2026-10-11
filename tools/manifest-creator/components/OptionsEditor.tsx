'use client';

import { toEnumOption } from '@nostr-post/core/enumOptions';
import type { EnumOption, FieldOption, PostField } from '@nostr-post/core/types';
import { styles } from './fieldEditorStyles';

interface OptionsEditorProps {
  field: PostField;
  onChange: (field: PostField) => void;
}

const OPTION_KEYS = ['value', 'label', 'group', 'code', 'description'] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

const PLACEHOLDERS: Record<OptionKey, string> = {
  value: 'Stored value, e.g. american-ipa',
  label: 'Label (default: value)',
  group: 'Group',
  code: 'Code in an external list, e.g. 21A',
  description: 'Description',
};

/** An option as stored: a plain string when it has nothing but a value */
const compact = (option: EnumOption): FieldOption => {
  const entries = Object.entries(option).filter(([, v]) => v !== undefined && v !== '');
  return entries.length === 1 && option.value
    ? option.value
    : (Object.fromEntries(entries) as EnumOption);
};

// Two inputs per line (the description spans both) so the card fits the field
// editor's width; minWidth 0 lets inputs shrink instead of overflowing.
const rowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto',
  gap: '0.375rem',
  alignItems: 'center',
  padding: '0.375rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.375rem',
  background: 'white',
} as const;

const optionInputStyle = { ...styles.input, minWidth: 0 } as const;

/** Edits an enum field's options. Renders nothing for other field types. */
export function OptionsEditor({ field, onChange }: OptionsEditorProps) {
  if (field.type !== 'enum') return null;
  const options = (field.options ?? []).map(toEnumOption);
  const setOptions = (next: EnumOption[]) => onChange({ ...field, options: next.map(compact) });

  const updateOption = (index: number, key: OptionKey, value: string) =>
    setOptions(options.map((o, i) => (i === index ? { ...o, [key]: value || undefined } : o)));
  const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const moveOption = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target] as EnumOption, next[index] as EnumOption];
    setOptions(next);
  };

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={styles.label}>Options</div>
          <div style={styles.helperText}>
            The value is published; the label is shown. Options with a group are listed under it.
            The code isn't published.
          </div>
        </div>
        <button
          type="button"
          style={styles.smallButton}
          onClick={() => setOptions([...options, { value: '' }])}
        >
          + Add Option
        </button>
      </div>

      {options.map((option, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: options are edited in place, values may repeat while typing
        <div key={index} style={rowStyle}>
          {OPTION_KEYS.map((key, keyIndex) => (
            <input
              key={key}
              style={{
                ...optionInputStyle,
                gridRow: Math.floor(keyIndex / 2) + 1,
                gridColumn: key === 'description' ? '1 / span 2' : undefined,
              }}
              type="text"
              aria-label={`Option ${index + 1} ${key}`}
              value={option[key] ?? ''}
              onChange={(e) => updateOption(index, key, e.target.value)}
              placeholder={PLACEHOLDERS[key]}
            />
          ))}
          <div style={{ display: 'flex', gap: '0.25rem', gridColumn: 3, gridRow: '1 / span 3' }}>
            <button type="button" style={styles.smallButton} onClick={() => moveOption(index, -1)}>
              ↑
            </button>
            <button type="button" style={styles.smallButton} onClick={() => moveOption(index, 1)}>
              ↓
            </button>
            <button type="button" style={styles.deleteButton} onClick={() => removeOption(index)}>
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
