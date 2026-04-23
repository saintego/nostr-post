/**
 * @nostr-post/core - Update-comment parsing and event patching
 *
 * Pure functions for parsing `update:{fieldId}:{value}` comment lines and
 * applying them to Nostr events.  No Lit or plugin-registry dependencies.
 */

import { isStructuredContentKind } from './manifestMappings';
import { getFieldsByKind } from './manifestMappings';
import type { DisplayableEvent, NostrPostManifest, PostField } from './types';

export const UPDATE_COMMENT_PATTERN = /^update\s*:\s*([^:]+?)\s*:\s*([\s\S]+)$/i;

/** If `s` looks like a JSON object string, parse it; otherwise return `s` as-is. */
export const tryParseJsonObject = (s: string): unknown => {
  if (!s.trimStart().startsWith('{')) return s;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

export const parseUpdateComment = (
  content: string
): { fieldId: string; rawValue: string } | undefined => {
  const match = content.trim().match(UPDATE_COMMENT_PATTERN);
  if (!match) return undefined;
  return { fieldId: match[1].trim(), rawValue: match[2].trim() };
};

/** Returns true if every non-empty line in the content is an update-comment line. */
export function isUpdateComment(content: string): boolean {
  const lines = content.split('\n').filter((l) => l.trim());
  return lines.length > 0 && lines.every((l) => UPDATE_COMMENT_PATTERN.test(l.trim()));
}

const parseBoolean = (rawValue: string): boolean | undefined => {
  const normalized = rawValue.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const parseFieldValue = (
  field: PostField,
  rawValue: string,
  existingTagCount: number
): string | number | boolean | string[] | undefined => {
  switch (field.type) {
    case 'number': {
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    case 'boolean':
      return parseBoolean(rawValue);
    case 'enum':
      return field.options?.includes(rawValue) ? rawValue : undefined;
    case 'string': {
      if (field.uiPlugin === 'hashtag' || field.uiPlugin === 'media' || existingTagCount > 1) {
        return rawValue
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
      }
      return rawValue;
    }
    case 'geo':
    case 'ref':
      return rawValue;
  }
};

const serializeTagValue = (value: string | number | boolean): string => String(value);

const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.');
  let current = obj;
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
};

const applyContentUpdate = (
  event: DisplayableEvent,
  field: PostField,
  value: string | number | boolean | string[]
): DisplayableEvent => {
  if (!isStructuredContentKind(event.kind)) {
    const contentValue = Array.isArray(value) ? value.join('\n') : String(value);
    return { ...event, content: contentValue };
  }

  let structuredContent: Record<string, unknown> = {};
  if (event.content.trim()) {
    try {
      structuredContent = JSON.parse(event.content) as Record<string, unknown>;
    } catch {
      structuredContent = {};
    }
  }

  if (!Array.isArray(field.mapTo) && field.mapTo.path) {
    setNestedValue(structuredContent, field.mapTo.path, value);
  } else {
    structuredContent[field.id] = value;
  }

  return { ...event, content: JSON.stringify(structuredContent) };
};

const applyTagUpdate = (
  event: DisplayableEvent,
  field: PostField,
  value: string | number | boolean | string[]
): DisplayableEvent => {
  const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
  const target = targets.find(
    (candidate) => candidate.kind === event.kind && candidate.target === 'tag'
  );
  if (!target?.tagName) return event;

  const filteredTags = event.tags.filter((tag) => tag[0] !== target.tagName);
  const nextValues = Array.isArray(value) ? value : [value];
  const nextTags = nextValues.map(
    (item) => [target.tagName as string, serializeTagValue(item)] as [string, string]
  );

  return { ...event, tags: [...filteredTags, ...nextTags] };
};

const getTagTarget = (field: PostField, eventKind: number) => {
  const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
  return targets.find((candidate) => candidate.kind === eventKind && candidate.target === 'tag');
};

const countExistingTagsForField = (event: DisplayableEvent, field: PostField): number =>
  event.tags.filter((tag) => {
    const target = getTagTarget(field, event.kind);
    return target?.tagName === tag[0];
  }).length;

const resolveTarget = (field: PostField, eventKind: number) => {
  const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
  return targets.find((candidate) => candidate.kind === eventKind);
};

const applySingleUpdateComment = (
  event: DisplayableEvent,
  fieldsById: Map<string, PostField>,
  interactionEvent: DisplayableEvent
): DisplayableEvent => {
  if (interactionEvent.kind !== 1) return event;

  const lines = interactionEvent.content.split('\n');
  let current = event;

  for (const line of lines) {
    const update = parseUpdateComment(line);
    if (!update) continue;

    const field = fieldsById.get(update.fieldId);
    if (!field) continue;

    const existingTagCount = countExistingTagsForField(current, field);
    const parsedValue = parseFieldValue(field, update.rawValue, existingTagCount);
    if (parsedValue === undefined) continue;

    const target = resolveTarget(field, current.kind);
    if (!target) continue;

    current =
      target.target === 'content'
        ? applyContentUpdate(current, field, parsedValue)
        : applyTagUpdate(current, field, parsedValue);
  }

  return current;
};

export const applyUpdateCommentsToEvent = (
  event: DisplayableEvent,
  manifest: NostrPostManifest | undefined,
  interactionEvents: DisplayableEvent[] | undefined
): DisplayableEvent => {
  if (!manifest || !interactionEvents || interactionEvents.length === 0) return event;

  const fieldsById = new Map(
    getFieldsByKind(manifest, event.kind, [event.kind]).map((field) => [field.id, field])
  );
  if (fieldsById.size === 0) return event;

  // Only trust update-comment events authored by the same pubkey as the original.
  // This prevents third parties from injecting `update:...` lines that alter rendering.
  const trustedUpdates = interactionEvents.filter(
    (ie) => ie.pubkey === event.pubkey && isUpdateComment(ie.content)
  );

  const sorted = [...trustedUpdates].sort((a, b) => a.created_at - b.created_at);

  return sorted.reduce(
    (current, interaction) => applySingleUpdateComment(current, fieldsById, interaction),
    event
  );
};
