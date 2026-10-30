import { getManifestAvailableKinds } from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest } from '@nostr-post/core/types';
import type { FetchFilter } from '@nostr-post/signer';
import { addressOf } from './feedStandard';
import type { SignedEvent } from './signer';

/** <nostr-post-feed> properties that change what it loads */
export const FEED_LOAD_PROPERTIES = [
  'authors',
  'kinds',
  'ids',
  'limit',
  'since',
  'until',
  'search',
  'relays',
  'manifest',
  'filterTags',
  'tagFilters',
  'filters',
  'commentsEnabled',
  'reactionsEnabled',
];

export const parseFilterTags = (input?: string): Record<string, string[]> => {
  if (!input) return {};

  const parsed: Record<string, string[]> = {};
  const entries = input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const separatorIndex = entry.indexOf(':');
    if (separatorIndex <= 0) continue;

    const rawTag = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!rawTag || !value) continue;

    const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`;
    if (!parsed[tag]) parsed[tag] = [];
    parsed[tag].push(value);
  }

  return parsed;
};

export const buildFetchFilter = ({
  ids,
  authors,
  kinds,
  search,
  limit,
  since,
  until,
  filterTags,
  tagFilters,
}: {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  search?: string;
  limit?: number;
  since?: number;
  until?: number;
  filterTags?: string;
  tagFilters?: Record<string, string[]>;
}): FetchFilter => {
  const filter: FetchFilter = {
    ids,
    authors,
    kinds,
    search,
    limit,
    since,
    until,
  };

  const fromAttribute = parseFilterTags(filterTags);
  const mergedTagFilters: Record<string, string[]> = {
    ...fromAttribute,
    ...(tagFilters ?? {}),
  };

  for (const [tag, values] of Object.entries(mergedTagFilters)) {
    if (!tag.startsWith('#') || values.length === 0) continue;
    filter[tag as `#${string}`] = values;
  }

  return filter;
};

export const buildFetchFilters = ({
  filters,
  ids,
  authors,
  kinds,
  search,
  limit,
  since,
  until,
  filterTags,
  tagFilters,
}: {
  filters?: FetchFilter[];
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  search?: string;
  limit?: number;
  since?: number;
  until?: number;
  filterTags?: string;
  tagFilters?: Record<string, string[]>;
}): FetchFilter | FetchFilter[] => {
  if (filters && filters.length > 0) {
    return filters;
  }
  return buildFetchFilter({
    ids,
    authors,
    kinds,
    search,
    limit,
    since,
    until,
    filterTags,
    tagFilters,
  });
};

/** Events asked for by default */
const DEFAULT_LIMIT = 20;

/** What <nostr-post-feed> asks relays for */
export interface FeedQuery {
  filters?: FetchFilter[];
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  manifest?: NostrPostManifest;
  search?: string;
  limit?: number;
  since?: number;
  until?: number;
  filterTags?: string;
  tagFilters?: Record<string, string[]>;
}

/** The feed's relay filters. Kinds: `kinds`, else the manifest's, else notes */
export const buildFeedFilters = (query: FeedQuery): FetchFilter | FetchFilter[] =>
  buildFetchFilters({
    ...query,
    kinds: query.kinds?.length
      ? query.kinds
      : query.manifest
        ? getManifestAvailableKinds(query.manifest)
        : [1],
    limit: query.limit ?? DEFAULT_LIMIT,
  });

export const buildInteractionLoadKey = (events: SignedEvent[]): string => {
  return events
    .map((event) => event.id)
    .sort()
    .join(',');
};

export const mergeUniqueEventsById = (
  currentEvents: SignedEvent[],
  incomingEvents: SignedEvent[]
): SignedEvent[] => {
  const mergedById = new Map(currentEvents.map((event) => [event.id, event]));
  for (const event of incomingEvents) {
    mergedById.set(event.id, event);
  }
  return [...mergedById.values()];
};

/**
 * Relay filters for the comments and reactions of `events`: by id, and for addressable events
 * by address too, so comments on their earlier versions come along
 */
export const interactionFilters = (
  events: SignedEvent[],
  options: { comments?: boolean; reactions?: boolean }
): FetchFilter[] => {
  const ids = events.map((event) => event.id);
  if (ids.length === 0) return [];
  const addresses = events.flatMap((event) => addressOf(event) ?? []);
  const limit = Math.max(ids.length * 10, 50);
  const filters: FetchFilter[] = [];
  if (options.comments) {
    filters.push({ kinds: [1], '#e': ids, limit });
    if (addresses.length > 0) filters.push({ kinds: [1], '#a': addresses, limit });
  }
  if (options.reactions) filters.push({ kinds: [7], '#e': ids, limit });
  return filters;
};
