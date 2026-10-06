'use client';

import { getFieldTargets, isStructuredContentKind } from '@nostr-post/core/manifestMappings';
import type { NostrTarget, PostField } from '@nostr-post/core/types';
import { AdditionalMappings } from './AdditionalMappings';
import { EntityManifestInput, WIKI_MANIFEST_KEYS } from './EntityManifestInput';
import { styles } from './fieldEditorStyles';
import { formatKindLabel } from './kindLabels';

interface FieldEditorProps {
  field: PostField;
  kinds: number[];
  fieldIds?: string[];
  onChange: (field: PostField) => void;
  onDelete: () => void;
}

/** Default value as shown in the text input (lists comma-separated) */
const formatDefaultValue = (field: PostField): string => {
  if (field.defaultValue === undefined) return '';
  return Array.isArray(field.defaultValue)
    ? (field.defaultValue as string[]).join(', ')
    : String(field.defaultValue);
};

/** Default value from the text input, typed for the field */
const parseDefaultValue = (field: PostField, raw: string): unknown => {
  if (!raw) return undefined;
  if (field.uiPlugin === 'hashtag') return raw.split(/[,\s]+/).filter(Boolean);
  if (field.type === 'number') return Number(raw);
  return raw;
};

/** Field visibility with `mode` set; "visible" is the default, so it's stored as unset */
const withVisibility = (field: PostField, mode: 'edit' | 'view', value: string) => ({
  ...field.visibility,
  [mode]: value === 'visible' ? undefined : value,
});

/** The field's wiki entity manifest setting (picker or venue), if its plugin has one */
const wikiManifestFor = (field: PostField) =>
  field.uiPlugin ? WIKI_MANIFEST_KEYS[field.uiPlugin] : undefined;

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
  const wikiManifest = wikiManifestFor(field);
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
            <option value="wiki-entity-picker">wiki-entity-picker</option>
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
                {formatKindLabel(kind)}
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

        {primaryTarget.target === 'content' && isStructuredContentKind(primaryTarget.kind) && (
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

        {wikiManifest && (
          <EntityManifestInput
            label={wikiManifest.label}
            inputId={`field-${wikiManifest.key}`}
            value={(field.metadata?.[wikiManifest.key] as string | undefined) ?? ''}
            onChange={(v) => updateMetadata(wikiManifest.key, v || undefined)}
          />
        )}

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="field-default">
            Default Value:
          </label>
          <input
            id="field-default"
            style={styles.input}
            type="text"
            value={formatDefaultValue(field)}
            onChange={(e) => update('defaultValue', parseDefaultValue(field, e.target.value))}
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
            onChange={(e) => update('visibility', withVisibility(field, 'edit', e.target.value))}
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
            onChange={(e) => update('visibility', withVisibility(field, 'view', e.target.value))}
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

        <AdditionalMappings
          field={field}
          kinds={kinds}
          targets={currentTargets}
          onAddMapping={addMapping}
          onRemoveMapping={removeMapping}
          onUpdateTarget={updateTargetAt}
        />
      </div>
    </div>
  );
}
