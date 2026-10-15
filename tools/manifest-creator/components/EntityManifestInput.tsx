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
  label?: string;
  inputId?: string;
}

/**
 * A field's wiki entity manifest: what a wiki-entity-picker picks and creates
 * (`entityManifest`), or the wiki page a venue field creates/updates (`wikiEntity`).
 */
export function EntityManifestInput({
  value,
  onChange,
  label = 'Entity manifest:',
  inputId = 'field-entity-manifest',
}: EntityManifestInputProps) {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        style={styles.input}
        type="text"
        list="wiki-entity-manifests"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ID of a wiki manifest"
      />
      <datalist id="wiki-entity-manifests">
        {wikiManifestIds.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
    </div>
  );
}

/** Which metadata key holds a field's wiki entity manifest, by UI plugin */
export const WIKI_MANIFEST_KEYS: Record<string, { key: string; label: string }> = {
  'wiki-entity-picker': { key: 'entityManifest', label: 'Entity manifest:' },
  venue: { key: 'wikiEntity', label: 'Wiki page manifest (created/updated from OSM):' },
};
