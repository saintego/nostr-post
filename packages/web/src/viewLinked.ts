/**
 * @nostr-post/web - Linked event rendering helpers for <nostr-post-view>
 *
 * Pure functions that render linked events (e.g. NIP-78 structured data)
 * using manifest field definitions and plugin view components.
 */

import { NIP78_KIND } from '@nostr-post/core/nip78';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import type { DisplayableEvent } from './view';

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

/**
 * Render tag-based fields from a linked event using plugins.
 */
const renderLinkedTagPlugins = (tags: string[][], fields: PostField[]) => {
  const fieldByTag = new Map<string, PostField>();
  for (const f of fields) {
    if (f.mapTo.tagName) fieldByTag.set(f.mapTo.tagName, f);
  }

  return tags
    .filter((tag) => tag[1] && fieldByTag.has(tag[0]))
    .map((tag) => {
      const field = fieldByTag.get(tag[0]);
      if (!field) return '';
      return renderLinkedTagField(tag, field);
    });
};

/**
 * Render NIP-78 JSON content fields using manifest definitions + plugins.
 */
const renderNip78Fields = (fields: PostField[], data: Record<string, unknown>) => {
  const results = [];

  for (const field of fields) {
    // Resolve value from JSON data (supports dot-notation paths)
    let value: unknown;
    if (field.mapTo.path) {
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
  const fieldsForKind = m.fields.filter((f) => f.mapTo.kind === linkedEvent.kind);
  if (fieldsForKind.length === 0) return results;

  // For NIP-78 events, parse JSON content
  if ((linkedEvent.kind === NIP78_KIND || linkedEvent.kind === 30079) && linkedEvent.content) {
    const contentFields = fieldsForKind.filter((f) => f.mapTo.target === 'content');
    if (contentFields.length > 0) {
      try {
        const data = JSON.parse(linkedEvent.content);
        results.push(...renderNip78Fields(contentFields, data));
      } catch {
        // Not valid JSON, skip
      }
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

  return html`
    <div class="linked-data">
      ${results}
    </div>
  `;
};
