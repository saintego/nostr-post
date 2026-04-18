/**
 * @nostr-post/web - Linked event rendering helpers for <nostr-post-view>
 *
 * Pure functions that render linked events (e.g. NIP-78 structured data)
 * using manifest field definitions and plugin view components.
 */

import { type ResolvedPostField, getFieldsByKind } from '@nostr-post/core/manifestMappings';
import { isStructuredContentKind } from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import type { DisplayableEvent } from './view';

type RegisteredPlugin = Exclude<ReturnType<typeof pluginRegistry.get>, undefined>;

/**
 * Get a nested value from an object using dot notation (e.g. "ratings.wifi").
 */
export const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

/**
 * Render a single tag field from a linked event using its plugin view component.
 */
const renderLinkedTagField = (tag: string[], field: PostField) => {
  const rawValue = tag[1];
  const label = (field.metadata?.label as string) || field.id;
  const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;

  let value: unknown = rawValue;
  if (plugin?.deserializeValue) {
    value = plugin.deserializeValue(rawValue, field);
  } else if (field.type === 'number') {
    value = Number(rawValue);
  }

  if (plugin?.viewTagName) {
    const viewTag = unsafeStatic(plugin.viewTagName);
    return html`
      <div class="linked-field">
        <span class="linked-field-label">${label}:</span>
        ${staticHtml`<${viewTag} .value=${value} .field=${field}></${viewTag}>`}
      </div>
    `;
  }
  return html`
    <div class="linked-field">
      <span class="linked-field-label">${label}:</span>
      <span>${String(value)}</span>
    </div>
  `;
};

const renderLinkedFieldValue = (
  label: string,
  value: unknown,
  field: PostField,
  plugin?: RegisteredPlugin
) => {
  if (plugin?.viewTagName) {
    const viewTag = unsafeStatic(plugin.viewTagName);
    return html`
      <div class="linked-field">
        <span class="linked-field-label">${label}:</span>
        ${staticHtml`<${viewTag} .value=${value} .field=${field}></${viewTag}>`}
      </div>
    `;
  }

  return html`
    <div class="linked-field">
      <span class="linked-field-label">${label}:</span>
      <span>${String(value)}</span>
    </div>
  `;
};

const buildFieldByTag = (fields: PostField[]): Map<string, PostField[]> => {
  const fieldByTag = new Map<string, PostField[]>();
  for (const field of fields) {
    if (!Array.isArray(field.mapTo) && field.mapTo.tagName) {
      const existing = fieldByTag.get(field.mapTo.tagName) ?? [];
      existing.push(field);
      fieldByTag.set(field.mapTo.tagName, existing);
    }
  }
  return fieldByTag;
};

const groupTagsByName = (
  tags: string[][],
  fieldByTag: Map<string, PostField[]>
): Map<string, string[][]> => {
  const tagGroups = new Map<string, string[][]>();
  for (const tag of tags) {
    if (!tag[1] || !fieldByTag.has(tag[0])) continue;
    const existing = tagGroups.get(tag[0]) ?? [];
    existing.push(tag);
    tagGroups.set(tag[0], existing);
  }
  return tagGroups;
};

const getLinkedTagGroupValue = (
  plugin: RegisteredPlugin | undefined,
  field: PostField,
  group: string[][],
  tags: string[][]
): unknown => {
  if (plugin?.resolveFromTags) {
    return plugin.resolveFromTags(tags, field);
  }

  if (field.uiPlugin === 'geo' && group.length > 1) {
    return group.map((tag) => tag[1]).reduce((a, b) => (a.length >= b.length ? a : b));
  }

  if (group.length > 1 || field.uiPlugin === 'hashtag' || field.uiPlugin === 'media') {
    return group.map((tag) => tag[1]);
  }

  return undefined;
};

/**
 * Render tag-based fields from a linked event using plugins.
 * For array-type plugins (hashtag, media), aggregates all tags with the same
 * tag name into a single array value before rendering.
 */
const renderLinkedTagPlugins = (tags: string[][], fields: PostField[]) => {
  const fieldByTag = buildFieldByTag(fields);
  const tagGroups = groupTagsByName(tags, fieldByTag);

  const results: unknown[] = [];
  for (const [tagName, group] of tagGroups) {
    const tagFields = fieldByTag.get(tagName) ?? [];
    for (const field of tagFields) {
      if (field.visibility?.view === 'hidden') continue;

      const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
      const label = (field.metadata?.label as string) || field.id;

      const groupValue = getLinkedTagGroupValue(plugin, field, group, tags);
      if (groupValue !== undefined) {
        results.push(renderLinkedFieldValue(label, groupValue, field, plugin));
        continue;
      }

      results.push(renderLinkedTagField(group[0], field));
    }
  }
  return results;
};

/**
 * Render NIP-78 JSON content fields using manifest definitions + plugins.
 */
const renderStructuredContentFields = (fields: PostField[], data: Record<string, unknown>) => {
  const results = [];

  for (const field of fields) {
    // Skip fields hidden in view
    if (field.visibility?.view === 'hidden') continue;

    // Resolve value from JSON data (supports dot-notation paths)
    let value: unknown;
    if (!Array.isArray(field.mapTo) && field.mapTo.path) {
      value = getNestedValue(data, field.mapTo.path);
    } else {
      value = data[field.id];
    }

    if (value === undefined || value === null) continue;

    const label = (field.metadata?.label as string) || field.id;

    // Try plugin view component
    const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
    if (plugin?.viewTagName) {
      const viewTag = unsafeStatic(plugin.viewTagName);
      results.push(html`
        <div class="linked-field">
          <span class="linked-field-label">${label}:</span>
          ${staticHtml`<${viewTag} .value=${value} .field=${field}></${viewTag}>`}
        </div>
      `);
    } else {
      // Fallback: render as text
      results.push(html`
        <div class="linked-field">
          <span class="linked-field-label">${label}:</span>
          <span>${String(value)}</span>
        </div>
      `);
    }
  }

  return results;
};

/**
 * Render fields from a single linked event.
 */
const renderSingleLinkedEvent = (linkedEvent: DisplayableEvent, m: NostrPostManifest) => {
  const results: unknown[] = [];
  const fieldsForKind: ResolvedPostField[] = getFieldsByKind(m, linkedEvent.kind, [
    linkedEvent.kind,
  ]);
  if (fieldsForKind.length === 0) return results;

  const contentFields = fieldsForKind.filter((f) => f.mapTo.target === 'content');
  const hasStructuredContentFields =
    contentFields.length > 0 && isStructuredContentKind(linkedEvent.kind);

  if (hasStructuredContentFields && linkedEvent.content) {
    try {
      const data = JSON.parse(linkedEvent.content);
      results.push(...renderStructuredContentFields(contentFields, data));
    } catch {
      // Not valid JSON, skip
    }
  }

  // Also render tag-based fields from linked events
  const tagFields = fieldsForKind.filter((f) => f.mapTo.target === 'tag' && f.mapTo.tagName);
  if (tagFields.length > 0) {
    results.push(...renderLinkedTagPlugins(linkedEvent.tags, tagFields));
  }

  return results;
};

/**
 * Render data from all linked events using manifest field definitions.
 * Returns empty string if there are no linked events or no manifest.
 */
export const renderLinkedEvents = (
  linkedEvents: DisplayableEvent[],
  manifest: NostrPostManifest | undefined
) => {
  if (linkedEvents.length === 0) return '';
  if (!manifest) return '';

  const results = [];

  for (const linkedEvent of linkedEvents) {
    results.push(...renderSingleLinkedEvent(linkedEvent, manifest));
  }

  if (results.length === 0) return '';

  return html` <div class="linked-data">${results}</div> `;
};

export const renderManifestEventData = (
  event: DisplayableEvent,
  manifest: NostrPostManifest | undefined
) => {
  if (!manifest) return '';

  const results = renderSingleLinkedEvent(event, manifest);
  if (results.length === 0) return '';

  return html`${results}`;
};

export const hasStructuredContentMappings = (
  event: DisplayableEvent,
  manifest: NostrPostManifest | undefined
): boolean => {
  if (!manifest) return false;
  if (!isStructuredContentKind(event.kind)) return false;

  return getFieldsByKind(manifest, event.kind, [event.kind]).some(
    (field) => field.mapTo.target === 'content'
  );
};
