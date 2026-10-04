import type { NostrPostManifest } from '@nostr-post/core/types';
import type { WikiManifest } from '@nostr-post/wiki';

const styles = {
  section: { marginBottom: '1.5rem' },
  label: { display: 'block', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    boxSizing: 'border-box' as const,
  },
  hint: { fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0' },
};

interface WikiConfigEditorProps {
  manifest: NostrPostManifest;
  onChange: (manifest: NostrPostManifest) => void;
}

/** Title and d-tag templates of a NIP-54 wiki manifest (shown only for wiki manifests). */
export function WikiConfigEditor({ manifest, onChange }: WikiConfigEditorProps) {
  if (!('wikiConfig' in manifest)) return null;
  const config = (manifest as WikiManifest).wikiConfig ?? {};
  const update = (key: 'titleTemplate' | 'dTagTemplate', value: string) =>
    onChange({ ...manifest, wikiConfig: { ...config, [key]: value || undefined } } as never);

  return (
    <div style={styles.section}>
      <label style={styles.label} htmlFor="wiki-title-template">
        Wiki title template:
      </label>
      <input
        id="wiki-title-template"
        style={styles.input}
        type="text"
        value={config.titleTemplate ?? ''}
        onChange={(e) => update('titleTemplate', e.target.value)}
        placeholder="{name} (Type)"
      />
      <label style={{ ...styles.label, marginTop: '0.75rem' }} htmlFor="wiki-dtag-template">
        Wiki d-tag template:
      </label>
      <input
        id="wiki-dtag-template"
        style={styles.input}
        type="text"
        value={config.dTagTemplate ?? ''}
        onChange={(e) => update('dTagTemplate', e.target.value)}
        placeholder="{name}-(type)"
      />
      <p style={styles.hint}>
        Fixed text around the placeholders marks the entity type: pickers referencing this manifest
        only list d-tags with it (<code>{'{name}-(type)'}</code> → <code>-type</code>).
      </p>
    </div>
  );
}
