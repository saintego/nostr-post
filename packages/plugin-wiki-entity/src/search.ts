import { nip50Search } from '@nostr-post/core/nip50';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { fetchEvents } from '@nostr-post/signer';
import {
  DEFAULT_WIKI_RELAYS,
  WIKI_KIND,
  type WikiEvent,
  defaultResolver,
  groupByDTag,
} from '@nostr-post/wiki';
import { entityTypeAffixes, entityTypeDTag, matchesEntityQuery, matchesEntityType } from './core';

/** One matching entity: its resolved (shown) version and how many versions were found */
export interface EntitySearchResult {
  event: WikiEvent;
  versions: number;
}

/**
 * Search wiki entities by title or slug. With `entityManifest`, only entities of
 * that type are returned (d-tags with the manifest's prefix/suffix, e.g. `-beer`).
 */
export async function searchEntities(
  query: string,
  options: { entityManifest?: NostrPostManifest; relays?: string[] } = {}
): Promise<EntitySearchResult[]> {
  const affixes = options.entityManifest
    ? entityTypeAffixes(options.entityManifest)
    : { prefix: '', suffix: '' };
  const merged = await nip50Search<WikiEvent>({
    fetchFn: fetchEvents as never,
    query,
    baseFilter: { kinds: [WIKI_KIND] },
    fallbackFilter: { '#d': [entityTypeDTag(query, affixes)] },
    nip50Limit: 30,
    fallbackLimit: 20,
    relays: options.relays ?? DEFAULT_WIKI_RELAYS,
    getId: (ev) => ev.id,
  });

  // Relays without NIP-50 support often ignore `search` and return arbitrary
  // wiki events, so keep only events whose title or d-tag match the query,
  // and only entities of the requested type.
  const matching = merged.filter(
    (ev) =>
      matchesEntityQuery(ev.tags, query) &&
      matchesEntityType(ev.tags.find((t) => t[0] === 'd')?.[1] ?? '', affixes)
  );

  // Multiple pubkeys can publish the same d-tag. Group by d-tag and resolve
  // each group to a single winner so each entity appears once.
  return [...groupByDTag(matching).values()].flatMap((group) => {
    const event = defaultResolver(group);
    return event ? [{ event, versions: group.length }] : [];
  });
}
