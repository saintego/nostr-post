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
  isUpdateComment,
  parseUpdateComment,
  tryParseJsonObject,
  UPDATE_COMMENT_PATTERN,
} from '@nostr-post/core/eventUpdates';

import { parseUpdateComment, tryParseJsonObject } from '@nostr-post/core/eventUpdates';
import { getFieldsByKind, isStructuredContentKind } from '@nostr-post/core/manifestMappings';
import type { DisplayableEvent, NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

/**
 * Render the collapsible update-comments section shown beneath an event.
 * Returns nothing when there are no kind-1 update comments to show.
 */
export const renderUpdateComments = (
  interactionEvents: DisplayableEvent[] | undefined
): TemplateResult | typeof nothing => {
  if (!interactionEvents || interactionEvents.length === 0) return nothing;

  // Each interaction event may contain multiple update lines (one per field)
  const updates: { fieldId: string; rawValue: string }[] = [];
  for (const e of interactionEvents) {
    if (e.kind !== 1) continue;
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

/**
 * Extract current field values from a Nostr event for use as composer prefill.
 * Iterates over manifest fields and reads values from event content / tags
 * according to each field's mapTo configuration.
 */
export function extractPrefillFromEvent(
  event: DisplayableEvent,
  manifest: NostrPostManifest
): Record<string, unknown> {
  const prefill: Record<string, unknown> = {};

  // For structured content kinds (30078/30079), content is a JSON object keyed by field id
  let parsedContent: Record<string, unknown> | undefined;
  if (isStructuredContentKind(event.kind) && event.content) {
    try {
      parsedContent = JSON.parse(event.content) as Record<string, unknown>;
    } catch {
      // not valid JSON – treat as plain text
    }
  }

  for (const field of getFieldsByKind(manifest, event.kind, [event.kind])) {
    const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
    const target = targets.find((t) => t.kind === event.kind);
    if (!target) continue;

    if (target.target === 'content') {
      if (parsedContent) {
        // Structured content: extract via dot-path or field.id key
        if (target.path) {
          const parts = target.path.split('.');
          let val: unknown = parsedContent;
          for (const part of parts) {
            if (!val || typeof val !== 'object') {
              val = undefined;
              break;
            }
            val = (val as Record<string, unknown>)[part];
          }
          if (val !== undefined) prefill[field.id] = val;
        } else {
          const val = parsedContent[field.id];
          if (val !== undefined) prefill[field.id] = val;
        }
      } else {
        prefill[field.id] = event.content;
      }
    } else if (target.target === 'tag' && target.tagName) {
      const plugin = field.uiPlugin ? pluginRegistry.get(field.uiPlugin) : undefined;
      // Use resolveFromTags for plugins that aggregate multiple tags (e.g. venue: g + i + location)
      if (plugin?.resolveFromTags) {
        const resolved = plugin.resolveFromTags(event.tags, field);
        if (resolved !== undefined && resolved !== null) {
          prefill[field.id] = resolved;
        }
        continue;
      }
      const tagValues = event.tags
        .filter((t) => t[0] === target.tagName)
        .map((t) => t[1])
        .filter(Boolean);
      if (tagValues.length === 1) {
        const raw = tagValues[0];
        prefill[field.id] = plugin?.deserializeValue ? plugin.deserializeValue(raw, field) : raw;
      } else if (tagValues.length > 1) {
        prefill[field.id] = tagValues;
      }
    }
  }

  return prefill;
}
