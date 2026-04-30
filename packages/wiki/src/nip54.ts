import { parse, renderDjot } from '@djot/djot';
import type { NostrPostManifest, PostField, UnsignedNostrEvent } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import { interpolateTemplate } from './identity';
import { normalizeDTag } from './normalizeDTag';
import type { WikiEvent } from './resolver';
import type { WikiManifest } from './types';

export const WIKI_KIND = 30818;

export const DEFAULT_WIKI_RELAYS = [
  'wss://relay.wikifreedia.xyz',
  'wss://nos.lol',
  'wss://relay.nostr.band',
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

const escapeCell = (v: string): string => v.replace(/\|/g, '\\|');

function serializeForTable(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  return JSON.stringify(value);
}

function buildDjotTable(rows: Array<[string, string]>): string {
  if (rows.length === 0) return '';
  const col1 = Math.max(5, ...rows.map(([k]) => k.length));
  const col2 = Math.max(5, ...rows.map(([, v]) => v.length));
  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = `| ${'-'.repeat(col1)} | ${'-'.repeat(col2)} |`;
  const header = `| ${pad('Field', col1)} | ${pad('Value', col2)} |`;
  const dataRows = rows.map(
    ([k, v]) => `| ${pad(escapeCell(k), col1)} | ${pad(escapeCell(v), col2)} |`
  );
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

export function manifestToWikiEvent(
  manifest: NostrPostManifest | WikiManifest,
  formData: Record<string, unknown>,
  config: WikiEventConfig = {}
): UnsignedNostrEvent {
  const tags: [string, ...string[]][] = [];
  const tableRows: Array<[string, string]> = [];
  const proseChunks: string[] = [];
  let dTag = config.dTag;

  const wikiConfig = (manifest as WikiManifest).wikiConfig;
  let generatedTitle: string | undefined;

  if (wikiConfig?.titleTemplate) {
    const interpolated = interpolateTemplate(wikiConfig.titleTemplate, formData);
    if (interpolated) {
      generatedTitle = interpolated;
      tags.push(['title', generatedTitle]);
      if (!dTag) dTag = normalizeDTag(generatedTitle);
    }
  }

  if (wikiConfig?.dTagTemplate && !dTag) {
    const interpolated = interpolateTemplate(wikiConfig.dTagTemplate, formData);
    if (interpolated) dTag = normalizeDTag(interpolated);
  } else if (wikiConfig?.titleTemplate && !dTag && generatedTitle) {
    dTag = normalizeDTag(generatedTitle);
  }

  for (const field of manifest.fields) {
    const value = formData[field.id];
    if (value === undefined) continue;
    const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
    for (const target of targets) {
      if (target.kind !== WIKI_KIND) continue;
      if (target.target === 'content') {
        proseChunks.push(typeof value === 'string' ? value : String(value));
        continue;
      }
      if (target.target === 'tag' && target.tagName) {
        // Nostr event tag only — relay-filterable (t, a, i, title, d)
        if (target.tagName === 'title' && generatedTitle !== undefined) continue;
        const plugin = pluginRegistry.get(field.uiPlugin);
        if (Array.isArray(value)) {
          for (const item of value) tags.push([target.tagName, String(item)]);
        } else {
          const str = plugin?.serializeValue
            ? plugin.serializeValue(value, field)
            : serializeForTable(value);
          if (str) {
            tags.push([target.tagName, str]);
            if (target.tagName === 'title' && !dTag) dTag = normalizeDTag(str);
          }
        }
        // Emit supplemental tags from the plugin (e.g. `i` tags from wiki-entity-picker)
        if (plugin?.extraTags) {
          const extra = plugin.extraTags(value, field);
          for (const extraTag of extra) tags.push(extraTag);
        }
        continue;
      }
      if (target.target === 'table') {
        // Djot table row only — structured wiki data, not relay-filtered
        const label = (field.metadata?.label as string | undefined) ?? field.id;
        if (Array.isArray(value)) {
          for (const item of value) tableRows.push([label, String(item)]);
        } else {
          tableRows.push([label, serializeForTable(value)]);
        }
      }
    }
  }

  if (!dTag) dTag = normalizeDTag(manifest.id);
  const filteredTags = tags.filter((t) => t[0] !== 'd');
  const allTags: [string, ...string[]][] = [['d', dTag], ...filteredTags];
  const tablePart = buildDjotTable(tableRows);
  const prosePart = proseChunks.join('\n\n').trim();
  const content = [tablePart, prosePart].filter(Boolean).join('\n\n');

  return {
    kind: WIKI_KIND,
    created_at: config.createdAt ?? Math.floor(Date.now() / 1000),
    tags: allTags,
    content,
    pubkey: config.pubkey ?? '',
  };
}

export function wikiEventToManifestData(
  event: WikiEvent,
  manifest: NostrPostManifest
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const ast = parse(event.content) as unknown as AstDoc;
  const { rows: tableRows, tableIndex } = extractTableFromAst(ast);

  const tableByKey = new Map<string, string[]>();
  for (const [key, value] of tableRows) {
    const existing = tableByKey.get(key) ?? [];
    existing.push(value);
    tableByKey.set(key, existing);
  }

  const proseChildren = tableIndex === -1 ? ast.children : ast.children.slice(tableIndex + 1);
  const proseDoc: AstDoc = { ...ast, children: proseChildren };
  const proseStr = proseChildren.length > 0 ? renderDjot(proseDoc as never).trim() : '';
  let proseFieldAssigned = false;

  for (const field of manifest.fields) {
    const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
    for (const target of targets) {
      if (target.kind !== WIKI_KIND) continue;
      if (target.target === 'content') {
        if (!proseFieldAssigned && proseStr) {
          result[field.id] = proseStr;
          proseFieldAssigned = true;
        }
        continue;
      }
      if (target.target === 'tag' && target.tagName) {
        // Read from Nostr event tags
        const plugin = pluginRegistry.get(field.uiPlugin);
        // Prefer resolveFromTags (has access to full tag array, e.g. for i-tags)
        if (plugin?.resolveFromTags) {
          const resolved = plugin.resolveFromTags(event.tags, field);
          if (resolved !== undefined) result[field.id] = resolved;
          continue;
        }
        const tagValues = getAllTagValues(event.tags, target.tagName);
        if (tagValues.length > 0) {
          // Use deserializeValue for single-value fields when available
          if (plugin?.deserializeValue && tagValues.length === 1) {
            const deserialized = plugin.deserializeValue(tagValues[0], field);
            if (deserialized !== undefined) {
              result[field.id] = deserialized;
              continue;
            }
          }
          result[field.id] =
            tagValues.length === 1
              ? castValue(tagValues[0], field)
              : field.type === 'number'
                ? tagValues.map((v) => castValue(v, field)).filter((v) => v !== undefined)
                : tagValues;
        }
        continue;
      }
      if (target.target === 'table') {
        // Read from Djot table
        const label = (field.metadata?.label as string | undefined) ?? field.id;
        const tableVals = tableByKey.get(field.id) ?? tableByKey.get(label);
        if (tableVals && tableVals.length > 0) {
          result[field.id] =
            tableVals.length === 1
              ? castValue(tableVals[0], field)
              : field.type === 'number' || field.type === 'boolean'
                ? tableVals.map((v) => castValue(v, field)).filter((v) => v !== undefined)
                : tableVals;
        }
      }
    }
  }

  const dTag = getTag(event.tags, 'd');
  if (dTag) result['__dTag'] = dTag;
  return result;
}

export function buildWikiATag(pubkey: string, dTag: string): string {
  return `${WIKI_KIND}:${pubkey}:${dTag}`;
}

export function extractExternalIds(event: WikiEvent): string[] {
  return getAllTagValues(event.tags, 'i');
}
