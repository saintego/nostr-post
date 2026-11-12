/**
 * Tag values of a post in <nostr-post-view>, rendered by the manifest fields' plugin views
 * (media, hashtags, stars, …). Fields with a built-in input (text, number, select) show as
 * text: a `title` tag as the post's heading, others as "label: value". Values the note text
 * already shows are left out.
 */

import { fieldOptionLabel } from '@nostr-post/core/enumOptions';
import { fieldLabel, viewFieldOrder } from '@nostr-post/core/manifest';
import { getFieldsByKind, getFieldTargets } from '@nostr-post/core/manifestMappings';
import { isShownInNote, type NoteToken } from '@nostr-post/core/noteContent';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html, nothing, type TemplateResult } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

type RegisteredPlugin = Exclude<ReturnType<typeof pluginRegistry.get>, undefined>;

export type TagPluginsInput = {
  kind: number;
  manifest: NostrPostManifest | undefined;
  tags: string[][];
  tokens: readonly NoteToken[];
  excludeFields?: readonly string[];
  /** The post's author, for plugin views that need it (e.g. media on the author's servers) */
  author?: string;
  /** The note text, placed where the manifest's content field is in its view order */
  content?: TemplateResult | typeof nothing;
  /**
   * The event's content as written: shown by the content field's plugin view instead of
   * `content` when it has one (e.g. Markdown formatted by `<np-markdown-view>`)
   */
  text?: string;
};

/** Tag name → manifest fields mapped to that tag on `kind` */
const tagFieldMap = (manifest: NostrPostManifest | undefined, kind: number) => {
  const map = new Map<string, PostField[]>();
  if (!manifest) return map;
  for (const field of getFieldsByKind(manifest, kind, [kind])) {
    if (!Array.isArray(field.mapTo) && field.mapTo.target === 'tag' && field.mapTo.tagName) {
      const fields = map.get(field.mapTo.tagName) ?? [];
      fields.push(field);
      map.set(field.mapTo.tagName, fields);
    }
  }
  return map;
};

/** Groups tag values by tag name, leaving out values the note text already shows */
const groupTagValues = (
  tags: string[][],
  fieldMap: Map<string, PostField[]>,
  tokens: readonly NoteToken[]
): Map<string, string[]> => {
  const groups = new Map<string, string[]>();
  for (const [tagName, rawValue] of tags) {
    if (!tagName || !rawValue || !fieldMap.has(tagName) || isShownInNote(tokens, rawValue)) {
      continue;
    }
    groups.set(tagName, [...(groups.get(tagName) ?? []), rawValue]);
  }
  return groups;
};

const deserializeTagValue = (plugin: RegisteredPlugin, field: PostField, raw: string): unknown => {
  if (plugin.deserializeValue) return plugin.deserializeValue(raw, field);
  if (field.type === 'number') return Number(raw);
  return raw;
};

const resolveTagPluginValue = (
  plugin: RegisteredPlugin,
  field: PostField,
  values: string[],
  tags: string[][]
): unknown => {
  // undefined: the plugin leaves this field to the default reading of its tag
  const resolved = plugin.resolveFromTags?.(tags, field);
  if (resolved !== undefined) return resolved;
  if (field.uiPlugin === 'geo') return values.reduce((a, b) => (a.length >= b.length ? a : b));
  if (values.length > 1 || field.uiPlugin === 'hashtag' || field.uiPlugin === 'media') {
    return values;
  }
  return deserializeTagValue(plugin, field, values[0] ?? '');
};

/** Inputs of the composer itself, without a plugin view: their values show as text */
const BUILT_IN_INPUTS = new Set(['text', 'textarea', 'number', 'select']);

const renderPlainTagField = (
  field: PostField,
  tagName: string,
  values: string[]
): TemplateResult => {
  if (tagName === 'title') {
    return html`<div class="tag-title">${values.map((v) => fieldOptionLabel(field, v)).join(', ')}</div>`;
  }
  // Web links open; other values show as text
  const shown = values.map((value, index) => {
    const separator = index > 0 ? ', ' : '';
    return /^https?:\/\/\S+$/.test(value)
      ? html`${separator}<a href=${value} target="_blank" rel="noopener noreferrer">${value}</a>`
      : html`${separator}${fieldOptionLabel(field, value)}`;
  });
  return html`<div class="tag-row"><span class="tag-label">${fieldLabel(field)}:</span> ${shown}</div>`;
};

/** One field's values: its plugin's view, as text for a built-in input, else nothing */
const renderTagField = (
  field: PostField,
  tagName: string,
  values: string[],
  tags: string[][],
  author?: string
): TemplateResult | undefined => {
  const plugin = pluginRegistry.get(field.uiPlugin);
  if (!plugin) {
    return BUILT_IN_INPUTS.has(field.uiPlugin)
      ? renderPlainTagField(field, tagName, values)
      : undefined;
  }
  if (!plugin.viewTagName) return undefined;
  const value = resolveTagPluginValue(plugin, field, values, tags);
  const viewTag = unsafeStatic(plugin.viewTagName);
  return staticHtml`<${viewTag} .value=${value} .field=${field} .author=${author}></${viewTag}>`;
};

type TagEntry = { fieldId: string; template: TemplateResult };

/** Each shown field's rendered values: a `title` apart, as the heading */
const renderTagEntries = ({
  kind,
  manifest,
  tags,
  tokens,
  excludeFields,
  author,
}: TagPluginsInput): { titles: TemplateResult[]; entries: TagEntry[] } => {
  const fieldMap = tagFieldMap(manifest, kind);
  const entries: TagEntry[] = [];
  const titles: TemplateResult[] = [];
  for (const [tagName, values] of groupTagValues(tags, fieldMap, tokens)) {
    for (const field of fieldMap.get(tagName) ?? []) {
      if (field.visibility?.view === 'hidden' || excludeFields?.includes(field.id)) continue;
      const rendered = renderTagField(field, tagName, values, tags, author);
      if (!rendered) continue;
      if (tagName === 'title') titles.push(rendered);
      else entries.push({ fieldId: field.id, template: rendered });
    }
  }
  return { titles, entries };
};

/** The field written to the event's content on `kind`, if any */
const contentField = (
  manifest: NostrPostManifest | undefined,
  kind: number
): PostField | undefined =>
  manifest?.fields.find((field) =>
    getFieldTargets(field).some((t) => t.kind === kind && t.target === 'content')
  );

/** The content by its field's plugin view (e.g. formatted Markdown), else the note text */
const renderContent = (
  field: PostField | undefined,
  text: string | undefined,
  content: TemplateResult | typeof nothing | undefined
): TemplateResult | undefined => {
  const viewTagName = field ? pluginRegistry.get(field.uiPlugin)?.viewTagName : undefined;
  if (field && viewTagName && text) {
    const viewTag = unsafeStatic(viewTagName);
    return staticHtml`<${viewTag} .value=${text} .field=${field}></${viewTag}>`;
  }
  return content && content !== nothing ? html`${content}` : undefined;
};

/**
 * Render tag values using registered plugin view components, and the note text (`content`).
 * Aggregates multi-value tags (hashtags, media) into arrays.
 * Skips fields without a plugin view (built-in inputs show as text), hidden in view, or in
 * `excludeFields`. A `title` comes first; the rest follow the manifest's view order
 * (`viewOrder`, else field order), the text where its content field is (else first).
 */
export const renderTagPlugins = ({
  kind,
  manifest,
  tags,
  tokens,
  excludeFields,
  author,
  content,
  text,
}: TagPluginsInput): TemplateResult[] => {
  const { titles, entries } = renderTagEntries({
    kind,
    manifest,
    tags,
    tokens,
    excludeFields,
    author,
  });
  const field = contentField(manifest, kind);
  const shownContent = renderContent(field, text, content);
  if (shownContent) entries.push({ fieldId: field?.id ?? '', template: shownContent });
  const order = manifest ? viewFieldOrder(manifest) : [];
  // Fields outside the order (the text without a content field) come first
  const rank = (fieldId: string) => order.indexOf(fieldId);
  const sorted = [...entries].sort((a, b) => rank(a.fieldId) - rank(b.fieldId));
  return [...titles, ...sorted.map((entry) => entry.template)];
};
