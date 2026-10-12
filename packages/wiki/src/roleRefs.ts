/**
 * References with a role. A wiki entity can point to other entities in roles,
 * e.g. a beer's brands and the brewery it was brewed at. Every referenced
 * entity is a plain `a` tag, so `#a` queries find it. A field that names a
 * role (a `ref` field mapped to an `a` tag and to an infobox row) also writes
 * its row as NIP-54 wikilinks, `[Pivovar Z][pivovar-z-brewery]`, which any
 * wiki client shows as links; reading matches those links to the `a` tags.
 */

import type { NostrTarget, PostField } from '@nostr-post/core/types';
import { templateText } from './identity';
import { normalizeDTag } from './normalizeDTag';

const WIKI_KIND = 30818;

/** A referenced wiki entity, as the wiki-entity picker stores it */
export interface EntityRef {
  dTag: string;
  resolvedPubkey: string;
  externalIds: string[];
  displayName?: string;
}

/** A wikilink in an infobox cell: its target d-tag and its text */
export interface WikiLink {
  target: string;
  text: string;
}

const wikiTargets = (field: PostField): NostrTarget[] =>
  [field.mapTo].flat().filter((t) => t.kind === WIKI_KIND);

/** A `ref` field mapped to an `a` tag and to an infobox row: its row names the role */
export const isRoleField = (field: PostField): boolean => {
  if (field.type !== 'ref') return false;
  const targets = wikiTargets(field);
  return (
    targets.some((t) => t.target === 'tag' && t.tagName === 'a') &&
    targets.some((t) => t.target === 'table')
  );
};

/** A `ref` field whose entities come from `a` tags */
export const isRefTagField = (field: PostField): boolean =>
  field.type === 'ref' && wikiTargets(field).some((t) => t.target === 'tag' && t.tagName === 'a');

/** The referenced entities in a field value (one entity or a list) */
export const entityRefs = (value: unknown): EntityRef[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (v): v is EntityRef => !!v && typeof v === 'object' && typeof (v as EntityRef).dTag === 'string'
  );

const escapeLinkText = (text: string): string => text.replace(/[[\]\\]/g, (c) => `\\${c}`);

/** An infobox cell of wikilinks to the referenced entities: `[Pivovar Z][pivovar-z-brewery]` */
export function roleRowText(value: unknown): string {
  return entityRefs(value)
    .map((ref) => `[${escapeLinkText(templateText(ref) || ref.dTag)}][${ref.dTag}]`)
    .join(', ');
}

/** The wikilink targets in role rows, so plain `a` tags pointing at them aren't read twice */
export function claimedDTags(roleLinks: WikiLink[][]): Set<string> {
  return new Set(roleLinks.flat().map((link) => link.target));
}

/** Address parts of the wiki `a` tags: `30818:<pubkey>:<d-tag>` */
function wikiAddresses(tags: string[][]): { pubkey: string; dTag: string }[] {
  return tags.flatMap((t) => {
    const match = t[0] === 'a' ? t[1]?.match(/^30818:([^:]+):(.+)$/) : null;
    return match ? [{ pubkey: match[1] as string, dTag: match[2] as string }] : [];
  });
}

/**
 * The entities a role row links to, with the pubkey of the version its `a`
 * tag names. Links without a matching `a` tag are skipped.
 */
export function refsFromLinks(links: WikiLink[], tags: string[][]): EntityRef[] {
  const addresses = wikiAddresses(tags);
  return links.flatMap((link) => {
    const address = addresses.find((a) => a.dTag === link.target);
    return address
      ? [
          {
            dTag: link.target,
            resolvedPubkey: address.pubkey,
            externalIds: [],
            displayName: link.text,
          },
        ]
      : [];
  });
}

/** A role field's value: its entities, or the first one unless `metadata.multiple` */
export function roleFieldValue(
  field: PostField,
  refs: EntityRef[]
): EntityRef | EntityRef[] | undefined {
  if (refs.length === 0) return undefined;
  return field.metadata?.multiple === true ? refs : refs[0];
}

/** Tags without the wiki `a` tags whose d-tag a role row claims */
export function withoutClaimed(tags: string[][], claimed: Set<string>): string[][] {
  if (claimed.size === 0) return tags;
  return tags.filter((t) => {
    const dTag = t[0] === 'a' ? t[1]?.match(/^30818:[^:]+:(.+)$/)?.[1] : undefined;
    return !(dTag && claimed.has(dTag));
  });
}

/** A wikilink target as a d-tag: NIP-54 normalizes it like `d` tags */
export const linkTarget = (reference: string): string => normalizeDTag(reference);
