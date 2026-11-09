/**
 * @nostr-post/core - References with a role in posts
 *
 * A post can reference entities in roles, e.g. a beer review's beer, where it
 * was tasted and where it was bought. Every referenced entity is a plain `a`
 * tag. In plain-text kinds (kind 1) tags can't say which `a` tag is which, so
 * a role field (a `ref` field mapped to an `a` tag and to the content) adds a
 * NIP-27 mention line to the text: `Tasted at: nostr:naddr1…`. Other clients
 * show it as a link; reading matches the line's label to the field.
 *
 * An entity without a page (e.g. a performer the user didn't create a page for) gets a text
 * line with its name and web links instead, `Performers: Not Proven (https://…, https://…)`.
 * Its links are `i` tags too.
 */

import { fieldLabel } from './manifest';
import { isStructuredContentKind } from './manifestMappings';
import { decodeNaddr, encodeNaddr } from './nip19';
import type { PostField } from './types';

// ── Role fields ──────────────────────────────────────────────────────

const targetsOf = (field: PostField) => [field.mapTo].flat();

/**
 * A field mapped to an `a` tag and to the content of a plain-text kind: a `ref`
 * field (picked entities) or a link-only venue field (its venue page)
 */
export const isPostRoleField = (field: PostField, kind: number): boolean =>
  !isStructuredContentKind(kind) &&
  targetsOf(field).some((t) => t.kind === kind && t.target === 'tag' && t.tagName === 'a') &&
  targetsOf(field).some((t) => t.kind === kind && t.target === 'content');

type RefLike = {
  dTag?: unknown;
  resolvedPubkey?: unknown;
  /** A venue's wiki page, set when the venue hub created or found it */
  wikiEntity?: { pubkey?: unknown; dTag?: unknown };
  /** An entity without a page: its name and its links (NIP-73 `i` values, web links among them) */
  displayName?: unknown;
  externalIds?: unknown;
};

/**
 * A reference value: an address, or entities (objects, e.g. `{ dTag, resolvedPubkey }`), also
 * ones without a page (yet). The field's plugin checks the entities themselves
 */
export const isRefValue = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim() !== '';
  const items = Array.isArray(value) ? value : [value];
  return (
    items.length > 0 &&
    items.every((v) => (typeof v === 'string' ? v.trim() !== '' : typeof v === 'object' && v))
  );
};

/** The address of one referenced entity, if the value names one */
const refAddress = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v.startsWith('30818:') ? v : undefined;
  const ref = v as RefLike | null;
  // An entity without a page has an empty d-tag and pubkey: its page, if publishing created one,
  // is its `wikiEntity`
  if (
    ref &&
    typeof ref.dTag === 'string' &&
    ref.dTag &&
    typeof ref.resolvedPubkey === 'string' &&
    ref.resolvedPubkey
  ) {
    return `30818:${ref.resolvedPubkey}:${ref.dTag}`;
  }
  const page = ref?.wikiEntity;
  if (page && typeof page.dTag === 'string' && typeof page.pubkey === 'string') {
    return `30818:${page.pubkey}:${page.dTag}`;
  }
  return undefined;
};

/**
 * The addresses in a reference value: an entity (`{ dTag, resolvedPubkey }`),
 * a venue with its wiki page (`{ wikiEntity: { pubkey, dTag } }`), an address, or a list
 */
export function refAddresses(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).flatMap((v) => refAddress(v) ?? []);
}

/** An entity without a page, by name, with its web links */
export type NamedRef = { name: string; links: string[] };

const isWebLink = (id: unknown): id is string =>
  typeof id === 'string' && /^https?:\/\/[^\s(),]+$/.test(id);

/** The name and web links of an entity without a page; undefined for a page or a nameless value */
const namedRef = (v: unknown): NamedRef | undefined => {
  if (refAddress(v) || typeof v !== 'object' || !v) return undefined;
  const { displayName, externalIds } = v as RefLike;
  const name = typeof displayName === 'string' ? displayName.replace(/\s+/g, ' ').trim() : '';
  const links = Array.isArray(externalIds) ? externalIds.filter(isWebLink) : [];
  return name ? { name, links } : undefined;
};

/**
 * The lines of a role field's value: `<label>: nostr:naddr1…` per entity with a page, and
 * `<label>: <name> (<links>)` per entity without one, also when the post's text names it (a
 * guess whether it does could drop a name)
 */
export function roleLines(field: PostField, value: unknown): string[] {
  const label = fieldLabel(field);
  return (Array.isArray(value) ? value : [value]).flatMap((v) => {
    const address = refAddress(v);
    if (address) {
      const naddr = encodeNaddr(address);
      return naddr ? [`${label}: nostr:${naddr}`] : [];
    }
    const named = namedRef(v);
    if (!named) return [];
    return [`${label}: ${named.name}${named.links.length ? ` (${named.links.join(', ')})` : ''}`];
  });
}

const ROLE_LINE = /^(.+?):\s*nostr:(naddr1[02-9ac-hj-np-z]+)\s*$/i;
/** A role line's label and its entity's address (`kind:pubkey:d-tag`); undefined for other lines */
export const roleLineOf = (line: string): { label: string; address: string } | undefined => {
  const [, label = '', naddr = ''] = line.trim().match(ROLE_LINE) ?? [];
  const address = naddr ? decodeNaddr(naddr) : undefined;
  return address ? { label: label.trim(), address } : undefined;
};

/** `<label>: <name>` with its links in brackets, if any */
const NAME_LINE =
  /^(.+?):\s*(\S.*?)(?:\s*\((https?:\/\/[^\s(),]+(?:,\s*https?:\/\/[^\s(),]+)*)\))?$/;

/** A name line of one of the role fields (only by its label: other text has colons too) */
const nameLine = (line: string, roleFields: PostField[]) => {
  const [, label = '', name = '', links = ''] = line.match(NAME_LINE) ?? [];
  const field = roleFields.find((f) => fieldLabel(f) === label.trim());
  if (!field || !name) return undefined;
  return { field, named: { name, links: links ? links.split(/,\s*/) : [] } };
};

/**
 * Splits plain-text content into the text and the trailing role lines. Each
 * line's address goes to the role field with that label, else (a renamed
 * label) to the next role field in order. A name line (an entity without a page)
 * goes to the role field with its label.
 */
export function parsePostRoles(
  content: string,
  roleFields: PostField[]
): { text: string; roles: Map<string, string[]>; named: Map<string, NamedRef[]> } {
  const lines = content.split('\n');
  const isRoleLine = (line: string) => ROLE_LINE.test(line) || !!nameLine(line, roleFields);
  let start = lines.length;
  while (start > 0 && isRoleLine(lines[start - 1]?.trim() ?? '')) start--;
  const roles = new Map<string, string[]>();
  const named = new Map<string, NamedRef[]>();
  const add = <T>(map: Map<string, T[]>, id: string, item: T) =>
    map.set(id, [...(map.get(id) ?? []), item]);
  let next = 0;
  for (const line of lines.slice(start).map((l) => l.trim())) {
    const [, label = '', naddr = ''] = line.match(ROLE_LINE) ?? [];
    const byName = naddr ? undefined : nameLine(line, roleFields);
    if (byName) add(named, byName.field.id, byName.named);
    if (!naddr) continue;
    const address = decodeNaddr(naddr);
    const field = roleFields.find((f) => fieldLabel(f) === label.trim()) ?? roleFields[next++];
    if (address && field) add(roles, field.id, address);
  }
  return { text: lines.slice(0, start).join('\n').trimEnd(), roles, named };
}

/** Plain-text content (kind 1): the text fields, then the role fields' mention lines */
export function plainTextContent(fields: PostField[], formData: Record<string, unknown>): string {
  // References and venues hold objects (or lists of them), written as mention lines;
  // every other value is text, a list of values (e.g. tags) joined
  const isObject = (v: unknown): boolean => typeof v === 'object' && v !== null;
  const isEmptyList = (v: unknown): boolean => Array.isArray(v) && v.length === 0;
  const isRole = (field: PostField) => {
    const value = formData[field.id];
    return field.type === 'ref' || (Array.isArray(value) ? value.some(isObject) : isObject(value));
  };
  const text = fields
    .filter((field) => !isRole(field))
    .map((field) => formData[field.id])
    .filter((value) => value !== undefined && value !== null && !isEmptyList(value))
    .map((value) => (Array.isArray(value) ? value.join(', ') : value));
  const lines = fields.filter(isRole).flatMap((field) => roleLines(field, formData[field.id]));
  return [...text, ...lines].join('\n');
}

/** A value in structured (JSON) content: a referenced entity is stored as its address */
export const structuredContentValue = (field: PostField, value: unknown): unknown =>
  field.type === 'ref' || field.metadata?.linkOnly === true
    ? (refAddresses(value)[0] ?? value)
    : value;

/** A picked entity rebuilt from its address, as the wiki-entity picker stores it */
const entityFromAddress = (address: string) => {
  const [, pubkey = '', ...rest] = address.split(':');
  const dTag = rest.join(':');
  // Both shapes: a picked entity, and a venue's wiki page
  return {
    dTag,
    resolvedPubkey: pubkey,
    externalIds: [] as string[],
    wikiEntity: { pubkey, dTag },
  };
};

/** An entity without a page, as the wiki-entity picker stores it */
const entityFromName = ({ name, links }: NamedRef) => ({
  dTag: '',
  resolvedPubkey: '',
  externalIds: links,
  displayName: name,
  unlinked: true as const,
});

/**
 * The event's other `i` tags on a nameless value, for a field of several entities: links of
 * picked entities and of entities the text names, which editing keeps (`withPageLinks` in
 * plugin-wiki-entity gives picked entities theirs back)
 */
const otherLinks = (tags: string[][], named: NamedRef[]) => {
  const claimed = new Set(named.flatMap((n) => n.links));
  const ids = tags.flatMap((t) => (t[0] === 'i' && t[1] && !claimed.has(t[1]) ? [t[1]] : []));
  return ids.length ? [{ dTag: '', resolvedPubkey: '', externalIds: ids, unlinked: true }] : [];
};

/**
 * Reads the roles of a plain-text post: the text without role lines, each role
 * field's entities (with and without a page), and the `a` tags without the ones
 * the roles claim (for the other reference fields, e.g. the reviewed beer).
 */
export function readPostRoles(
  event: { kind: number; content: string; tags: string[][] },
  fields: PostField[]
): { text: string; values: Record<string, unknown>; tags: string[][] } {
  const roleFields = fields.filter((f) => isPostRoleField(f, event.kind));
  if (roleFields.length === 0) return { text: event.content, values: {}, tags: event.tags };
  const { text, roles, named } = parsePostRoles(event.content, roleFields);
  const values: Record<string, unknown> = {};
  for (const field of roleFields) {
    const names = named.get(field.id) ?? [];
    const entities = [
      ...(roles.get(field.id) ?? []).map(entityFromAddress),
      ...names.map(entityFromName),
    ];
    if (entities.length === 0) continue;
    values[field.id] = field.metadata?.multiple
      ? [...entities, ...otherLinks(event.tags, names)]
      : entities[0];
  }
  const claimed = new Set([...roles.values()].flat());
  const tags = event.tags.filter((t) => !(t[0] === 'a' && claimed.has(t[1] ?? '')));
  return { text, values, tags };
}
