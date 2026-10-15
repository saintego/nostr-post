'use client';

import type { WikiLinkTemplate } from '@nostr-post/wiki';
import { styles } from './fieldEditorStyles';

interface WikiLinksEditorProps {
  links: WikiLinkTemplate[];
  /** Field ids a link's condition can test */
  fieldIds: string[];
  onChange: (links: WikiLinkTemplate[]) => void;
}

const cardStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr) auto',
  gap: '0.375rem',
  alignItems: 'center',
  padding: '0.375rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.375rem',
  background: 'white',
} as const;

const inputStyle = { ...styles.input, minWidth: 0 } as const;

/** Edits `wikiConfig.links`: links to external pages derived from an entity's data. */
export function WikiLinksEditor({ links, fieldIds, onChange }: WikiLinksEditorProps) {
  const update = (index: number, link: WikiLinkTemplate) =>
    onChange(links.map((l, i) => (i === index ? link : l)));
  const setCondition = (index: number, link: WikiLinkTemplate, field: string, equals: string) =>
    update(index, { ...link, when: field ? { field, equals } : undefined });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={styles.label}>Links</div>
          <div style={styles.helperText}>
            Links to other sites, worked out when an entity is shown: <code>{'{i:osm}'}</code> an
            external ID, <code>{'{fieldId}'}</code> a field's value, <code>{'{fieldId.key}'}</code>{' '}
            a key of the selected option. Left out when a placeholder has no value.
          </div>
        </div>
        <button
          type="button"
          style={styles.smallButton}
          onClick={() => onChange([...links, { label: '', url: '' }])}
        >
          + Add Link
        </button>
      </div>

      {links.map((link, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: links are edited in place
        <div key={index} style={cardStyle}>
          <input
            style={inputStyle}
            type="text"
            aria-label={`Link ${index + 1} label`}
            value={link.label}
            onChange={(e) => update(index, { ...link, label: e.target.value })}
            placeholder="Label, e.g. BTC Map"
          />
          <input
            style={inputStyle}
            type="text"
            aria-label={`Link ${index + 1} URL`}
            value={link.url}
            onChange={(e) => update(index, { ...link, url: e.target.value })}
            placeholder="https://example.org/{i:osm}"
          />
          <button
            type="button"
            style={{ ...styles.deleteButton, gridRow: '1 / span 2', gridColumn: 3 }}
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            ×
          </button>
          <select
            style={inputStyle}
            aria-label={`Link ${index + 1} condition field`}
            value={link.when?.field ?? ''}
            onChange={(e) => setCondition(index, link, e.target.value, link.when?.equals ?? '')}
          >
            <option value="">Always shown</option>
            {fieldIds.map((id) => (
              <option key={id} value={id}>
                Only when {id} =
              </option>
            ))}
          </select>
          <input
            style={inputStyle}
            type="text"
            aria-label={`Link ${index + 1} condition value`}
            disabled={!link.when}
            value={link.when?.equals ?? ''}
            onChange={(e) => setCondition(index, link, link.when?.field ?? '', e.target.value)}
            placeholder="value, e.g. yes"
          />
        </div>
      ))}
    </div>
  );
}
