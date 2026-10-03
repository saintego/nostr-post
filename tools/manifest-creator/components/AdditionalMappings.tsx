'use client';

import { isStructuredContentKind } from '@nostr-post/core/manifestMappings';
import type { NostrTarget, PostField } from '@nostr-post/core/types';
import { styles } from './fieldEditorStyles';
import { formatKindLabel } from './kindLabels';

interface AdditionalMappingsProps {
  field: PostField;
  kinds: number[];
  /** All of the field's targets; the first is the primary mapping edited above */
  targets: NostrTarget[];
  onAddMapping: () => void;
  onRemoveMapping: (index: number) => void;
  onUpdateTarget: (index: number, patch: Partial<NostrTarget>) => void;
}

/** Extra event targets for a field, beyond its primary mapping. */
export function AdditionalMappings({
  field,
  kinds,
  targets,
  onAddMapping,
  onRemoveMapping,
  onUpdateTarget,
}: AdditionalMappingsProps) {
  const additionalMappingsHeadingId = `${field.id}-additional-mappings`;

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div id={additionalMappingsHeadingId} style={styles.label}>
            Additional Event Mappings
          </div>
          <div style={styles.helperText}>
            Add extra targets when this field should publish to both Kind 1 and NIP-78.
          </div>
        </div>
        <button type="button" style={styles.smallButton} onClick={onAddMapping}>
          + Add Mapping
        </button>
      </div>

      {targets.length === 1 ? (
        <div style={styles.helperText}>Only the primary mapping is configured.</div>
      ) : (
        targets.slice(1).map((target, index) => (
          <div key={`${field.id}-mapping-${index + 1}`} style={styles.mappingCard}>
            {(() => {
              const mappingIndex = index + 1;
              const kindInputId = `${field.id}-mapping-kind-${mappingIndex}`;
              const targetInputId = `${field.id}-mapping-target-${mappingIndex}`;
              const tagNameInputId = `${field.id}-mapping-tag-${mappingIndex}`;
              const pathInputId = `${field.id}-mapping-path-${mappingIndex}`;

              return (
                <>
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
                      onClick={() => onRemoveMapping(index + 1)}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={styles.grid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor={kindInputId}>
                        Kind
                      </label>
                      <select
                        id={kindInputId}
                        style={styles.select}
                        value={target.kind}
                        onChange={(e) =>
                          onUpdateTarget(index + 1, { kind: Number(e.target.value) })
                        }
                      >
                        {kinds.map((kind) => (
                          <option key={kind} value={kind}>
                            {formatKindLabel(kind)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor={targetInputId}>
                        Target
                      </label>
                      <select
                        id={targetInputId}
                        style={styles.select}
                        value={target.target}
                        onChange={(e) =>
                          onUpdateTarget(index + 1, {
                            target: e.target.value as 'content' | 'tag',
                          })
                        }
                      >
                        <option value="content">content</option>
                        <option value="tag">tag</option>
                      </select>
                    </div>

                    {target.target === 'tag' && (
                      <div style={styles.formGroup}>
                        <label style={styles.label} htmlFor={tagNameInputId}>
                          Tag Name
                        </label>
                        <input
                          id={tagNameInputId}
                          style={styles.input}
                          type="text"
                          value={target.tagName || ''}
                          onChange={(e) =>
                            onUpdateTarget(index + 1, { tagName: e.target.value || undefined })
                          }
                          placeholder="tagName"
                        />
                      </div>
                    )}

                    {target.target === 'content' && isStructuredContentKind(target.kind) && (
                      <div style={styles.formGroup}>
                        <label style={styles.label} htmlFor={pathInputId}>
                          JSON Path
                        </label>
                        <input
                          id={pathInputId}
                          style={styles.input}
                          type="text"
                          value={target.path || ''}
                          onChange={(e) =>
                            onUpdateTarget(index + 1, { path: e.target.value || undefined })
                          }
                          placeholder="e.g. ratings.overall"
                        />
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        ))
      )}
    </div>
  );
}
