import { EXAMPLE_MANIFESTS } from '../lib/examples';

const styles = {
  formGroup: { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' },
  label: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
};

const wikiManifestIds = Object.values(EXAMPLE_MANIFESTS)
  .filter((m) => 'wikiConfig' in m)
  .map((m) => m.id);

interface EntityManifestInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** `entityManifest` of a wiki-entity-picker field: the entity type it picks and creates. */
export function EntityManifestInput({ value, onChange }: EntityManifestInputProps) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label} htmlFor="field-entity-manifest">
        Entity manifest:
      </label>
      <input
        id="field-entity-manifest"
        style={styles.input}
        type="text"
        list="wiki-entity-manifests"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="beer-entity-v1"
      />
      <datalist id="wiki-entity-manifests">
        {wikiManifestIds.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
    </div>
  );
}
