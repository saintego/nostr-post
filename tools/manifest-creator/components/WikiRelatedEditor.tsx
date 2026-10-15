'use client';

import type { WikiRelatedSection } from '@nostr-post/wiki';
import { styles } from './fieldEditorStyles';
import { useListKeys } from './useListKeys';

interface WikiRelatedEditorProps {
  related: WikiRelatedSection[];
  onChange: (related: WikiRelatedSection[]) => void;
}

const cardStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.5rem',
  padding: '0.5rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.375rem',
  background: 'white',
} as const;

const inputStyle = { ...styles.input, minWidth: 0 } as const;
const groupStyle = { ...styles.formGroup, minWidth: 0 } as const;

/** `1, 30078` → `[1, 30078]` */
const parseKinds = (text: string): number[] =>
  text
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((kind) => Number.isInteger(kind) && kind >= 0);

/** A section without its empty optional keys */
const cleanSection = (section: WikiRelatedSection): WikiRelatedSection =>
  Object.fromEntries(
    Object.entries(section).filter(([, value]) => value !== undefined && value !== '')
  ) as unknown as WikiRelatedSection;

/** Edits `wikiConfig.related`: sections of related items listed on an entity's page. */
export function WikiRelatedEditor({ related, onChange }: WikiRelatedEditorProps) {
  const sectionKeys = useListKeys(related.length);
  const update = (index: number, patch: Partial<WikiRelatedSection>) =>
    onChange(related.map((s, i) => (i === index ? cleanSection({ ...s, ...patch }) : s)));
  const remove = (index: number) => {
    sectionKeys.removeKey(index);
    onChange(related.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={styles.label}>Related sections</div>
          <div style={styles.helperText}>
            Lists on an entity's page: events whose <code>a</code> tags point at the entity, e.g.
            its reviews (by manifest) or wiki entities of another type (by d-tag suffix, optionally
            in a role). A manifest extending this one adds sections; one with the same id (else
            label) replaces it, e.g. to translate the heading.
          </div>
        </div>
        <button
          type="button"
          style={styles.smallButton}
          onClick={() => onChange([...related, { label: '', kinds: [1] }])}
        >
          + Add Section
        </button>
      </div>

      {related.map((section, index) => {
        const id = (name: string) => `related-${index}-${name}`;
        return (
          <div key={sectionKeys.keys[index]} style={cardStyle}>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('label')}>
                Heading
              </label>
              <input
                id={id('label')}
                style={inputStyle}
                type="text"
                value={section.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="e.g. Reviews"
              />
            </div>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('id')}>
                Id (for manifests extending this one)
              </label>
              <input
                id={id('id')}
                style={inputStyle}
                type="text"
                value={section.id ?? ''}
                onChange={(e) => update(index, { id: e.target.value || undefined })}
                placeholder="e.g. reviews"
              />
            </div>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('kinds')}>
                Kinds
              </label>
              <input
                // Typed text is kept until blur; a new key resets it when the kinds change elsewhere
                key={section.kinds.join(',')}
                id={id('kinds')}
                style={inputStyle}
                type="text"
                defaultValue={section.kinds.join(', ')}
                onBlur={(e) => update(index, { kinds: parseKinds(e.target.value) })}
                placeholder="1, 30078 (posts) or 30818 (wiki)"
              />
            </div>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('manifest')}>
                Only posts of manifest
              </label>
              <input
                id={id('manifest')}
                style={inputStyle}
                type="text"
                value={section.manifest ?? ''}
                onChange={(e) => update(index, { manifest: e.target.value || undefined })}
                placeholder="e.g. venue-review-v1"
              />
            </div>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('suffix')}>
                Only wiki entities with d-tag suffix
              </label>
              <input
                id={id('suffix')}
                style={inputStyle}
                type="text"
                value={section.dTagSuffix ?? ''}
                onChange={(e) => update(index, { dTagSuffix: e.target.value || undefined })}
                placeholder="e.g. -brewery"
              />
            </div>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('role')}>
                Only in role (their field id)
              </label>
              <input
                id={id('role')}
                style={inputStyle}
                type="text"
                value={section.role ?? ''}
                onChange={(e) => update(index, { role: e.target.value || undefined })}
                placeholder="e.g. taprooms"
              />
            </div>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('limit')}>
                Shown at first
              </label>
              <input
                id={id('limit')}
                style={inputStyle}
                type="number"
                min={1}
                value={section.limit ?? ''}
                onChange={(e) =>
                  update(index, { limit: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="20"
              />
            </div>
            <div style={groupStyle}>
              <label style={styles.label} htmlFor={id('stats')}>
                Average of tag (out of max)
              </label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <input
                  id={id('stats')}
                  style={inputStyle}
                  type="text"
                  value={section.stats?.tag ?? ''}
                  onChange={(e) =>
                    update(index, {
                      stats: e.target.value ? { ...section.stats, tag: e.target.value } : undefined,
                    })
                  }
                  placeholder="e.g. rating"
                />
                <input
                  style={{ ...inputStyle, width: '5rem' }}
                  type="number"
                  min={1}
                  aria-label={`Section ${index + 1} stats max`}
                  disabled={!section.stats}
                  value={section.stats?.max ?? ''}
                  onChange={(e) =>
                    section.stats &&
                    update(index, {
                      stats: {
                        tag: section.stats.tag,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="5"
                />
              </div>
            </div>
            <div
              style={{ ...groupStyle, flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}
            >
              <label style={{ ...styles.label, display: 'flex', gap: '0.375rem' }}>
                <input
                  type="checkbox"
                  checked={section.gallery ?? false}
                  onChange={(e) => update(index, { gallery: e.target.checked || undefined })}
                />
                Photo gallery
              </label>
              <button
                type="button"
                style={{ ...styles.deleteButton, marginLeft: 'auto' }}
                onClick={() => remove(index)}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
