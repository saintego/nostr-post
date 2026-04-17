'use client';

import { getFieldTargets } from '@nostr-post/core/manifestMappings';
import type { NostrTarget, PostField } from '@nostr-post/core/types';

interface FieldEditorProps {
  field: PostField;
  kinds: number[];
  fieldIds?: string[];
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
  helperText: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  mappingCard: {
    border: '1px dashed #d1d5db',
    borderRadius: '0.375rem',
    padding: '0.75rem',
    background: 'white',
  },
  smallButton: {
    padding: '0.35rem 0.65rem',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
} as const;

export function FieldEditor({ field, kinds, fieldIds = [], onChange, onDelete }: FieldEditorProps) {
  const currentTargets = getFieldTargets(field);
  const primaryTarget = currentTargets[0] ?? {
    kind: kinds[0] ?? 1,
    target: 'content' as const,
  };

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

  const normalizeTarget = (target: NostrTarget): NostrTarget => {
    const normalized: NostrTarget = {
      kind: target.kind,
      target: target.target,
    };

    if (target.target === 'tag' && target.tagName) {
      normalized.tagName = target.tagName;
    }

    if (target.target === 'content' && target.path) {
      normalized.path = target.path;
    }

    return normalized;
  };

  const commitTargets = (targets: NostrTarget[]) => {
    const normalizedTargets = targets.map(normalizeTarget);
    onChange({
      ...field,
      mapTo: normalizedTargets.length === 1 ? normalizedTargets[0] : normalizedTargets,
    });
  };

  const updateTargetAt = (index: number, patch: Partial<NostrTarget>) => {
    const nextTargets = [...currentTargets];
    const existing = nextTargets[index] ?? { kind: kinds[0] ?? 1, target: 'content' as const };
    nextTargets[index] = { ...existing, ...patch };
    commitTargets(nextTargets);
  };

  const updateMapTo = (key: string, value: unknown) => {
    updateTargetAt(0, { [key]: value } as Partial<NostrTarget>);
  };

  const addMapping = () => {
    commitTargets([...currentTargets, { kind: kinds[0] ?? 1, target: 'content' }]);
  };

  const removeMapping = (index: number) => {
    const nextTargets = currentTargets.filter((_, targetIndex) => targetIndex !== index);
    if (nextTargets.length > 0) {
      commitTargets(nextTargets);
    }
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
            <option value="identifier">identifier</option>
            <option value="textarea">textarea</option>
            <option value="markdown">markdown</option>
            <option value="stars">stars</option>
            <option value="media">media</option>
            <option value="geo">geo</option>
            <option value="venue">venue</option>
            <option value="hashtag">hashtag</option>
            <option value="reference">reference</option>
            <option value="list">list</option>
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
            value={primaryTarget.kind}
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
            value={primaryTarget.target}
            onChange={(e) => updateMapTo('target', e.target.value)}
          >
            <option value="content">content</option>
            <option value="tag">tag</option>
          </select>
        </div>

        {primaryTarget.target === 'tag' && (
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="field-tag-name">
              Tag Name:
            </label>
            <input
              id="field-tag-name"
              style={styles.input}
              type="text"
              value={primaryTarget.tagName || ''}
              onChange={(e) => updateMapTo('tagName', e.target.value)}
              placeholder="tagName"
            />
          </div>
        )}

        {primaryTarget.kind === 30078 && primaryTarget.target === 'content' && (
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="field-path">
              JSON Path:
            </label>
            <input
              id="field-path"
              style={styles.input}
              type="text"
              value={primaryTarget.path || ''}
              onChange={(e) => updateMapTo('path', e.target.value || undefined)}
              placeholder="e.g. ratings.wifi"
            />
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-map-behavior">
            Map Behavior:
          </label>
          <select
            id="field-map-behavior"
            style={styles.select}
            value={field.mapBehavior || 'first-active'}
            onChange={(e) => update('mapBehavior', e.target.value)}
          >
            <option value="first-active">first-active</option>
            <option value="all-active">all-active</option>
          </select>
        </div>

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

        <div
          style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={styles.label}>Additional Event Mappings</label>
              <div style={styles.helperText}>
                Add extra targets when this field should publish to both Kind 1 and NIP-78.
              </div>
            </div>
            <button type="button" style={styles.smallButton} onClick={addMapping}>
              + Add Mapping
            </button>
          </div>

          {currentTargets.length === 1 ? (
            <div style={styles.helperText}>Only the primary mapping is configured.</div>
          ) : (
            currentTargets.slice(1).map((target, index) => (
              <div key={`${field.id}-mapping-${index + 1}`} style={styles.mappingCard}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <strong style={{ fontSize: '0.875rem', color: '#111827' }}>
                    Mapping {index + 2}
                  </strong>
                  <button
                    type="button"
                    style={{ ...styles.smallButton, background: '#dc2626' }}
                    onClick={() => removeMapping(index + 1)}
                  >
                    Remove
                  </button>
                </div>

                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Kind</label>
                    <select
                      style={styles.select}
                      value={target.kind}
                      onChange={(e) => updateTargetAt(index + 1, { kind: Number(e.target.value) })}
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
                    <label style={styles.label}>Target</label>
                    <select
                      style={styles.select}
                      value={target.target}
                      onChange={(e) =>
                        updateTargetAt(index + 1, { target: e.target.value as 'content' | 'tag' })
                      }
                    >
                      <option value="content">content</option>
                      <option value="tag">tag</option>
                    </select>
                  </div>

                  {target.target === 'tag' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Tag Name</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={target.tagName || ''}
                        onChange={(e) =>
                          updateTargetAt(index + 1, { tagName: e.target.value || undefined })
                        }
                        placeholder="tagName"
                      />
                    </div>
                  )}

                  {target.target === 'content' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>JSON Path</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={target.path || ''}
                        onChange={(e) =>
                          updateTargetAt(index + 1, { path: e.target.value || undefined })
                        }
                        placeholder="e.g. ratings.overall"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
