/**
 * @nostr-post/core - References with a role in posts
 *
 * A post can reference entities in roles, e.g. a beer review's beer, where it
 * was tasted and where it was bought. Every referenced entity is a plain `a`
 * tag. In plain-text kinds (kind 1) tags can't say which `a` tag is which, so
 * a role field (a `ref` field mapped to an `a` tag and to the content) adds a
 * NIP-27 mention line to the text: `Tasted at: nostr:naddr1…`. Other clients
 * show it as a link; reading matches the line's label to the field.
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
};

/** The address of one referenced entity, if the value names one */
const refAddress = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v.startsWith('30818:') ? v : undefined;
  const ref = v as RefLike | null;
  if (ref && typeof ref.dTag === 'string' && typeof ref.resolvedPubkey === 'string') {
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

/** The mention lines of a role field's value: `<label>: nostr:naddr1…` */
export function roleLines(field: PostField, value: unknown): string[] {
  return refAddresses(value).flatMap((address) => {
    const naddr = encodeNaddr(address);
    return naddr ? [`${fieldLabel(field)}: nostr:${naddr}`] : [];
  });
}

const ROLE_LINE = /^(.+?):\s*nostr:(naddr1[02-9ac-hj-np-z]+)\s*$/i;

/**
 * Splits plain-text content into the text and the trailing role lines. Each
 * line's address goes to the role field with that label, else (a renamed
 * label) to the next role field in order.
 */
export function parsePostRoles(
  content: string,
  roleFields: PostField[]
): { text: string; roles: Map<string, string[]> } {
  const lines = content.split('\n');
  let start = lines.length;
  while (start > 0 && ROLE_LINE.test(lines[start - 1]?.trim() ?? '')) start--;
  const roles = new Map<string, string[]>();
  let next = 0;
  for (const line of lines.slice(start)) {
    const [, label = '', naddr = ''] = line.trim().match(ROLE_LINE) ?? [];
    const address = decodeNaddr(naddr);
    const field = roleFields.find((f) => fieldLabel(f) === label.trim()) ?? roleFields[next++];
    if (!address || !field) continue;
    roles.set(field.id, [...(roles.get(field.id) ?? []), address]);
  }
  return { text: lines.slice(0, start).join('\n').trimEnd(), roles };
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

/**
 * Reads the roles of a plain-text post: the text without role lines, each role
 * field's entities, and the `a` tags without the ones the roles claim (for the
 * other reference fields, e.g. the reviewed beer).
 */
export function readPostRoles(
  event: { kind: number; content: string; tags: string[][] },
  fields: PostField[]
): { text: string; values: Record<string, unknown>; tags: string[][] } {
  const roleFields = fields.filter((f) => isPostRoleField(f, event.kind));
  if (roleFields.length === 0) return { text: event.content, values: {}, tags: event.tags };
  const { text, roles } = parsePostRoles(event.content, roleFields);
  const values: Record<string, unknown> = {};
  for (const field of roleFields) {
    const entities = (roles.get(field.id) ?? []).map(entityFromAddress);
    if (entities.length > 0) values[field.id] = field.metadata?.multiple ? entities : entities[0];
  }
  const claimed = new Set([...roles.values()].flat());
  const tags = event.tags.filter((t) => !(t[0] === 'a' && claimed.has(t[1] ?? '')));
  return { text, values, tags };
}
