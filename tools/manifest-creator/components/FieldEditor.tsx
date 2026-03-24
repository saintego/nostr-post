'use client';

import type { PostField } from '@nostr-post/core/types';

interface FieldEditorProps {
  field: PostField;
  kinds: number[];
  fieldIds: string[];
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

export function FieldEditor({ field, kinds, fieldIds, onChange, onDelete }: FieldEditorProps) {
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
        <button type="button" style={styles.deleteButton} onClick={onDelete}>
          Delete
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-id">
            Field ID:
          </label>
          <input
            id="field-id"
            style={styles.input}
            type="text"
            value={field.id}
            onChange={(e) => update('id', e.target.value)}
            placeholder="fieldId"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-label">
            Label:
          </label>
          <input
            id="field-label"
            style={styles.input}
            type="text"
            value={label}
            onChange={(e) => updateMetadata('label', e.target.value)}
            placeholder="Field Label"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-type">
            Type:
          </label>
          <select
            id="field-type"
            style={styles.select}
            value={field.type}
            onChange={(e) => update('type', e.target.value)}
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="enum">enum</option>
            <option value="geo">geo</option>
            <option value="ref">ref</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-ui-plugin">
            UI Plugin:
          </label>
          <select
            id="field-ui-plugin"
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
            <option value="venue">venue</option>
            <option value="hashtag">hashtag</option>
            <option value="reference">reference</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-attach-to">
            Attach To:
          </label>
          <select
            id="field-attach-to"
            style={styles.select}
            value={field.attachTo || ''}
            onChange={(e) => update('attachTo', e.target.value || undefined)}
          >
            <option value="">Standalone field</option>
            {fieldIds
              .filter((candidateId) => candidateId !== field.id)
              .map((candidateId) => (
                <option key={candidateId} value={candidateId}>
                  {candidateId}
                </option>
              ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-map-kind">
            Map To Kind:
          </label>
          <select
            id="field-map-kind"
            style={styles.select}
            value={field.mapTo.kind}
            onChange={(e) => updateMapTo('kind', Number(e.target.value))}
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind === 1
                  ? '1 (Note)'
                  : kind === 30023
                    ? '30023 (Article)'
                    : kind === 30078
                      ? '30078 (NIP-78)'
                      : kind}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-target">
            Target:
          </label>
          <select
            id="field-target"
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
            <label style={styles.label} htmlFor="field-tag-name">
              Tag Name:
            </label>
            <input
              id="field-tag-name"
              style={styles.input}
              type="text"
              value={field.mapTo.tagName || ''}
              onChange={(e) => updateMapTo('tagName', e.target.value)}
              placeholder="tagName"
            />
          </div>
        )}

        {field.mapTo.kind === 30078 && field.mapTo.target === 'content' && (
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="field-path">
              JSON Path:
            </label>
            <input
              id="field-path"
              style={styles.input}
              type="text"
              value={field.mapTo.path || ''}
              onChange={(e) => updateMapTo('path', e.target.value || undefined)}
              placeholder="e.g. ratings.wifi"
            />
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-placeholder">
            Placeholder:
          </label>
          <input
            id="field-placeholder"
            style={styles.input}
            type="text"
            value={placeholder || ''}
            onChange={(e) => updateMetadata('placeholder', e.target.value)}
            placeholder="Placeholder text..."
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-default">
            Default Value:
          </label>
          <input
            id="field-default"
            style={styles.input}
            type="text"
            value={
              field.defaultValue !== undefined
                ? Array.isArray(field.defaultValue)
                  ? (field.defaultValue as string[]).join(', ')
                  : String(field.defaultValue)
                : ''
            }
            onChange={(e) => {
              const raw = e.target.value;
              if (!raw) {
                update('defaultValue', undefined);
              } else if (field.uiPlugin === 'hashtag') {
                update('defaultValue', raw.split(/[,\s]+/).filter(Boolean));
              } else if (field.type === 'number') {
                update('defaultValue', Number(raw));
              } else {
                update('defaultValue', raw);
              }
            }}
            placeholder={field.uiPlugin === 'hashtag' ? 'tag1, tag2, ...' : 'Default value'}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-edit-vis">
            Edit Visibility:
          </label>
          <select
            id="field-edit-vis"
            style={styles.select}
            value={field.visibility?.edit || 'visible'}
            onChange={(e) => {
              const val = e.target.value;
              update('visibility', {
                ...field.visibility,
                edit: val === 'visible' ? undefined : val,
              });
            }}
          >
            <option value="visible">visible</option>
            <option value="hidden">hidden</option>
            <option value="readonly">readonly</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-view-vis">
            View Visibility:
          </label>
          <select
            id="field-view-vis"
            style={styles.select}
            value={field.visibility?.view || 'visible'}
            onChange={(e) => {
              const val = e.target.value;
              update('visibility', {
                ...field.visibility,
                view: val === 'visible' ? undefined : val,
              });
            }}
          >
            <option value="visible">visible</option>
            <option value="hidden">hidden</option>
          </select>
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
