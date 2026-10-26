/**
 * @nostr-post/web - Update-comment web rendering helpers
 *
 * Pure update-comment logic lives in @nostr-post/core/eventUpdates.
 * This module adds:
 *  - renderUpdateComments (Lit HTML)
 *  - serializeFieldValue / formatPrefillAsUpdateComment (needs pluginRegistry)
 *  - extractPrefillFromEvent (needs pluginRegistry)
 */

// Re-export pure functions from core so callers have a single import path
export {
  applyUpdateCommentsToEvent,
  EDITOR_ROLES,
  eventEditors,
  isUpdateComment,
  parseUpdateComment,
  tryParseJsonObject,
  UPDATE_COMMENT_PATTERN,
} from '@nostr-post/core/eventUpdates';

import {
  isUpdateComment,
  parseUpdateComment,
  tryParseJsonObject,
} from '@nostr-post/core/eventUpdates';
import { getFieldsByKind, isStructuredContentKind } from '@nostr-post/core/manifestMappings';
import { readPostRoles } from '@nostr-post/core/postRoles';
import type {
  DisplayableEvent,
  NostrPostManifest,
  NostrTarget,
  PostField,
} from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import type { TemplateResult } from 'lit';
import { html, nothing } from 'lit';

/**
 * Render the collapsible update-comments section shown beneath an event.
 * Returns nothing when there are no kind-1 update comments to show.
 */
export const renderUpdateComments = (
  interactionEvents: DisplayableEvent[] | undefined,
  editors: ReadonlySet<string>
): TemplateResult | typeof nothing => {
  if (!interactionEvents || interactionEvents.length === 0) return nothing;

  // Each interaction event may contain multiple update lines (one per field).
  // Only the event's editors' update comments count (eventEditors), as in
  // applyUpdateCommentsToEvent.
  const updates: { fieldId: string; rawValue: string }[] = [];
  for (const e of interactionEvents) {
    if (e.kind !== 1 || !editors.has(e.pubkey) || !isUpdateComment(e.content)) continue;
    for (const line of e.content.split('\n')) {
      const parsed = parseUpdateComment(line);
      if (parsed) updates.push(parsed);
    }
  }

  if (updates.length === 0) return nothing;

  return html`
    <details class="view-updates">
      <summary class="view-updates-summary">
        ${updates.length} applied update${updates.length > 1 ? 's' : ''}
      </summary>
      <ul class="view-updates-list">
        ${updates.map((u) => html`<li><strong>${u.fieldId}</strong>: ${u.rawValue}</li>`)}
      </ul>
    </details>
  `;
};

/**
 * Serialize a single field value to a scalar string for update-comment diff lines.
 * Plugins that store objects as JSON strings go through the object path so their
 * serializeValue() can signal "not diffable" by returning ''.
 */
function serializeFieldValue(field: PostField, value: unknown): string | undefined {
  const v = typeof value === 'string' ? tryParseJsonObject(value) : value;
  if (typeof v === 'string') return v.replace(/\n/g, ' ');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(String).join(',');
  if (typeof v === 'object' && v !== null) {
    const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
    const s = plugin?.serializeValue?.(v, field);
    return s || undefined;
  }
  return undefined;
}

/**
 * Serialize new form values into a multi-line update-comment diff string:
 *   update:{fieldId}:{value}\n...
 * Only includes fields whose serialized new value differs from the serialized
 * original value (omits unchanged fields).  Object values (e.g. VenueData)
 * are serialized via the plugin's serializeValue. Newlines inside a value are
 * collapsed to a space so the one-field-per-line format is preserved.
 */
export function formatPrefillAsUpdateComment(
  manifest: NostrPostManifest,
  eventKind: number,
  newValues: Record<string, unknown>,
  originalValues: Record<string, unknown>
): string {
  const lines: string[] = [];

  for (const field of getFieldsByKind(manifest, eventKind, [eventKind])) {
    // Skip enrichment/attachment fields — their values are derived from other fields
    // and should not be independently diffed or emitted as update lines.
    if (field.attachTo) continue;
    const newSerialized = serializeFieldValue(field, newValues[field.id]);
    if (!newSerialized) continue;
    const origSerialized = serializeFieldValue(field, originalValues[field.id]) ?? '';
    if (newSerialized === origSerialized) continue;
    lines.push(`update:${field.id}:${newSerialized}`);
  }

  return lines.join('\n');
}

/** Structured content kinds (30078/30079): the JSON object keyed by field id */
const parseStructuredContent = (event: DisplayableEvent): Record<string, unknown> | undefined => {
  if (!isStructuredContentKind(event.kind) || !event.content) return undefined;
  try {
    return JSON.parse(event.content) as Record<string, unknown>;
  } catch {
    return undefined; // not valid JSON – treat as plain text
  }
};

/** The value at a dot path (`a.b.c`), undefined if any step is missing */
const valueAtPath = (root: unknown, path: string): unknown => {
  let value = root;
  for (const part of path.split('.')) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
};

/** A content-mapped field's value: from structured content (path or field id), else the text */
const contentValue = (
  field: PostField,
  target: NostrTarget,
  parsedContent: Record<string, unknown> | undefined,
  text: string
): unknown => {
  if (!parsedContent) return text;
  return target.path ? valueAtPath(parsedContent, target.path) : parsedContent[field.id];
};

/** A tag-mapped field's value: the plugin's resolveFromTags, else one value or all of them */
const tagValue = (field: PostField, tagName: string, tags: string[][]): unknown => {
  const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
  // Plugins that aggregate multiple tags (e.g. venue: g + i + location)
  if (plugin?.resolveFromTags) return plugin.resolveFromTags(tags, field) ?? undefined;
  const values = tags.filter((t) => t[0] === tagName && t[1]).map((t) => t[1] as string);
  if (values.length > 1) return values;
  const [raw] = values;
  if (raw === undefined) return undefined;
  return plugin?.deserializeValue ? plugin.deserializeValue(raw, field) : raw;
};

/**
 * Extract current field values from a Nostr event for use as composer prefill.
 * Iterates over manifest fields and reads values from event content / tags
 * according to each field's mapTo configuration.
 */
export function extractPrefillFromEvent(
  event: DisplayableEvent,
  manifest: NostrPostManifest
): Record<string, unknown> {
  const parsedContent = parseStructuredContent(event);
  // Plain-text posts: role lines (`Tasted at: nostr:naddr1…`) are their fields' values, not text
  const roles = readPostRoles(event, manifest.fields);
  const prefill: Record<string, unknown> = { ...roles.values };

  for (const field of getFieldsByKind(manifest, event.kind, [event.kind])) {
    if (field.id in roles.values) continue;
    const target = [field.mapTo].flat().find((t) => t.kind === event.kind);
    let value: unknown;
    if (target?.target === 'content') {
      value = contentValue(field, target, parsedContent, roles.text);
    } else if (target?.target === 'tag' && target.tagName) {
      value = tagValue(field, target.tagName, roles.tags);
    }
    if (value !== undefined) prefill[field.id] = value;
  }

  return prefill;
}
