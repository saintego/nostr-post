import type { FetchFilter } from '@nostr-post/signer';
import type { SignedEvent } from './signer';

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
