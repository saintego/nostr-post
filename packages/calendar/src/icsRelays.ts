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

/** The `.ics` of the calendar events at `addresses` (their newest versions) */
export async function fetchEventsAsIcs(
  addresses: string[],
  options: { relays?: string[]; name?: string } = {}
): Promise<string> {
  const events = await fetchEvents(
    calendarEventFilters(addresses),
    options.relays ?? DEFAULT_RELAYS,
    { waitForAll: true }
  );
  return eventsToIcs(latestByAddress(events), options.name);
}
