import { parse, renderDjot } from '@djot/djot';
import { fieldOptionLabel, matchFieldOption } from '@nostr-post/core/enumOptions';
import { withExternalIdKinds } from '@nostr-post/core/nip73';
import { manifestLabelTags } from '@nostr-post/core/nip78';
import type {
  NostrPostManifest,
  NostrTarget,
  PostField,
  UnsignedNostrEvent,
} from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { escapeInline } from './djotText';
import { interpolateTemplate } from './identity';
import {
  type AstDoc,
  buildDjotTable,
  extractTableFromAst,
  serializeForTable,
} from './infoboxTable';
import { normalizeDTag } from './normalizeDTag';
import type { WikiEvent } from './resolver';
import {
  claimedDTags,
  entityRefs,
  isRoleField,
  refsFromLinks,
  roleFieldValue,
  roleRowText,
  type WikiLink,
  withoutClaimed,
} from './roleRefs';
import type { WikiManifest } from './types';
import { leadFields, leadLabels, wikiLead, withoutLead } from './wikiLead';

export const WIKI_KIND = 30818;

export const DEFAULT_WIKI_RELAYS = [
  'wss://relay.wikifreedia.xyz',
  'wss://nos.lol',
  'wss://relay.damus.io',
];

/**
 * Generic wiki manifest: just the article text. Used to show any wiki entity
 * when its own manifest isn't known (the wiki counterpart of core's
 * STANDARD_KIND1_POST_MANIFEST); <nostr-wiki-view> falls back to it.
 */
export const STANDARD_WIKI_MANIFEST: NostrPostManifest = {
  id: 'standard-wiki-v1',
  version: '1.0.0',
  // Plain articles: no manifest tags on them
  linkManifest: false,
  fields: [
    {
      id: 'content',
      type: 'string',
      uiPlugin: 'markdown',
      mapTo: { kind: WIKI_KIND, target: 'content' },
    },
  ],
};

function getTag(tags: string[][], name: string): string | undefined {
  return tags.find((t) => t[0] === name)?.[1];
}

function getAllTagValues(tags: string[][], name: string): string[] {
  return tags.filter((t) => t[0] === name && t[1]).map((t) => t[1]);
}

function castValue(raw: string, field: PostField): unknown {
  switch (field.type) {
    case 'number': {
      const n = Number(raw);
      return Number.isNaN(n) ? undefined : n;
    }
    case 'boolean':
      return raw === 'true';
    case 'enum':
      return matchFieldOption(field, raw)?.value ?? raw;
    default:
      return raw;
  }
}

export interface WikiEventConfig {
  dTag?: string;
  /** Title tag to use instead of the one from wikiConfig.titleTemplate */
  title?: string;
  pubkey?: string;
  createdAt?: number;
  /** The published manifest's address (`30078:<pubkey>:nostr-post:<id>`), linked with an `a` tag */
  manifestRef?: string;
}

type Tag = [string, ...string[]];

/** Mutable accumulator shared by the per-target serializers below. */
interface WikiEventParts {
  tags: Tag[];
  tableRows: Array<[string, string]>;
  proseChunks: string[];
  dTag?: string;
  generatedTitle?: string;
}

const isPresent = (v: unknown): boolean => v !== undefined && v !== null;

const fieldTargets = (field: PostField): NostrTarget[] =>
  Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];

/**
 * Applies `wikiConfig` templates. Precedence for the d-tag:
 * explicit config.dTag > dTagTemplate > titleTemplate-derived.
 */
function applyIdentityTemplates(
  parts: WikiEventParts,
  wikiConfig: WikiManifest['wikiConfig'],
  formData: Record<string, unknown>,
  titleOverride?: string
): void {
  if (titleOverride || wikiConfig?.titleTemplate) {
    const title = titleOverride || interpolateTemplate(wikiConfig?.titleTemplate ?? '', formData);
    if (title) {
      parts.generatedTitle = title;
      parts.tags.push(['title', title]);
    }
  }
  if (!parts.dTag && wikiConfig?.dTagTemplate) {
    const interpolated = interpolateTemplate(wikiConfig.dTagTemplate, formData);
    if (interpolated) parts.dTag = normalizeDTag(interpolated);
  }
  if (!parts.dTag && parts.generatedTitle) parts.dTag = normalizeDTag(parts.generatedTitle);
}

/** Nostr event tag only — relay-filterable (t, a, i, title, d). */
function addTagTarget(
  parts: WikiEventParts,
  field: PostField,
  value: unknown,
  tagName: string
): void {
  // The title template is the sole source of the title tag when present.
  if (tagName === 'title' && parts.generatedTitle !== undefined) return;
  const plugin = pluginRegistry.get(field.uiPlugin);
  const serialize = (v: unknown): string => {
    if (plugin?.serializeValue) return plugin.serializeValue(v, field);
    // A referenced entity without its plugin loaded: its address
    const [ref] = field.type === 'ref' ? entityRefs(v) : [];
    return ref ? buildWikiATag(ref.resolvedPubkey, ref.dTag) : serializeForTable(v);
  };

  const items = Array.isArray(value) ? value.filter(isPresent) : [value];
  for (const item of items) {
    const str = serialize(item);
    if (!str) continue;
    parts.tags.push([tagName, str]);
    if (tagName === 'title' && !Array.isArray(value) && !parts.dTag) {
      parts.dTag = normalizeDTag(str);
    }
  }
}

/**
 * Djot table row only — structured wiki data, not relay-filtered.
 * Keyed by field.id (stable) so round-tripping survives label renames.
 */
function addTableTarget(parts: WikiEventParts, field: PostField, value: unknown): void {
  // References: one row of wikilinks (see roleRefs)
  if (field.type === 'ref' || isRoleField(field)) {
    const row = roleRowText(value);
    if (row) parts.tableRows.push([field.id, row]);
    return;
  }
  const items = Array.isArray(value) ? value.filter(isPresent) : [value];
  // Enum rows show the option's label; reading matches it back to the value.
  const text = (item: unknown): string =>
    escapeInline(
      field.type === 'enum' && typeof item === 'string'
        ? fieldOptionLabel(field, item)
        : serializeForTable(item)
    );
  for (const item of items) parts.tableRows.push([field.id, text(item)]);
}

function addField(parts: WikiEventParts, field: PostField, value: unknown): void {
  let hasTagTarget = false;
  for (const target of fieldTargets(field)) {
    if (target.kind !== WIKI_KIND) continue;
    if (target.target === 'content') {
      parts.proseChunks.push(typeof value === 'string' ? value : String(value));
    } else if (target.target === 'tag' && target.tagName) {
      hasTagTarget = true;
      addTagTarget(parts, field, value, target.tagName);
    } else if (target.target === 'table') {
      addTableTarget(parts, field, value);
    }
  }
  // Supplemental plugin tags (e.g. `i` tags from wiki-entity-picker), once per field.
  const plugin = hasTagTarget ? pluginRegistry.get(field.uiPlugin) : undefined;
  if (plugin?.extraTags) parts.tags.push(...plugin.extraTags(value, field));
}

/** Tags without exact duplicates, e.g. one brewery referenced in two roles */
const uniqueTags = (tags: Tag[]): Tag[] =>
  tags.filter((t, i) => tags.findIndex((o) => o.join('\u0000') === t.join('\u0000')) === i);

/** Which manifest made the page, like posts: its label, and an `a` tag when it's published */
const manifestTags = (manifest: NostrPostManifest, config: WikiEventConfig): Tag[] => {
  if (manifest.linkManifest === false) return [];
  const label = manifestLabelTags(manifest.id) as Tag[];
  return config.manifestRef ? [...label, ['a', config.manifestRef]] : label;
};

export function manifestToWikiEvent(
  manifest: NostrPostManifest | WikiManifest,
  formData: Record<string, unknown>,
  config: WikiEventConfig = {}
): UnsignedNostrEvent {
  const parts: WikiEventParts = { tags: [], tableRows: [], proseChunks: [], dTag: config.dTag };
  applyIdentityTemplates(parts, (manifest as WikiManifest).wikiConfig, formData, config.title);

  for (const field of manifest.fields) {
    const value = formData[field.id];
    if (isPresent(value)) addField(parts, field, value);
  }

  const dTag = parts.dTag || normalizeDTag(manifest.id);
  const tablePart = buildDjotTable(parts.tableRows);
  const prosePart = parts.proseChunks.join('\n\n').trim();

  return {
    kind: WIKI_KIND,
    created_at: config.createdAt ?? Math.floor(Date.now() / 1000),
    // NIP-73: a `k` tag per kind of the page's `i` tags
    tags: withExternalIdKinds([
      ['d', dTag],
      ...uniqueTags([...parts.tags.filter((t) => t[0] !== 'd'), ...manifestTags(manifest, config)]),
    ]),
    content: [wikiLead(manifest, formData), tablePart, prosePart].filter(Boolean).join('\n\n'),
    pubkey: config.pubkey ?? '',
  };
}

/**
 * Casts raw string values to the field's type: a single value becomes a
 * scalar, several stay an array (cast element-wise for `castArrayTypes`).
 */
function castValues(
  values: string[],
  field: PostField,
  castArrayTypes: ReadonlyArray<PostField['type']>
): unknown {
  if (values.length === 1) return castValue(values[0], field);
  if (!castArrayTypes.includes(field.type)) return values;
  return values.map((v) => castValue(v, field)).filter(isPresent);
}

function readTagTarget(event: WikiEvent, field: PostField, tagName: string): unknown {
  const plugin = pluginRegistry.get(field.uiPlugin);
  const resolved = plugin?.resolveFromTags?.(event.tags, field); // All tags; undefined: the default
  if (resolved !== undefined) return resolved;

  const tagValues = getAllTagValues(event.tags, tagName);
  if (tagValues.length === 0) return undefined;
  // Use deserializeValue for single-value fields when available
  if (plugin?.deserializeValue && tagValues.length === 1) {
    const deserialized = plugin.deserializeValue(tagValues[0], field);
    if (deserialized !== undefined) return deserialized;
  }
  return castValues(tagValues, field, ['number']);
}

function readTableTarget(tableByKey: Map<string, string[]>, field: PostField): unknown {
  const label = (field.metadata?.label as string | undefined) ?? field.id;
  const tableVals = tableByKey.get(field.id) ?? tableByKey.get(label);
  if (!tableVals || tableVals.length === 0) return undefined;
  return castValues(tableVals, field, ['number', 'boolean']);
}

/**
 * Splits content into the infobox table and prose. The first table counts as
 * the infobox if it has a row for one of `tableKeys` (manifest table field
 * ids/labels), also after text (a page another client wrote, or a lead not
 * recognised); otherwise, e.g. in articles not written with this manifest,
 * the whole content is prose.
 */
function parseWikiContent(
  content: string,
  tableKeys: Set<string>
): {
  tableByKey: Map<string, string[]>;
  linksByKey: Map<string, WikiLink[]>;
  prose: string;
} {
  const ast = parse(content) as unknown as AstDoc;
  const extracted = extractTableFromAst(ast);
  const isInfobox = extracted.tableIndex >= 0 && extracted.rows.some(([key]) => tableKeys.has(key));
  // Without an infobox the content is all prose: keep it verbatim. Re-rendering
  // the AST escapes markup like [[wikilinks]], which editing would then publish.
  if (!isInfobox) return { tableByKey: new Map(), linksByKey: new Map(), prose: content.trim() };
  const { rows, tableIndex } = extracted;

  const tableByKey = new Map<string, string[]>();
  const linksByKey = new Map<string, WikiLink[]>();
  for (const [key, value, links] of rows) {
    const existing = tableByKey.get(key);
    if (existing) existing.push(value);
    else tableByKey.set(key, [value]);
    linksByKey.set(key, [...(linksByKey.get(key) ?? []), ...links]);
  }

  const proseChildren = ast.children.filter((_, index) => index !== tableIndex);
  const prose =
    proseChildren.length > 0 ? renderDjot({ ...ast, children: proseChildren } as never).trim() : '';
  return { tableByKey, linksByKey, prose };
}

interface WikiReadContext {
  event: WikiEvent;
  tableByKey: Map<string, string[]>;
  prose: string;
  /** Only the first content-mapped field receives the prose. */
  proseFieldId?: string;
}

function readTarget(ctx: WikiReadContext, field: PostField, target: NostrTarget): unknown {
  if (target.target === 'content') {
    return field.id === ctx.proseFieldId ? ctx.prose : undefined;
  }
  if (target.target === 'tag' && target.tagName) {
    return readTagTarget(ctx.event, field, target.tagName);
  }
  if (target.target === 'table') return readTableTarget(ctx.tableByKey, field);
  return undefined;
}

const wikiTargets = (field: PostField): NostrTarget[] =>
  fieldTargets(field).filter((t) => t.kind === WIKI_KIND);

/** Infobox row keys the manifest reads: its table fields' ids and labels */
const manifestTableKeys = (manifest: NostrPostManifest): Set<string> =>
  new Set(
    manifest.fields
      .filter((f) => wikiTargets(f).some((t) => t.target === 'table'))
      .flatMap((f) => [f.id, (f.metadata?.label as string | undefined) ?? f.id])
  );

/** The content without its lead (`wikiConfig.lead`), built again from the event's tags */
function contentWithoutLead(event: WikiEvent, manifest: NostrPostManifest): string {
  const ctx: WikiReadContext = { event, tableByKey: new Map(), prose: '' };
  const data = Object.fromEntries(leadFields(manifest).map((f) => [f.id, readField(ctx, f)]));
  return withoutLead(event.content, wikiLead(manifest, data), leadLabels(manifest));
}

/**
 * Infobox rows no field of `manifest` reads, e.g. fields added in a newer
 * manifest version, so a view can still show all of an entity's data.
 */
export function unmappedTableRows(
  event: WikiEvent,
  manifest: NostrPostManifest
): Array<[string, string]> {
  const tableKeys = manifestTableKeys(manifest);
  const { tableByKey } = parseWikiContent(contentWithoutLead(event, manifest), tableKeys);
  return [...tableByKey].flatMap(([key, values]) =>
    tableKeys.has(key) ? [] : values.map((value): [string, string] => [key, value])
  );
}

/** A field's value from its targets; a later target's value wins */
function readField(ctx: WikiReadContext, field: PostField): unknown {
  let value: unknown;
  for (const target of wikiTargets(field)) {
    value = readTarget(ctx, field, target) ?? value;
  }
  return value;
}

export function wikiEventToManifestData(
  event: WikiEvent,
  manifest: NostrPostManifest
): Record<string, unknown> {
  const { tableByKey, linksByKey, prose } = parseWikiContent(
    contentWithoutLead(event, manifest),
    manifestTableKeys(manifest)
  );
  const proseFieldId = prose
    ? manifest.fields.find((f) => wikiTargets(f).some((t) => t.target === 'content'))?.id
    : undefined;
  const ctx: WikiReadContext = { event, tableByKey, prose, proseFieldId };

  // Role fields read their wikilinks; every other field (e.g. a venue's link) skips the `a` tags those claim
  const roleLinks = (f: PostField) => linksByKey.get(f.id) ?? [];
  const roleFields = manifest.fields.filter(isRoleField);
  const claimed = claimedDTags(roleFields.map(roleLinks));
  const refCtx = { ...ctx, event: { ...event, tags: withoutClaimed(event.tags, claimed) } };

  const result: Record<string, unknown> = {};
  for (const field of manifest.fields) {
    // The first role field without a row: an entity written before roles (plain `a` tags)
    const legacy = field === roleFields[0] && roleLinks(field).length === 0;
    const value =
      isRoleField(field) && !legacy
        ? roleFieldValue(field, refsFromLinks(roleLinks(field), event.tags))
        : readField(refCtx, field);
    if (value !== undefined) result[field.id] = value;
  }

  const dTag = getTag(event.tags, 'd');
  if (dTag) result.__dTag = dTag;
  return result;
}

/** The wikilink targets in an entity's infobox row (e.g. a role row: the beers' `brewed_at`) */
export function infoboxRowLinks(content: string, key: string): string[] {
  const { rows } = extractTableFromAst(parse(content) as unknown as AstDoc);
  return rows.filter(([k]) => k === key).flatMap(([, , links]) => links.map((l) => l.target));
}

export function buildWikiATag(pubkey: string, dTag: string): string {
  return `${WIKI_KIND}:${pubkey}:${dTag}`;
}

export function extractExternalIds(event: WikiEvent): string[] {
  return getAllTagValues(event.tags, 'i');
}
