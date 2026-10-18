/**
 * @nostr-post/core - Manifest inheritance (`extends`)
 *
 * Merges a child manifest onto its parent. Pure functions over immutable data.
 */

import type { ManifestList, NostrPostManifest, PostField, PublishFormat } from './types';

/** Parent items in order with child items of the same id merged in, then child-only items */
const mergeById = <T extends { id: string }>(
  parentItems: readonly T[],
  childItems: readonly T[],
  merge: (parentItem: T, childItem: T) => T
): T[] => {
  const childById = new Map(childItems.map((item) => [item.id, item]));
  const parentIds = new Set(parentItems.map((item) => item.id));
  return [
    ...parentItems.map((item) => {
      const childItem = childById.get(item.id);
      return childItem ? merge(item, childItem) : item;
    }),
    ...childItems.filter((item) => !parentIds.has(item.id)),
  ];
};

/** A child field over a parent field, with `metadata` shallow-merged */
const mergeField = (parentField: PostField, childField: PostField): PostField => ({
  ...parentField,
  ...childField,
  metadata:
    parentField.metadata || childField.metadata
      ? { ...parentField.metadata, ...childField.metadata }
      : undefined,
});

/** A config entry like a related section or link: merged by `id`, else by `label` */
type Labelled = { label: string; id?: string };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLabelledList = (value: unknown): value is Labelled[] =>
  Array.isArray(value) &&
  value.every((item) => isPlainObject(item) && typeof item.label === 'string');

/** An entry's merge key: its `id` (stable across translations of the label), else its `label` */
const entryKey = (item: Labelled): string => (typeof item.id === 'string' ? item.id : item.label);

/** Parent entries in order, a child entry with the same key replacing its parent's, then the child's new ones */
const mergeByKey = (parentItems: Labelled[], childItems: Labelled[]): Labelled[] => {
  const childByKey = new Map(childItems.map((item) => [entryKey(item), item]));
  const parentKeys = new Set(parentItems.map(entryKey));
  return [
    ...parentItems.map((item) => childByKey.get(entryKey(item)) ?? item),
    ...childItems.filter((item) => !parentKeys.has(entryKey(item))),
  ];
};

/** A config object (e.g. `wikiConfig`) of a child over its parent's, per key */
const mergeConfig = (
  parentConfig: Record<string, unknown>,
  childConfig: Record<string, unknown>
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...parentConfig, ...childConfig };
  for (const [key, parentValue] of Object.entries(parentConfig)) {
    const childValue = childConfig[key];
    if (isLabelledList(parentValue) && isLabelledList(childValue)) {
      merged[key] = mergeByKey(parentValue, childValue);
    }
  }
  return merged;
};

/** Keys other than the ones resolveManifest merges itself whose values are objects in both */
const mergeConfigKeys = (
  parent: Record<string, unknown>,
  child: Record<string, unknown>
): Record<string, unknown> => {
  const handled = new Set(['fields', 'publishFormats', 'metadata', 'extends']);
  const merged: Record<string, unknown> = {};
  for (const [key, parentValue] of Object.entries(parent)) {
    const childValue = child[key];
    if (!handled.has(key) && isPlainObject(parentValue) && isPlainObject(childValue)) {
      merged[key] = mergeConfig(parentValue, childValue);
    }
  }
  return merged;
};

/**
 * Resolves manifest inheritance by merging a child manifest onto a parent.
 *
 * Merge rules:
 * - Child `id` and `version` are always preserved.
 * - `fields`: parent fields form the base; child fields with matching `id` override
 *   (field-level `metadata` is shallow-merged so the child can patch individual keys
 *   without repeating the rest). Child-only fields are appended after parent fields.
 * - `publishFormats` and `lists`: same override-then-append strategy as fields.
 * - `metadata`: shallow-merged (`{ ...parent.metadata, ...child.metadata }`).
 * - `linkManifest`: child's value takes priority; falls back to parent's.
 * - Other keys whose values are objects in both (e.g. `wikiConfig`) are merged per key:
 *   lists of labelled entries (`[{ id?, label, … }]`, e.g. `wikiConfig.related`) keep the
 *   parent's entries in order, a child entry with the same `id` (else `label`) replacing
 *   its parent's, then the child's new ones; any other value is the child's. With ids, a
 *   child can translate labels (`{ id: 'reviews', label: 'Recenze' }`).
 * - `extends` is not forwarded to the resolved manifest.
 *
 * The caller is responsible for fetching the parent manifest referenced by
 * `child.extends` before calling this function.
 */
export const resolveManifest = (
  child: NostrPostManifest,
  parent: NostrPostManifest
): NostrPostManifest => {
  const mergedFields = mergeById(parent.fields, child.fields, mergeField);
  const mergedFormats = mergeById<PublishFormat>(
    parent.publishFormats ?? [],
    child.publishFormats ?? [],
    (parentFormat, childFormat) => ({ ...parentFormat, ...childFormat })
  );
  const mergedLists = mergeById<ManifestList>(parent.lists ?? [], child.lists ?? [], (p, c) => ({
    ...p,
    ...c,
  }));

  // Drop `extends` from both parent and child so it doesn't propagate to the resolved manifest
  const { extends: _parentExtendsRef, ...parentRest } = parent;
  const { extends: _extendsRef, ...childRest } = child;
  void _parentExtendsRef;
  void _extendsRef;

  return {
    ...parentRest,
    ...childRest,
    ...mergeConfigKeys(parentRest, childRest),
    fields: mergedFields,
    publishFormats: mergedFormats.length > 0 ? mergedFormats : undefined,
    lists: mergedLists.length > 0 ? mergedLists : undefined,
    linkManifest: child.linkManifest ?? parent.linkManifest,
    metadata:
      parent.metadata || child.metadata ? { ...parent.metadata, ...child.metadata } : undefined,
  };
};
