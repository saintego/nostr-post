import { parse, renderDjot } from '@djot/djot';
import type {
  NostrPostManifest,
  NostrTarget,
  PostField,
  UnsignedNostrEvent,
} from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { interpolateTemplate } from './identity';
import { normalizeDTag } from './normalizeDTag';
import type { WikiEvent } from './resolver';
import type { WikiManifest } from './types';

export const WIKI_KIND = 30818;

export const DEFAULT_WIKI_RELAYS = [
  'wss://relay.wikifreedia.xyz',
  'wss://nos.lol',
  'wss://relay.damus.io',
];

type AstNode = { tag: string; [key: string]: unknown };
type AstDoc = {
  tag: 'doc';
  children: AstNode[];
  references: Record<string, unknown>;
  footnotes: Record<string, unknown>;
};

function extractNodeText(node: AstNode): string {
  if (node.tag === 'str' && typeof node.text === 'string') return node.text;
  if (node.tag === 'soft_break') return ' ';
  const children = node.children as AstNode[] | undefined;
  if (!Array.isArray(children)) return '';
  return children.map(extractNodeText).join('');
}

function extractTableFromAst(ast: AstDoc): { rows: Array<[string, string]>; tableIndex: number } {
  const tableIndex = ast.children.findIndex((n) => n.tag === 'table');
  if (tableIndex === -1) return { rows: [], tableIndex: -1 };
  const table = ast.children[tableIndex] as AstNode & { children: AstNode[] };
  const rows: Array<[string, string]> = [];
  for (const row of table.children) {
    if ((row as AstNode & { head?: boolean }).head) continue;
    const cells = (row as AstNode & { children: AstNode[] }).children;
    if (!cells || cells.length < 2) continue;
    const key = extractNodeText(cells[0]).trim();
    const value = extractNodeText(cells[1]).trim();
    if (key) rows.push([key, value]);
  }
  return { rows, tableIndex };
}

// Djot table rows are single-line: collapse line breaks and escape the cell delimiter.
const escapeCell = (v: string): string => v.replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|');

function serializeForTable(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  return JSON.stringify(value);
}

function buildDjotTable(rows: Array<[string, string]>): string {
  if (rows.length === 0) return '';
  const escaped = rows.map(([k, v]): [string, string] => [escapeCell(k), escapeCell(v)]);
  const col1 = Math.max(5, ...escaped.map(([k]) => k.length));
  const col2 = Math.max(5, ...escaped.map(([, v]) => v.length));
  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = `| ${'-'.repeat(col1)} | ${'-'.repeat(col2)} |`;
  const header = `| ${pad('Field', col1)} | ${pad('Value', col2)} |`;
  const dataRows = escaped.map(([k, v]) => `| ${pad(k, col1)} | ${pad(v, col2)} |`);
  return [header, sep, ...dataRows].join('\n');
}

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
    default:
      return raw;
  }
}

export interface WikiEventConfig {
  dTag?: string;
  pubkey?: string;
  createdAt?: number;
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
  formData: Record<string, unknown>
): void {
  if (wikiConfig?.titleTemplate) {
    const title = interpolateTemplate(wikiConfig.titleTemplate, formData);
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
  const serialize = (v: unknown): string =>
    plugin?.serializeValue ? plugin.serializeValue(v, field) : serializeForTable(v);

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
  const items = Array.isArray(value) ? value.filter(isPresent) : [value];
  for (const item of items) parts.tableRows.push([field.id, serializeForTable(item)]);
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

export function manifestToWikiEvent(
  manifest: NostrPostManifest | WikiManifest,
  formData: Record<string, unknown>,
  config: WikiEventConfig = {}
): UnsignedNostrEvent {
  const parts: WikiEventParts = { tags: [], tableRows: [], proseChunks: [], dTag: config.dTag };
  applyIdentityTemplates(parts, (manifest as WikiManifest).wikiConfig, formData);

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
    tags: [['d', dTag], ...parts.tags.filter((t) => t[0] !== 'd')],
    content: [tablePart, prosePart].filter(Boolean).join('\n\n'),
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
  // Prefer resolveFromTags (has access to full tag array, e.g. for i-tags)
  if (plugin?.resolveFromTags) return plugin.resolveFromTags(event.tags, field);

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
 * Splits content into the infobox table and prose. A table counts as the
 * infobox only if it is the first block and has a row for one of `tableKeys`
 * (manifest table field ids/labels); otherwise, e.g. in articles not written
 * with this manifest, the whole content is prose.
 */
function parseWikiContent(
  content: string,
  tableKeys: Set<string>
): {
  tableByKey: Map<string, string[]>;
  prose: string;
} {
  const ast = parse(content) as unknown as AstDoc;
  const extracted = extractTableFromAst(ast);
  const isInfobox =
    extracted.tableIndex === 0 && extracted.rows.some(([key]) => tableKeys.has(key));
  // Without an infobox the content is all prose: keep it verbatim. Re-rendering
  // the AST escapes markup like [[wikilinks]], which editing would then publish.
  if (!isInfobox) return { tableByKey: new Map(), prose: content.trim() };
  const { rows, tableIndex } = extracted;

  const tableByKey = new Map<string, string[]>();
  for (const [key, value] of rows) {
    const existing = tableByKey.get(key);
    if (existing) existing.push(value);
    else tableByKey.set(key, [value]);
  }

  const proseChildren = tableIndex === -1 ? ast.children : ast.children.slice(tableIndex + 1);
  const prose =
    proseChildren.length > 0 ? renderDjot({ ...ast, children: proseChildren } as never).trim() : '';
  return { tableByKey, prose };
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

export function wikiEventToManifestData(
  event: WikiEvent,
  manifest: NostrPostManifest
): Record<string, unknown> {
  const tableKeys = new Set(
    manifest.fields
      .filter((f) => wikiTargets(f).some((t) => t.target === 'table'))
      .flatMap((f) => [f.id, (f.metadata?.label as string | undefined) ?? f.id])
  );
  const { tableByKey, prose } = parseWikiContent(event.content, tableKeys);
  const proseFieldId = prose
    ? manifest.fields.find((f) => wikiTargets(f).some((t) => t.target === 'content'))?.id
    : undefined;
  const ctx: WikiReadContext = { event, tableByKey, prose, proseFieldId };

  const result: Record<string, unknown> = {};
  for (const field of manifest.fields) {
    for (const target of wikiTargets(field)) {
      const value = readTarget(ctx, field, target);
      if (value !== undefined) result[field.id] = value;
    }
  }

  const dTag = getTag(event.tags, 'd');
  if (dTag) result.__dTag = dTag;
  return result;
}

export function buildWikiATag(pubkey: string, dTag: string): string {
  return `${WIKI_KIND}:${pubkey}:${dTag}`;
}

export function extractExternalIds(event: WikiEvent): string[] {
  return getAllTagValues(event.tags, 'i');
}
