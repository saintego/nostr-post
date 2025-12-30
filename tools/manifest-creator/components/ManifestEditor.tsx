'use client';

import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { type } from '../.next/dev/types/routes';
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
          <button style={styles.secondaryButton} onClick={exportJSON}>
            Export JSON
          </button>
          <button style={styles.secondaryButton} onClick={importJSON}>
            Import JSON
          </button>
        </div>
      </div>

      {/* Examples */}
      <div style={styles.section}>
        <label style={styles.label}>Load Example:</label>
        <div style={styles.buttonGroup}>
          {Object.keys(EXAMPLE_MANIFESTS).map((key) => (
            <button key={key} style={styles.secondaryButton} onClick={() => loadExample(key)}>
              {EXAMPLE_MANIFESTS[key].metadata?.name || key}
            </button>
          ))}
        </div>
      </div>

      {/* Basic Info */}
      <div style={styles.section}>
        <label style={styles.label}>Manifest ID:</label>
        <input
          style={styles.input}
          type="text"
          value={manifest.id}
          onChange={(e) => updateBasic('id', e.target.value)}
          placeholder="my-manifest-v1"
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Version:</label>
        <input
          style={styles.input}
          type="text"
          value={manifest.version}
          onChange={(e) => updateBasic('version', e.target.value)}
          placeholder="1.0.0"
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Name:</label>
        <input
          style={styles.input}
          type="text"
          value={manifest.metadata?.name || ''}
          onChange={(e) => updateMetadata('name', e.target.value)}
          placeholder="My Post Type"
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Description:</label>
        <textarea
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
              onChange={(f) => updateField(index, f)}
              onDelete={() => deleteField(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
