'use client';

import { getManifestAvailableKinds, getUsedKinds } from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { useRef } from 'react';
import { EXAMPLE_MANIFESTS } from '../lib/examples';
import { FieldEditor } from './FieldEditor';
import { PublishFormatsEditor } from './PublishFormatsEditor';
import { WikiConfigEditor } from './WikiConfigEditor';
import { SUPPORTED_KINDS, formatKindLabel } from './kindLabels';
import { styles } from './manifestEditorStyles';

interface ManifestEditorProps {
  manifest: NostrPostManifest;
  onChange: (manifest: NostrPostManifest) => void;
}

const getConfiguredManifestKinds = (manifest: NostrPostManifest): number[] => {
  const availableKinds = getManifestAvailableKinds(manifest);
  const mappingKinds = getUsedKinds(manifest);

  return Array.from(new Set([...availableKinds, ...mappingKinds])).sort((a, b) => a - b);
};

const getEditorAvailableKinds = (manifest: NostrPostManifest): number[] => {
  const configuredKinds = getConfiguredManifestKinds(manifest);

  return Array.from(new Set([...SUPPORTED_KINDS, ...configuredKinds])).sort((a, b) => a - b);
};

export function ManifestEditor({ manifest, onChange }: ManifestEditorProps) {
  const configuredManifestKinds = getConfiguredManifestKinds(manifest);
  const manifestKinds = getEditorAvailableKinds(manifest);

  const fieldEditorKeysRef = useRef<string[]>(manifest.fields.map(() => crypto.randomUUID()));

  const ensureEditorKeys = (fieldCount: number) => {
    while (fieldEditorKeysRef.current.length < fieldCount) {
      fieldEditorKeysRef.current.push(crypto.randomUUID());
    }
    if (fieldEditorKeysRef.current.length > fieldCount) {
      fieldEditorKeysRef.current = fieldEditorKeysRef.current.slice(0, fieldCount);
    }
  };

  ensureEditorKeys(manifest.fields.length);

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
      mapTo: { kind: manifestKinds[0] ?? 1, target: 'content' },
      required: false,
      metadata: {
        label: 'New Field',
      },
    };

    fieldEditorKeysRef.current.push(crypto.randomUUID());

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
    fieldEditorKeysRef.current.splice(index, 1);
    onChange({
      ...manifest,
      fields: manifest.fields.filter((_, i) => i !== index),
    });
  };

  const loadExample = (key: string) => {
    const nextManifest = structuredClone(EXAMPLE_MANIFESTS[key]);
    fieldEditorKeysRef.current = nextManifest.fields.map(() => crypto.randomUUID());
    onChange(nextManifest);
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
          fieldEditorKeysRef.current = (json.fields ?? []).map(() => crypto.randomUUID());
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

      <WikiConfigEditor manifest={manifest} onChange={onChange} />

      <div style={styles.section}>
        <label style={styles.label} htmlFor="manifest-extends">
          Extends:
        </label>
        <textarea
          id="manifest-extends"
          style={styles.textarea}
          value={
            manifest.extends
              ? Array.isArray(manifest.extends)
                ? manifest.extends.join('\n')
                : manifest.extends
              : ''
          }
          onChange={(e) => {
            const lines = e.target.value
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean);
            onChange({
              ...manifest,
              extends: lines.length === 0 ? undefined : lines.length === 1 ? lines[0] : lines,
            });
          }}
          placeholder={
            '30078:<pubkey>:nostr-post:<manifest-id>\n(one parent per line, or bare manifest ID)'
          }
        />
        <p style={{ ...styles.helperText, marginTop: '0.25rem' }}>
          Inherit fields from parent manifest(s). One entry per line — full NIP-78 a-tag or bare
          manifest ID. Multiple parents are merged left-to-right (last wins on conflict).
        </p>
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
        <legend style={styles.label}>Available Kinds:</legend>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {manifestKinds.map((kind) => (
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
              {formatKindLabel(kind)}
            </span>
          ))}
        </div>
        {configuredManifestKinds.length === 0 ? (
          <p style={styles.helperText}>
            No publish formats or field mappings define kinds yet. The editor starts with its
            built-in supported kinds.
          </p>
        ) : (
          <p style={styles.helperText}>
            Supported kinds are always available in the editor. Imported manifests can still show
            additional kinds already present in their mappings or publish formats.
          </p>
        )}
      </fieldset>

      <PublishFormatsEditor manifest={manifest} manifestKinds={manifestKinds} onChange={onChange} />

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
              key={fieldEditorKeysRef.current[index]}
              field={field}
              kinds={manifestKinds}
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
