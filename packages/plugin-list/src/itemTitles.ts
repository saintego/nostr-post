/**
 * @nostr-post/plugin-list - what a list item is called
 *
 * Items are addresses or ids; to show them, fetch their events and take a title.
 * Wiki entities are looked up by d-tag (every author's version), like the list compares them.
 */

import { DEFAULT_RELAYS, type FetchFilter, fetchEvents } from '@nostr-post/signer';
import { type ListEvent, type ListItem, WIKI_KIND } from './types';

const parseAddress = (value: string) => {
  const match = value.match(/^(\d+):([^:]*):(.*)$/);
  return match ? { kind: Number(match[1]), pubkey: match[2] ?? '', dTag: match[3] ?? '' } : null;
};

const tagValue = (event: ListEvent, name: string) => event.tags.find((t) => t[0] === name)?.[1];

/** An event's `title` tag, else its d-tag, else the start of its content */
export function eventTitle(event: ListEvent): string {
  const title = tagValue(event, 'title') || tagValue(event, 'd');
  if (title) return title;
  const text = event.content.trim().replace(/\s+/g, ' ');
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

/** Filters that find the events of `items` */
export function itemFilters(items: ListItem[]): FetchFilter[] {
  const wikiDTags: string[] = [];
  const ids: string[] = [];
  const filters: FetchFilter[] = [];
  for (const item of items) {
    if (item.tag === 'e') {
      ids.push(item.value);
      continue;
    }
    const address = parseAddress(item.value);
    if (!address) continue;
    if (address.kind === WIKI_KIND) wikiDTags.push(address.dTag);
    else filters.push({ kinds: [address.kind], authors: [address.pubkey], '#d': [address.dTag] });
  }
  if (wikiDTags.length > 0) filters.push({ kinds: [WIKI_KIND], '#d': wikiDTags });
  if (ids.length > 0) filters.push({ ids });
  return filters;
}

/** The newest of `events` that `item` refers to */
export function eventForItem(item: ListItem, events: ListEvent[]): ListEvent | undefined {
  const address = item.tag === 'a' ? parseAddress(item.value) : null;
  const matches = events.filter((event) => {
    if (item.tag === 'e') return event.id === item.value;
    if (!address || event.kind !== address.kind || tagValue(event, 'd') !== address.dTag) {
      return false;
    }
    return address.kind === WIKI_KIND || event.pubkey === address.pubkey;
  });
  return matches.reduce<ListEvent | undefined>(
    (newest, e) => (!newest || e.created_at > newest.created_at ? e : newest),
    undefined
  );
}

/** Titles of `items`, by item value; items whose event wasn't found are left out */
export async function fetchItemTitles(
  items: ListItem[],
  relays: string[] = DEFAULT_RELAYS
): Promise<Map<string, string>> {
  const filters = itemFilters(items);
  const titles = new Map<string, string>();
  if (filters.length === 0) return titles;
  const events = await fetchEvents(filters, relays, { waitForAll: true });
  for (const item of items) {
    const event = eventForItem(item, events);
    if (event) titles.set(item.value, eventTitle(event));
  }
  return titles;
}
