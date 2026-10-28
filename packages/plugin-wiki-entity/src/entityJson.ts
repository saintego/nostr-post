/**
 * @nostr-post/plugin-wiki-entity - Entities in form JSON
 *
 * How a picker field asks for its entities in form JSON (`jsonSchema`): by what tells an entity
 * apart, its name and its links (the entity manifest's fields written as `r` or `i` tags), and its
 * hashtags (`t` tags), e.g. a musician's name, Bandcamp or Instagram profile and genres. Hashtags
 * prefill a new page and qualify its slug when the name is taken. `entityItems` reads them back with the
 * NIP-73 ids (`i` tags) the links give, to look the entities' pages up (`resolveEntities`).
 */

import { parseFormJson } from '@nostr-post/core/formJson';
import { getFieldTargets } from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { formJsonSchema } from '@nostr-post/plugins/formJson';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { nameFieldId } from '@nostr-post/wiki';

/** One entity as form JSON gave it */
export interface EntityItem {
  name: string;
  /** NIP-73 ids of its links (`i` tag values), e.g. canonical profile URLs */
  ids: string[];
  /** The entity's form data: its name, links and hashtags, to create or update its page with */
  prefill: Record<string, unknown>;
}

const isLinkField = (field: PostField): boolean =>
  getFieldTargets(field).some(
    (t) => t.target === 'tag' && (t.tagName === 'r' || t.tagName === 'i')
  );

const isHashtagField = (field: PostField): boolean =>
  getFieldTargets(field).some((t) => t.target === 'tag' && t.tagName === 't');

/** An entity manifest's link fields (written as `r` or `i` tags) */
export const linkFields = (manifest: NostrPostManifest): PostField[] =>
  manifest.fields.filter(isLinkField);

/** The id of an entity manifest's name field: its title template's, else the first required string */
const nameOf = (manifest: NostrPostManifest): string | undefined =>
  nameFieldId(manifest) ?? manifest.fields.find((f) => f.required && f.type === 'string')?.id;

/** The fields that tell an entity of this type apart: its name, links and hashtags */
export const identityFields = (manifest: NostrPostManifest): PostField[] => {
  const nameId = nameOf(manifest);
  return manifest.fields.filter(
    (field) => field.id === nameId || isLinkField(field) || isHashtagField(field)
  );
};

const identityManifest = (manifest: NostrPostManifest): NostrPostManifest => ({
  ...manifest,
  publishFormats: undefined,
  fields: identityFields(manifest),
});

/** The JSON Schema of one entity of this type: its name, links and hashtags, as the type's fields ask */
export const entityJsonSchema = (manifest: NostrPostManifest): Record<string, unknown> =>
  formJsonSchema(identityManifest(manifest));

/** The `i` tag values a field's value gives: its plugin's extra `i` tags, or itself for `i` fields */
const idsOf = (field: PostField, value: unknown): string[] => {
  const fromPlugin = pluginRegistry
    .get(field.uiPlugin)
    ?.extraTags?.(value, field)
    .flatMap((tag) => (tag[0] === 'i' && tag[1] ? [tag[1]] : []));
  if (fromPlugin?.length) return fromPlugin;
  const isIdField = getFieldTargets(field).some((t) => t.target === 'tag' && t.tagName === 'i');
  return isIdField
    ? (Array.isArray(value) ? value : [value]).filter((v) => typeof v === 'string')
    : [];
};

/** One entity given as an object in `entityJsonSchema`'s shape */
const objectItem = (item: unknown, manifest: NostrPostManifest, nameId: string): EntityItem[] => {
  const parsed = parseFormJson(identityManifest(manifest), item);
  if (!parsed.success) return [];
  const prefill = parsed.data.formData;
  const name = prefill[nameId];
  if (typeof name !== 'string' || !name.trim()) return [];
  const ids = identityFields(manifest).flatMap((field) =>
    field.id in prefill ? idsOf(field, prefill[field.id]) : []
  );
  return [{ name: name.trim(), ids: [...new Set(ids)], prefill }];
};

/**
 * The entities in a picker field's form JSON value: objects in `entityJsonSchema`'s shape, or
 * plain names (without an entity manifest)
 */
export const entityItems = (value: unknown, manifest?: NostrPostManifest): EntityItem[] => {
  const nameId = manifest && nameOf(manifest);
  return (Array.isArray(value) ? value : [value]).flatMap((item): EntityItem[] => {
    if (typeof item === 'string') {
      const name = item.trim();
      return name ? [{ name, ids: [], prefill: nameId ? { [nameId]: name } : {} }] : [];
    }
    return manifest && nameId ? objectItem(item, manifest, nameId) : [];
  });
};
