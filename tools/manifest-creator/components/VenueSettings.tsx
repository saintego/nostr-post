'use client';

import type { PostField } from '@nostr-post/core/types';
import { styles } from './fieldEditorStyles';

interface VenueSettingsProps {
  field: PostField;
  onMetadataChange: (key: string, value: unknown) => void;
}

const LEVELS = [
  { id: 'country', label: 'Country' },
  { id: 'city', label: 'City' },
  { id: 'place', label: 'Exact place' },
] as const;

/** What a venue field can stand for (`metadata.levels`); renders nothing for other plugins. */
export function VenueSettings({ field, onMetadataChange }: VenueSettingsProps) {
  if (field.uiPlugin !== 'venue') return null;
  const current = Array.isArray(field.metadata?.levels)
    ? (field.metadata.levels as string[])
    : ['place'];
  const toggle = (id: string, on: boolean) => {
    const next = LEVELS.map((l) => l.id).filter((l) => (l === id ? on : current.includes(l)));
    // Exact places only is the default
    const isDefault = next.length === 1 && next[0] === 'place';
    onMetadataChange('levels', next.length === 0 || isDefault ? undefined : next);
  };
  return (
    <div style={styles.formGroup}>
      <div style={styles.label}>Levels:</div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {LEVELS.map((level) => (
          <label key={level.id} style={{ ...styles.label, display: 'flex', gap: '0.25rem' }}>
            <input
              style={styles.checkbox}
              type="checkbox"
              checked={current.includes(level.id)}
              onChange={(e) => toggle(level.id, e.target.checked)}
            />
            {level.label}
          </label>
        ))}
      </div>
      <div style={styles.helperText}>Only an exact place gets a venue wiki page</div>
    </div>
  );
}
