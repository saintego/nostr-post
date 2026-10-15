'use client';

import type { NostrPostManifest, PublishFormat } from '@nostr-post/core/types';
import { formatKindLabel } from './kindLabels';
import { styles } from './manifestEditorStyles';

interface PublishFormatsEditorProps {
  manifest: NostrPostManifest;
  /** Kinds the formats can include */
  manifestKinds: number[];
  onChange: (manifest: NostrPostManifest) => void;
}

/** Optional event-selection choices (publishFormats) shown in the composer UI. */
export function PublishFormatsEditor({
  manifest,
  manifestKinds,
  onChange,
}: PublishFormatsEditorProps) {
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

  return (
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
                  const formatKindsHelperId = `publish-format-kinds-helper-${index}`;

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
                        <label
                          id={formatKindsGroupId}
                          style={styles.label}
                          htmlFor={`publish-format-kinds-select-${index}`}
                        >
                          Included Kinds
                        </label>
                        <select
                          id={`publish-format-kinds-select-${index}`}
                          multiple
                          aria-labelledby={formatKindsGroupId}
                          aria-describedby={formatKindsHelperId}
                          style={{ ...styles.multiSelect, marginTop: '0.25rem' }}
                          size={Math.min(Math.max(manifestKinds.length, 2), 6)}
                          value={format.kinds.map(String)}
                          onChange={(e) => {
                            const nextKinds = Array.from(e.target.selectedOptions)
                              .map((option) => Number(option.value))
                              .filter((kind) => Number.isFinite(kind))
                              .sort((a, b) => a - b);

                            if (nextKinds.length > 0) {
                              updatePublishFormat(index, { kinds: nextKinds });
                            }
                          }}
                        >
                          {manifestKinds.map((kind) => {
                            return (
                              <option key={`${format.id}-kind-${kind}`} value={kind}>
                                {formatKindLabel(kind)}
                              </option>
                            );
                          })}
                        </select>
                        <p
                          id={formatKindsHelperId}
                          style={{ ...styles.helperText, marginTop: '0.35rem' }}
                        >
                          Use Cmd/Ctrl-click to select multiple kinds. Each format must include at
                          least one kind.
                        </p>
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
  );
}
