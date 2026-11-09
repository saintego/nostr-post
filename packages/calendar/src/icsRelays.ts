/**
 * @nostr-post/plugin-date - calendar events from relays, as `.ics`
 *
 * Through the signer's `fetchEvents`, so test mode and the configured relays apply.
 * No DOM dependencies.
 */

import { DEFAULT_RELAYS, fetchEvents } from '@nostr-post/signer';
import { latestByAddress } from './agenda';
import { calendarEventFilters } from './calendars';
import { eventsToIcs } from './ics';
import { type IcsRef, pageName, roleAddresses } from './icsText';

/** A filter per address (`kind:pubkey:d-tag`) */
const addressFilters = (addresses: string[]) =>
  addresses.flatMap((address) => {
    const [kind = '', pubkey = '', ...rest] = address.split(':');
    return Number(kind)
      ? [{ kinds: [Number(kind)], authors: [pubkey], '#d': [rest.join(':')] }]
      : [];
  });

/**
 * The names (titles without the type in brackets) and web links (`r` tags) of the pages at
 * `addresses`, e.g. an event's performers; pages not found are left out
 */
export async function fetchIcsRefs(
  addresses: string[],
  relays: string[] = DEFAULT_RELAYS
): Promise<Map<string, IcsRef>> {
  if (addresses.length === 0) return new Map();
  const pages = await fetchEvents(addressFilters(addresses), relays, { waitForAll: true }).catch(
    () => []
  );
  return new Map(
    latestByAddress(pages).flatMap((page): [string, IcsRef][] => {
      const tag = (name: string) => page.tags.filter((t) => t[0] === name).map((t) => t[1] ?? '');
      const name = pageName(tag('title')[0] ?? '');
      const address = `${page.kind}:${page.pubkey}:${tag('d')[0] ?? ''}`;
      return name ? [[address, { name, links: tag('r') }]] : [];
    })
  );
}

/**
 * The `.ics` of the calendar events at `addresses` (their newest versions), with the pages
 * their role lines link as names (`fetchIcsRefs`)
 */
export async function fetchEventsAsIcs(
  addresses: string[],
  options: { relays?: string[]; name?: string } = {}
): Promise<string> {
  const relays = options.relays ?? DEFAULT_RELAYS;
  const events = latestByAddress(
    await fetchEvents(calendarEventFilters(addresses), relays, { waitForAll: true })
  );
  const refs = await fetchIcsRefs(
    events.flatMap((e) => roleAddresses(e.content ?? '')),
    relays
  );
  return eventsToIcs(events, options.name, refs);
}
