'use client';

import type { PostField } from '@nostr-post/core/types';
import { styles } from './fieldEditorStyles';

interface PickerSettingsProps {
  field: PostField;
  onMetadataChange: (key: string, value: unknown) => void;
}

/** Settings of a wiki-entity-picker field; renders nothing for other plugins. */
export function PickerSettings({ field, onMetadataChange }: PickerSettingsProps) {
  if (field.uiPlugin !== 'wiki-entity-picker') return null;
  return (
    <div style={styles.formGroup}>
      <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          style={styles.checkbox}
          type="checkbox"
          checked={field.metadata?.multiple === true}
          onChange={(e) => onMetadataChange('multiple', e.target.checked || undefined)}
        />
        Pick several entities
      </label>
      <div style={styles.helperText}>
        With an infobox target too, the row names the role (e.g. "Brewed at") with wikilinks
      </div>
    </div>
  );
}
