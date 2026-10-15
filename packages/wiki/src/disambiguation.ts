import type { NostrPostManifest } from '@nostr-post/core/types';
import { interpolateTemplate, templateFieldIds, templateText } from './identity';
import { normalizeDTag } from './normalizeDTag';
import type { WikiManifest } from './types';

/** Longest form value offered as a distinguishing suggestion */
const MAX_SUGGESTION_LENGTH = 30;
const MAX_SUGGESTIONS = 5;
const MAX_EXAMPLE_LABELS = 3;

const identityTemplate = (manifest: NostrPostManifest): string | undefined => {
  const config = (manifest as WikiManifest).wikiConfig;
  return config?.dTagTemplate ?? config?.titleTemplate;
};

/** The field that holds the entity's name: the first placeholder of the d-tag/title template. */
export function nameFieldId(manifest: NostrPostManifest): string | undefined {
  const template = identityTemplate(manifest);
  return template ? templateFieldIds(template)[0] : undefined;
}

/**
 * The d-tag a new entity gets from `formData`, with `qualifier` added to its
 * name to tell it apart from another entity with the same name:
 * `{title}-(beer)` + "Bitcoin" + "Moonshine" → `bitcoin-moonshine-beer`.
 */
export function entityDTagFor(
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  qualifier = ''
): string | undefined {
  const template = identityTemplate(manifest);
  if (!template) return undefined;
  const nameId = nameFieldId(manifest);
  const name = nameId ? String(formData[nameId] ?? '').trim() : '';
  const data =
    nameId && qualifier.trim()
      ? { ...formData, [nameId]: `${name} ${qualifier.trim()}` }
      : formData;
  const dTag = normalizeDTag(interpolateTemplate(template, data));
  return dTag || undefined;
}

/**
 * The title a new entity gets, with `qualifier` added Wikipedia-style: inside a
 * trailing parenthesis ("Bitcoin (Beer)" → "Bitcoin (Moonshine Beer)"), or as
 * one ("Bitcoin" → "Bitcoin (Moonshine)"). Undefined without a title template.
 */
export function entityTitleFor(
  manifest: NostrPostManifest,
  formData: Record<string, unknown>,
  qualifier = ''
): string | undefined {
  const template = (manifest as WikiManifest).wikiConfig?.titleTemplate;
  if (!template) return undefined;
  const title = interpolateTemplate(template, formData);
  const q = qualifier.trim();
  if (!title || !q) return title || undefined;
  const parenthesis = title.match(/^(.*\S)\s*\(([^()]*)\)$/);
  return parenthesis ? `${parenthesis[1]} (${q} ${parenthesis[2]})` : `${title} (${q})`;
}

/** A short text for a form value, or undefined if it doesn't make a good qualifier. */
function suggestionText(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const text = value.trim();
    return text && text.length <= MAX_SUGGESTION_LENGTH && !text.includes('\n') ? text : undefined;
  }
  // Reference fields (e.g. a picked brewery): its name without "(Brewery)"
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return suggestionText(templateText(value));
  }
  return undefined;
}

/**
 * Values from other filled-in fields that could tell this entity apart from
 * another with the same name: the brewery, the style, a year, ….
 */
export function distinguishingSuggestions(
  manifest: NostrPostManifest,
  formData: Record<string, unknown>
): string[] {
  const nameId = nameFieldId(manifest);
  const values = manifest.fields
    .filter((f) => f.id !== nameId)
    .map((f) => suggestionText(formData[f.id]))
    .filter((text): text is string => !!text);
  return Array.from(new Set(values)).slice(0, MAX_SUGGESTIONS);
}

/** Field types whose values are too long or not text, so they make poor qualifiers */
const NON_QUALIFIER_PLUGINS = new Set(['textarea', 'markdown', 'media']);

/**
 * Labels of fields whose values could tell two same-named entities apart, as
 * examples for the user (beer: "Brewery", "Style"; venue: "City", "Category").
 */
export function distinguishingFieldLabels(manifest: NostrPostManifest): string[] {
  const nameId = nameFieldId(manifest);
  return manifest.fields
    .filter((f) => f.id !== nameId && !NON_QUALIFIER_PLUGINS.has(f.uiPlugin))
    .map((f) => (f.metadata?.label as string | undefined) ?? f.id)
    .slice(0, MAX_EXAMPLE_LABELS);
}

/** Fixed d-tag parts that mark an entity type, e.g. suffix `-beer` for `{title}-(beer)` */
export interface EntityTypeAffixes {
  prefix: string;
  suffix: string;
}

/**
 * The entity type's d-tag prefix/suffix: the literal text before the first and
 * after the last `{placeholder}` of wikiConfig.dTagTemplate (or titleTemplate,
 * which the d-tag is derived from otherwise), normalized like a d-tag.
 */
export function entityTypeAffixes(manifest: NostrPostManifest): EntityTypeAffixes {
  const config = (manifest as WikiManifest).wikiConfig;
  const parts = (config?.dTagTemplate ?? config?.titleTemplate)?.split(/\{\w+\}/);
  if (!parts || parts.length < 2) return { prefix: '', suffix: '' };
  const prefix = normalizeDTag(parts[0] ?? '');
  const suffix = normalizeDTag(parts[parts.length - 1] ?? '');
  return { prefix: prefix ? `${prefix}-` : '', suffix: suffix ? `-${suffix}` : '' };
}
