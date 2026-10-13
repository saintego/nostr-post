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
 * Also NIP-19 `naddr` encoding (bech32), without dependencies.
 */

import { fieldLabel } from './manifest';
import { isStructuredContentKind } from './manifestMappings';
import type { PostField } from './types';

// ── NIP-19 naddr ─────────────────────────────────────────────────────

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const polymod = (values: number[]): number => {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GENERATOR[i] as number;
  }
  return chk >>> 0;
};

const hrpExpand = (hrp: string): number[] => [
  ...[...hrp].map((c) => c.charCodeAt(0) >> 5),
  0,
  ...[...hrp].map((c) => c.charCodeAt(0) & 31),
];

/** Regroups bits, e.g. bytes (8) into bech32 words (5) */
const convertBits = (data: number[], from: number, to: number, pad: boolean): number[] | null => {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const max = (1 << to) - 1;
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & max);
    }
  }
  if (pad && bits > 0) out.push((acc << (to - bits)) & max);
  else if (!pad && (bits >= from || ((acc << (to - bits)) & max) !== 0)) return null;
  return out;
};

const hexBytes = (hex: string): number[] =>
  Array.from({ length: hex.length / 2 }, (_, i) =>
    Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  );

/** UTF-8 bytes of a string (core has no DOM or Node types for TextEncoder) */
const utf8 = (text: string): number[] =>
  [...text].flatMap((char) => {
    const c = char.codePointAt(0) as number;
    if (c < 0x80) return [c];
    if (c < 0x800) return [0xc0 | (c >> 6), 0x80 | (c & 63)];
    if (c < 0x10000) return [0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)];
    return [0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)];
  });

/** How many continuation bytes follow a UTF-8 lead byte */
const continuationBytes = (lead: number): number => {
  if (lead >= 0xf0) return 3;
  if (lead >= 0xe0) return 2;
  if (lead >= 0xc0) return 1;
  return 0;
};

/** A string from UTF-8 bytes */
const fromUtf8 = (bytes: number[]): string => {
  const points: number[] = [];
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i] as number;
    const extra = continuationBytes(b);
    let c = extra === 0 ? b : b & (0x3f >> extra);
    for (let j = 1; j <= extra; j++) c = (c << 6) | ((bytes[i + j] as number) & 63);
    points.push(c);
    i += extra + 1;
  }
  return String.fromCodePoint(...points);
};

/** An address (`<kind>:<pubkey>:<d-tag>`) as a NIP-19 `naddr` */
export function encodeNaddr(address: string): string | undefined {
  const match = address.match(/^(\d+):([0-9a-f]{64}):(.*)$/);
  if (!match) return undefined;
  const [, kind, pubkey, identifier] = match as unknown as [string, string, string, string];
  const tlv = (type: number, value: number[]) => [type, value.length, ...value];
  const k = Number(kind);
  const bytes = [
    ...tlv(0, utf8(identifier)),
    ...tlv(2, hexBytes(pubkey)),
    ...tlv(3, [(k >>> 24) & 255, (k >>> 16) & 255, (k >>> 8) & 255, k & 255]),
  ];
  const words = convertBits(bytes, 8, 5, true) ?? [];
  const mod = polymod([...hrpExpand('naddr'), ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31);
  return `naddr1${[...words, ...checksum].map((w) => CHARSET[w]).join('')}`;
}

/** A NIP-19 `naddr` as an address (`<kind>:<pubkey>:<d-tag>`); undefined if invalid */
export function decodeNaddr(naddr: string): string | undefined {
  const lower = naddr.toLowerCase();
  if (!lower.startsWith('naddr1')) return undefined;
  const data = [...lower.slice(6)].map((c) => CHARSET.indexOf(c));
  if (data.some((d) => d < 0) || polymod([...hrpExpand('naddr'), ...data]) !== 1) return undefined;
  const bytes = convertBits(data.slice(0, -6), 5, 8, false);
  if (!bytes) return undefined;
  const fields: Record<number, number[]> = {};
  for (let i = 0; i + 1 < bytes.length; ) {
    const type = bytes[i] as number;
    const length = bytes[i + 1] as number;
    fields[type] ??= bytes.slice(i + 2, i + 2 + length);
    i += 2 + length;
  }
  const [identifier, pubkey, kind] = [fields[0], fields[2], fields[3]];
  if (!identifier || pubkey?.length !== 32 || kind?.length !== 4) return undefined;
  const kindNumber = kind.reduce((acc, b) => acc * 256 + b, 0);
  const hex = pubkey.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${kindNumber}:${hex}:${fromUtf8(identifier)}`;
}

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
  // Text fields hold strings; references and venues hold objects, written as mention lines
  const isRole = (field: PostField) =>
    field.type === 'ref' || typeof formData[field.id] === 'object';
  const text = fields
    .filter((field) => !isRole(field))
    .map((field) => formData[field.id])
    .filter((value) => value !== undefined);
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
