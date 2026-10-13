/**
 * Related items on a wiki entity's page, defined by its manifest
 * (`wikiConfig.related`): e.g. a brewery's beers, a beer's reviews, a venue's
 * reviews. Found by the `a` tags pointing at any version of the entity (every
 * author's version has its own address), so references to any version count.
 */

import { parsePostRoles } from '@nostr-post/core/postRoles';
import { fetchEvents } from '@nostr-post/signer';
import { fetchEntityVersions } from './fetch';
import { DEFAULT_WIKI_RELAYS, WIKI_KIND, infoboxRowLinks } from './nip54';
import { type WikiEvent, collectEntityATags, defaultResolver, groupByDTag } from './resolver';

/** One section of related items (`wikiConfig.related`) */
export interface WikiRelatedSection {
  /** Heading, e.g. "Beers" or "Reviews" */
  label: string;
  /** Event kinds to list: 30818 for wiki entities, e.g. 1 / 30078 for reviews */
  kinds: number[];
  /** Wiki entities of one type, by the d-tag suffix of the type (e.g. `-beer`) */
  dTagSuffix?: string;
  /**
   * Only wiki entities whose role row (this field id) links this entity, e.g.
   * `brewed_at`: "Beers brewed here" (see References with a role)
   */
  role?: string;
  /** Only events linking this manifest (its id, e.g. `beer-review-v1`) */
  manifest?: string;
  /** Items shown at first (default 20); "Show more" asks for more */
  limit?: number;
}

/** Relays may cap how many values one filter takes: ask in batches */
const BATCH = 50;

const dTagOf = (event: WikiEvent): string => event.tags.find((t) => t[0] === 'd')?.[1] ?? '';

/** Whether an event links the manifest with this id (`a` tag `30078:<pubkey>:nostr-post:<id>`) */
const linksManifest = (event: WikiEvent, id: string): boolean =>
  event.tags.some((t) => t[0] === 'a' && t[1]?.startsWith('30078:') && t[1].endsWith(`:${id}`));

/**
 * The section's items among the events referencing the entity: its kinds,
 * type, role and manifest; wiki entities in their newest version, none of the
 * entity's own versions; newest first.
 */
export function filterRelated(
  events: WikiEvent[],
  section: WikiRelatedSection,
  dTag: string
): WikiEvent[] {
  const matching = events.filter((e) => {
    if (!section.kinds.includes(e.kind)) return false;
    if (section.manifest && !linksManifest(e, section.manifest)) return false;
    if (e.kind !== WIKI_KIND) return true;
    const entity = dTagOf(e);
    if (entity === dTag) return false;
    if (section.dTagSuffix && !entity.endsWith(section.dTagSuffix)) return false;
    return !section.role || infoboxRowLinks(e.content, section.role).includes(dTag);
  });
  const posts = matching.filter((e) => e.kind !== WIKI_KIND);
  const entities = [...groupByDTag(matching.filter((e) => e.kind === WIKI_KIND)).values()]
    .map((versions) => defaultResolver(versions))
    .filter((e): e is WikiEvent => !!e);
  return [...entities, ...posts].sort((a, b) => b.created_at - a.created_at);
}

/** The related items of the entity at `dTag` for one section */
export async function fetchRelated(
  dTag: string,
  section: WikiRelatedSection,
  relays: string[] = DEFAULT_WIKI_RELAYS,
  limit = section.limit ?? 20
): Promise<WikiEvent[]> {
  const addresses = collectEntityATags(await fetchEntityVersions(dTag, relays));
  const batches = Array.from({ length: Math.ceil(addresses.length / BATCH) }, (_, i) =>
    addresses.slice(i * BATCH, (i + 1) * BATCH)
  );
  const found = await Promise.all(
    batches.map(
      (batch) =>
        fetchEvents(
          { kinds: section.kinds, '#a': batch, limit } as never,
          relays
        ) as unknown as Promise<WikiEvent[]>
    )
  );
  const unique = [...new Map(found.flat().map((e) => [e.id, e])).values()];
  return filterRelated(unique, section, dTag).slice(0, limit);
}

/** A short text for a listed post: kind 1 without role lines, NIP-78 its first text value */
export function relatedSnippet(event: WikiEvent, maxLength = 200): string {
  let text = event.content;
  // Role lines (`Tasted at: nostr:naddr1…`) aren't part of the text
  if (event.kind === 1) text = parsePostRoles(event.content, []).text;
  else if (event.content.trim().startsWith('{')) {
    try {
      const data = JSON.parse(event.content) as Record<string, unknown>;
      text = String(Object.values(data).find((v) => typeof v === 'string') ?? '');
    } catch {
      // Not JSON: the content as is
    }
  }
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}
