'use client';

import type { PostField } from '@nostr-post/core/types';

interface FieldEditorProps {
  field: PostField;
  kinds: number[];
  onChange: (field: PostField) => void;
  onDelete: () => void;
}

const styles = {
  fieldItem: {
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    background: '#f9fafb',
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  fieldTitle: {
    fontWeight: 600,
    color: '#111827',
  },
  deleteButton: {
    padding: '0.25rem 0.75rem',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  checkbox: {
    width: '1rem',
    height: '1rem',
  },
} as const;

export function FieldEditor({ field, kinds, onChange, onDelete }: FieldEditorProps) {
  const update = (key: keyof PostField, value: unknown) => {
    onChange({
      ...field,
      [key]: value,
    });
  };

  const updateMetadata = (key: string, value: unknown) => {
    onChange({
      ...field,
      metadata: {
        ...field.metadata,
        [key]: value,
      },
    });
  };

  const updateMapTo = (key: string, value: unknown) => {
    onChange({
      ...field,
      mapTo: {
        ...field.mapTo,
        [key]: value,
      },
    });
  };

  const label = (field.metadata?.label as string) || field.id;
  const placeholder = field.metadata?.placeholder as string | undefined;

  return (
    <div style={styles.fieldItem}>
      <div style={styles.fieldHeader}>
        <span style={styles.fieldTitle}>{label}</span>
        <button style={styles.deleteButton} onClick={onDelete}>
          Delete
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Field ID:</label>
          <input
            style={styles.input}
            type="text"
            value={field.id}
            onChange={(e) => update('id', e.target.value)}
            placeholder="fieldId"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Label:</label>
          <input
            style={styles.input}
            type="text"
            value={label}
            onChange={(e) => updateMetadata('label', e.target.value)}
            placeholder="Field Label"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Type:</label>
          <select
            style={styles.select}
            value={field.type}
            onChange={(e) => update('type', e.target.value)}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>UI Plugin:</label>
          <select
            style={styles.select}
            value={field.uiPlugin || 'text'}
            onChange={(e) => update('uiPlugin', e.target.value)}
          >
            <option value="text">text</option>
            <option value="textarea">textarea</option>
            <option value="markdown">markdown</option>
            <option value="stars">stars</option>
            <option value="media">media</option>
            <option value="geo">geo</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Map To Kind:</label>
          <select
            style={styles.select}
            value={field.mapTo.kind}
            onChange={(e) => updateMapTo('kind', Number(e.target.value))}
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Target:</label>
          <select
            style={styles.select}
            value={field.mapTo.target}
            onChange={(e) => updateMapTo('target', e.target.value)}
          >
            <option value="content">content</option>
            <option value="tag">tag</option>
          </select>
        </div>

        {field.mapTo.target === 'tag' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Tag Name:</label>
            <input
              style={styles.input}
              type="text"
              value={field.mapTo.tagName || ''}
              onChange={(e) => updateMapTo('tagName', e.target.value)}
              placeholder="tagName"
            />
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Placeholder:</label>
          <input
            style={styles.input}
            type="text"
            value={placeholder || ''}
            onChange={(e) => updateMetadata('placeholder', e.target.value)}
            placeholder="Placeholder text..."
          />
        </div>

        <div style={styles.formGroup}>
          <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              style={styles.checkbox}
              type="checkbox"
              checked={field.required || false}
              onChange={(e) => update('required', e.target.checked)}
            />
            Required
          </label>
        </div>
      </div>
    </div>
  );
}