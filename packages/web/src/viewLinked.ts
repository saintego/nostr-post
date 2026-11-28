/**
 * @nostr-post/web - Linked event rendering helpers for <nostr-post-view>
 *
 * Pure functions that render linked events (e.g. NIP-78 structured data)
 * using manifest field definitions and plugin view components.
 */

import { fieldOptionLabel } from '@nostr-post/core/enumOptions';
import { fieldDescription, fieldLabel } from '@nostr-post/core/manifest';
import {
  getFieldsByKind,
  getFieldTargets,
  isStructuredContentKind,
  type ResolvedPostField,
} from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
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

/** A value as text; enum values show their option's label */
const displayValue = (field: PostField, value: unknown): string =>
  field.type === 'enum' && typeof value === 'string'
    ? fieldOptionLabel(field, value)
    : String(value);

/** What every field's view gets besides its value: the event's author and address, the layout */
export interface FieldViewContext {
  /** Hex pubkey of the event's author (e.g. whom a payment field zaps) */
  author?: string;
  /** The event's address when it is addressable (`<kind>:<pubkey>:<d>`) */
  address?: string;
  /** The manifest's `viewLayout: 'cards'`: plugin fields as one grid of cards, without labels */
  cards: boolean;
}

/** A rendered field: a row (label and value), or a card of the cards layout */
interface RenderedField {
  card: boolean;
  template: unknown;
}

/** Fields shown as text above the cards in the cards layout (an intro), not as cards */
const isTextPlugin = (field: PostField): boolean => field.uiPlugin === 'markdown';

/** One field's value: its plugin's view (with the author and address), else as text */
const renderFieldRow = (
  field: PostField,
  value: unknown,
  ctx: FieldViewContext,
  plugin?: RegisteredPlugin
): RenderedField => {
  const label = html`<span class="linked-field-label" title=${ifDefined(fieldDescription(field))}
    >${fieldLabel(field)}:</span
  >`;
  if (!plugin?.viewTagName) {
    return {
      card: false,
      template: html`<div class="linked-field">${label} <span>${displayValue(field, value)}</span></div>`,
    };
  }
  const viewTag = unsafeStatic(plugin.viewTagName);
  const card = ctx.cards && !isTextPlugin(field);
  const view = staticHtml`<${viewTag}
    .value=${value}
    .field=${field}
    .author=${ctx.author}
    .address=${ctx.address}
    ?grid-items=${card}
  ></${viewTag}>`;
  if (card) return { card: true, template: view };
  if (ctx.cards) return { card: false, template: html`<div class="linked-text">${view}</div>` };
  return { card: false, template: html`<div class="linked-field">${label} ${view}</div>` };
};

/**
 * Render a single tag field from a linked event using its plugin view component.
 */
const renderLinkedTagField = (tag: string[], field: PostField, ctx: FieldViewContext) => {
  const rawValue = tag[1];
  const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
  let value: unknown = rawValue;
  if (plugin?.deserializeValue) {
    value = plugin.deserializeValue(rawValue, field);
  } else if (field.type === 'number') {
    value = Number(rawValue);
  }
  return renderFieldRow(field, value, ctx, plugin);
};

const buildFieldByTag = (fields: PostField[]): Map<string, PostField[]> => {
  const fieldByTag = new Map<string, PostField[]>();
  for (const field of fields) {
    for (const target of getFieldTargets(field)) {
      if (target.target !== 'tag' || !target.tagName) continue;

      const existing = fieldByTag.get(target.tagName) ?? [];
      existing.push(field);
      fieldByTag.set(target.tagName, existing);
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
  // undefined: the plugin leaves this field to the default reading of its tag
  const resolved = plugin?.resolveFromTags?.(tags, field);
  if (resolved !== undefined) return resolved;

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
const renderLinkedTagPlugins = (tags: string[][], fields: PostField[], ctx: FieldViewContext) => {
  const fieldByTag = buildFieldByTag(fields);
  const tagGroups = groupTagsByName(tags, fieldByTag);

  const results: RenderedField[] = [];
  for (const [tagName, group] of tagGroups) {
    const tagFields = fieldByTag.get(tagName) ?? [];
    for (const field of tagFields) {
      if (field.visibility?.view === 'hidden') continue;

      const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;

      const groupValue = getLinkedTagGroupValue(plugin, field, group, tags);
      if (groupValue !== undefined) {
        results.push(renderFieldRow(field, groupValue, ctx, plugin));
        continue;
      }

      results.push(renderLinkedTagField(group[0], field, ctx));
    }
  }
  return results;
};

/**
 * Render NIP-78 JSON content fields using manifest definitions + plugins.
 */
const renderStructuredContentFields = (
  fields: PostField[],
  data: Record<string, unknown>,
  ctx: FieldViewContext
) => {
  const results: RenderedField[] = [];

  for (const field of fields) {
    // Skip fields hidden in view
    if (field.visibility?.view === 'hidden') continue;

    // Resolve value from JSON data (supports dot-notation paths)
    const value =
      !Array.isArray(field.mapTo) && field.mapTo.path
        ? getNestedValue(data, field.mapTo.path)
        : data[field.id];
    if (value === undefined || value === null) continue;

    const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
    results.push(renderFieldRow(field, value, ctx, plugin));
  }

  return results;
};

/**
 * Render fields from a single linked event.
 */
/** The address of an addressable event (kinds 30000–39999), from its d tag */
const addressOfEvent = (event: DisplayableEvent): string | undefined => {
  if (event.kind < 30000 || event.kind >= 40000 || !event.pubkey) return undefined;
  const d = event.tags.find((tag) => tag[0] === 'd')?.[1] ?? '';
  return `${event.kind}:${event.pubkey}:${d}`;
};

const renderSingleLinkedEvent = (linkedEvent: DisplayableEvent, m: NostrPostManifest) => {
  const results: RenderedField[] = [];
  const fieldsForKind: ResolvedPostField[] = getFieldsByKind(m, linkedEvent.kind, [
    linkedEvent.kind,
  ]);
  if (fieldsForKind.length === 0) return [];
  const ctx: FieldViewContext = {
    author: linkedEvent.pubkey || undefined,
    address: addressOfEvent(linkedEvent),
    cards: m.viewLayout === 'cards',
  };

  const contentFields = fieldsForKind.filter((f) => f.mapTo.target === 'content');
  const hasStructuredContentFields =
    contentFields.length > 0 && isStructuredContentKind(linkedEvent.kind);

  if (hasStructuredContentFields && linkedEvent.content) {
    try {
      const data = JSON.parse(linkedEvent.content);
      results.push(...renderStructuredContentFields(contentFields, data, ctx));
    } catch {
      // Not valid JSON, skip
    }
  }

  // Also render tag-based fields from linked events
  const tagFields = fieldsForKind.filter((f) => f.mapTo.target === 'tag' && f.mapTo.tagName);
  if (tagFields.length > 0) {
    results.push(...renderLinkedTagPlugins(linkedEvent.tags, tagFields, ctx));
  }

  // The cards layout: rows and text first, then the cards in one grid
  const rows = results.filter((r) => !r.card).map((r) => r.template);
  const cards = results.filter((r) => r.card).map((r) => r.template);
  return cards.length > 0 ? [...rows, html`<div class="view-cards">${cards}</div>`] : rows;
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
