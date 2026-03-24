'use client';

import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { EXAMPLE_MANIFESTS } from '../lib/examples';
import { FieldEditor } from './FieldEditor';

interface ManifestEditorProps {
  manifest: NostrPostManifest;
  onChange: (manifest: NostrPostManifest) => void;
}

const styles = {
  panel: {
    background: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    padding: '1.5rem',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e5e7eb',
  },
  panelTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: 0,
  },
  section: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    fontWeight: 500,
    marginBottom: '0.5rem',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  button: {
    padding: '0.5rem 1rem',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '0.5rem 1rem',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  fieldList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
} as const;

export function ManifestEditor({ manifest, onChange }: ManifestEditorProps) {
  const updateMetadata = (key: string, value: string) => {
    onChange({
      ...manifest,
      metadata: {
        ...manifest.metadata,
        [key]: value,
      },
    });
  };

  const updateBasic = (key: keyof NostrPostManifest, value: string | number[]) => {
    onChange({
      ...manifest,
      [key]: value,
    });
  };

  const addField = () => {
    const newField: PostField = {
      id: `field_${Date.now()}`,
      type: 'string',
      uiPlugin: 'text',
      mapTo: { kind: manifest.requiredKinds[0], target: 'content' },
      required: false,
      metadata: {
        label: 'New Field',
      },
    };

    onChange({
      ...manifest,
      fields: [...manifest.fields, newField],
    });
  };

  const updateField = (index: number, field: PostField) => {
    const newFields = [...manifest.fields];
    newFields[index] = field;
    onChange({
      ...manifest,
      fields: newFields,
    });
  };

  const deleteField = (index: number) => {
    onChange({
      ...manifest,
      fields: manifest.fields.filter((_, i) => i !== index),
    });
  };

  const loadExample = (key: string) => {
    onChange(EXAMPLE_MANIFESTS[key]);
  };

  const exportJSON = () => {
    const json = JSON.stringify(manifest, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${manifest.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          onChange(json);
        } catch (err) {
          alert('Failed to parse JSON');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>Manifest Editor</h2>
        <div style={styles.buttonGroup}>
          <button type="button" style={styles.secondaryButton} onClick={exportJSON}>
            Export JSON
          </button>
          <button type="button" style={styles.secondaryButton} onClick={importJSON}>
            Import JSON
          </button>
        </div>
      </div>

      {/* Examples */}
      <div style={styles.section}>
        <h3 style={{ ...styles.label, margin: 0, fontSize: '1.1em' }}>Load Example:</h3>
        <div style={styles.buttonGroup}>
          {Object.keys(EXAMPLE_MANIFESTS).map((key) => (
            <button
              key={key}
              type="button"
              style={styles.secondaryButton}
              onClick={() => loadExample(key)}
            >
              {EXAMPLE_MANIFESTS[key].metadata?.name || key}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Info */}
      <div style={styles.section}>
        <label style={styles.label} htmlFor="manifest-id">
          Manifest ID:
        </label>
        <input
          id="manifest-id"
          style={styles.input}
          type="text"
          value={manifest.id}
          onChange={(e) => updateBasic('id', e.target.value)}
          placeholder="my-manifest-v1"
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label} htmlFor="manifest-version">
          Version:
        </label>
        <input
          id="manifest-version"
          style={styles.input}
          type="text"
          value={manifest.version}
          onChange={(e) => updateBasic('version', e.target.value)}
          placeholder="1.0.0"
        />
      </div>

      <div style={styles.section}>
        <label
          style={{
            ...styles.label,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={manifest.linkManifest !== false}
            onChange={(e) => onChange({ ...manifest, linkManifest: e.target.checked })}
          />
          Link manifest in posts
        </label>
        <span
          style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '-0.25rem' }}
        >
          When enabled, published events include an &lsquo;a&rsquo; tag so any client can auto-fetch
          this manifest to render posts correctly. Disable for manifests that only provide a
          predefined editing experience.
        </span>
      </div>

      <fieldset style={{ ...styles.section, border: 'none', margin: 0, padding: 0 }}>
        <legend style={styles.label}>Required Kinds:</legend>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {manifest.requiredKinds.map((kind, i) => (
            <span
              key={kind}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                background: '#ede9fe',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#6d28d9',
                fontWeight: 500,
              }}
            >
              {kind === 1
                ? '1 (Note)'
                : kind === 30023
                  ? '30023 (Article)'
                  : kind === 30078
                    ? '30078 (NIP-78)'
                    : kind}
              <button
                type="button"
                onClick={() => {
                  const newKinds = manifest.requiredKinds.filter((_, idx) => idx !== i);
                  if (newKinds.length > 0) updateBasic('requiredKinds', newKinds);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6d28d9',
                  padding: '0 2px',
                  fontSize: '1rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            id="add-kind"
            style={{ ...styles.input, width: 'auto', flex: 1 }}
            defaultValue=""
            onChange={(e) => {
              const kind = Number(e.target.value);
              if (kind && !manifest.requiredKinds.includes(kind)) {
                updateBasic('requiredKinds', [...manifest.requiredKinds, kind]);
              }
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              Add kind...
            </option>
            {[1, 30023, 30078]
              .filter((k) => !manifest.requiredKinds.includes(k))
              .map((k) => (
                <option key={k} value={k}>
                  {k === 1
                    ? '1 — Note'
                    : k === 30023
                      ? '30023 — Article (NIP-23)'
                      : '30078 — App Data (NIP-78)'}
                </option>
              ))}
          </select>
          <input
            style={{ ...styles.input, width: '100px' }}
            type="number"
            placeholder="Custom"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const kind = Number((e.target as HTMLInputElement).value);
                if (kind > 0 && !manifest.requiredKinds.includes(kind)) {
                  updateBasic('requiredKinds', [...manifest.requiredKinds, kind]);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
        </div>
      </fieldset>

      <div style={styles.section}>
        <label style={styles.label} htmlFor="manifest-name">
          Name:
        </label>
        <input
          id="manifest-name"
          style={styles.input}
          type="text"
          value={manifest.metadata?.name || ''}
          onChange={(e) => updateMetadata('name', e.target.value)}
          placeholder="My Post Type"
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label} htmlFor="manifest-description">
          Description:
        </label>
        <textarea
          id="manifest-description"
          style={styles.textarea}
          value={manifest.metadata?.description || ''}
          onChange={(e) => updateMetadata('description', e.target.value)}
          placeholder="Describe your post type..."
        />
      </div>

      {/* Fields */}
      <div style={styles.section}>
        <div style={styles.panelHeader}>
          <h3 style={{ ...styles.panelTitle, fontSize: '1.125rem' }}>Fields</h3>
          <button style={styles.button} type="button" onClick={addField}>
            + Add Field
          </button>
        </div>

        <div style={styles.fieldList}>
          {manifest.fields.map((field, index) => (
            <FieldEditor
              key={field.id}
              field={field}
              kinds={manifest.requiredKinds}
              fieldIds={manifest.fields.map((candidate) => candidate.id)}
              onChange={(f) => updateField(index, f)}
              onDelete={() => deleteField(index)}
            />
          ))}
        </div>
      </div>
      {/* Manifest JSON */}
      <div style={styles.section}>
        <details>
          <summary
            style={{ cursor: 'pointer', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}
          >
            Manifest JSON
          </summary>
          <pre
            style={{
              background: '#1f2937',
              color: '#e5e7eb',
              padding: '1rem',
              borderRadius: '0.375rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              overflowX: 'auto',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
