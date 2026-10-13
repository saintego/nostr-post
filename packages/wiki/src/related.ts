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
  /**
   * Numbers over the section's posts, e.g. `{ tag: 'rating', max: 5 }`: how many
   * there are and the average of that tag; computed when shown, never stored
   */
  stats?: { tag: string; max?: number };
  /** Show the images of the section's posts (`r` / `imeta` tags), e.g. review photos */
  gallery?: boolean;
}

/** How many posts a section with stats or a gallery reads, while listing only `limit` */
export const RELATED_STATS_LIMIT = 500;

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

/** The number of posts and the average of a numeric tag (e.g. `rating`) among those that have it */
export function relatedStats(
  events: WikiEvent[],
  tag: string
): { count: number; rated: number; average?: number } {
  const values = events
    .map((e) => Number(e.tags.find((t) => t[0] === tag)?.[1]))
    .filter((n) => Number.isFinite(n));
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: events.length,
    rated: values.length,
    average: values.length > 0 ? sum / values.length : undefined,
  };
}

const IMAGE_URL = /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i;

/** An `imeta` tag's url when its media type is an image (NIP-92) */
const imetaImage = (tag: string[]): string | undefined => {
  const fields = Object.fromEntries(
    tag.slice(1).map((part) => [part.split(' ')[0], part.slice(part.indexOf(' ') + 1)])
  );
  const url = fields.url;
  if (!url) return undefined;
  return fields.m?.startsWith('image/') || IMAGE_URL.test(url) ? url : undefined;
};

/** The images of the posts (`imeta` with an image type, or `r` URLs of image files), newest post first */
export function relatedImages(events: WikiEvent[], max = 12): string[] {
  const urls = events.flatMap((e) =>
    e.tags.flatMap((t) => {
      if (t[0] === 'imeta') return imetaImage(t) ?? [];
      return t[0] === 'r' && t[1] && IMAGE_URL.test(t[1]) ? [t[1]] : [];
    })
  );
  return [...new Set(urls)].slice(0, max);
}
