'use client';

import { getManifestAvailableKinds } from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest, PostField, PublishFormat } from '@nostr-post/core/types';
import { useRef } from 'react';
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
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    minHeight: '80px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
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
  const manifestKinds = getManifestAvailableKinds(manifest);

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

  const updatePublishFormats = (publishFormats: PublishFormat[] | undefined) => {
    onChange({
      ...manifest,
      publishFormats: publishFormats && publishFormats.length > 0 ? publishFormats : undefined,
    });
  };

  const addPublishFormat = () => {
    const existingFormats = manifest.publishFormats ?? [];
    const nextFormat: PublishFormat = {
      id: `format-${Date.now()}`,
      label: `Format ${existingFormats.length + 1}`,
      description: '',
      kinds: [manifestKinds[0] ?? 1],
      userSelectable: true,
      default: !existingFormats.some((format) => format.default),
    };
    updatePublishFormats([...existingFormats, nextFormat]);
  };

  const updatePublishFormat = (index: number, patch: Partial<PublishFormat>) => {
    const nextFormats = (manifest.publishFormats ?? []).map((format, formatIndex) => {
      if (formatIndex === index) return { ...format, ...patch };
      if (patch.default) return { ...format, default: false };
      return format;
    });
    updatePublishFormats(nextFormats);
  };

  const deletePublishFormat = (index: number) => {
    const nextFormats = (manifest.publishFormats ?? []).filter(
      (_, formatIndex) => formatIndex !== index
    );
    if (nextFormats.length > 0 && !nextFormats.some((format) => format.default)) {
      nextFormats[0] = { ...nextFormats[0], default: true };
    }
    updatePublishFormats(nextFormats);
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
          {manifestKinds.length > 0 ? (
            manifestKinds.map((kind) => (
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
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Add a publish format or field mapping to define event kinds.
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
          This list is derived from your publish formats and field mappings.
        </p>
      </fieldset>

      <div style={styles.section}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <div style={styles.label}>Publish Formats:</div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
              Optional event-selection choices shown in the composer UI.
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={addPublishFormat}>
            + Add Format
          </button>
        </div>

        {manifest.publishFormats && manifest.publishFormats.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginTop: '0.75rem',
            }}
          >
            {manifest.publishFormats.map((format, index) => (
              <div
                key={`${format.id}-${index}`}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  background: '#f9fafb',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {(() => {
                    const formatIdInputId = `publish-format-id-${index}`;
                    const formatLabelInputId = `publish-format-label-${index}`;
                    const formatDescriptionInputId = `publish-format-description-${index}`;
                    const formatKindsGroupId = `publish-format-kinds-${index}`;

                    return (
                      <>
                        <div style={{ minWidth: 0 }}>
                          <label style={styles.label} htmlFor={formatIdInputId}>
                            Format ID
                          </label>
                          <input
                            id={formatIdInputId}
                            style={styles.input}
                            type="text"
                            value={format.id}
                            onChange={(e) => updatePublishFormat(index, { id: e.target.value })}
                            placeholder="kind1-note"
                          />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <label style={styles.label} htmlFor={formatLabelInputId}>
                            Label
                          </label>
                          <input
                            id={formatLabelInputId}
                            style={styles.input}
                            type="text"
                            value={format.label}
                            onChange={(e) => updatePublishFormat(index, { label: e.target.value })}
                            placeholder="Kind 1 note"
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={styles.label} htmlFor={formatDescriptionInputId}>
                            Description
                          </label>
                          <input
                            id={formatDescriptionInputId}
                            style={styles.input}
                            type="text"
                            value={format.description || ''}
                            onChange={(e) =>
                              updatePublishFormat(index, {
                                description: e.target.value || undefined,
                              })
                            }
                            placeholder="Describe when this publish option should be used"
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div id={formatKindsGroupId} style={styles.label}>
                            Included Kinds
                          </div>
                          <div
                            aria-labelledby={formatKindsGroupId}
                            style={{
                              display: 'flex',
                              gap: '0.75rem',
                              flexWrap: 'wrap',
                              marginTop: '0.25rem',
                            }}
                          >
                            {manifestKinds.map((kind) => {
                              const checked = format.kinds.includes(kind);
                              return (
                                <label
                                  key={`${format.id}-kind-${kind}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const nextKinds = e.target.checked
                                        ? [...format.kinds, kind]
                                        : format.kinds.filter(
                                            (existingKind) => existingKind !== kind
                                          );
                                      if (nextKinds.length > 0) {
                                        updatePublishFormat(index, {
                                          kinds: Array.from(new Set(nextKinds)).sort(
                                            (a, b) => a - b
                                          ),
                                        });
                                      }
                                    }}
                                  />
                                  {kind === 1
                                    ? '1 (Note)'
                                    : kind === 30023
                                      ? '30023 (Article)'
                                      : kind === 30078
                                        ? '30078 (NIP-78)'
                                        : kind}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <label
                            style={{
                              ...styles.label,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              marginBottom: 0,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={format.default === true}
                              onChange={(e) =>
                                updatePublishFormat(index, { default: e.target.checked })
                              }
                            />
                            Default format
                          </label>
                          <label
                            style={{
                              ...styles.label,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              marginBottom: 0,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={format.userSelectable !== false}
                              onChange={(e) =>
                                updatePublishFormat(index, { userSelectable: e.target.checked })
                              }
                            />
                            User selectable
                          </label>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    style={{ ...styles.secondaryButton, background: '#dc2626' }}
                    onClick={() => deletePublishFormat(index)}
                  >
                    Delete Format
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: '#f5f3ff',
              color: '#5b21b6',
              fontSize: '0.875rem',
            }}
          >
            No publish formats yet. Add one to let users choose between Kind 1, NIP-78, or hybrid
            publishing.
          </div>
        )}
      </div>

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
