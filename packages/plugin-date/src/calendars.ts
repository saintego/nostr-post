/**
 * @nostr-post/plugin-date - Calendars (NIP-52 kind 31924)
 *
 * A calendar is a named list of calendar events (`a` tags), anyone's events. Creating and
 * editing them is @nostr-post/plugin-list's (`CALENDAR_LISTS`); this module reads a
 * calendar's events, e.g. for an agenda. Events load by address, so all-day events of
 * clients that write no `D` day tags are found too. No DOM dependencies.
 */

import { getFieldTargets } from '@nostr-post/core/manifestMappings';
import type { NostrPostManifest } from '@nostr-post/core/types';
import { CALENDAR_KIND, currentLists, type ListRelayOptions } from '@nostr-post/plugin-list';
import { DEFAULT_RELAYS, type FetchFilter, fetchEvents } from '@nostr-post/signer';
import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from './core';
import { isCalendarEventAddress } from './rsvp';

/** Whether a manifest publishes calendar events (kind 31922 or 31923) */
export const publishesCalendarEvents = (manifest: NostrPostManifest): boolean =>
  manifest.fields.some((field) =>
    getFieldTargets(field).some(
      (target) => target.kind === ALL_DAY_EVENT_KIND || target.kind === TIMED_EVENT_KIND
    )
  );

const ADDRESS_PATTERN = /^(\d+):([0-9a-f]{64}):(.*)$/;

/** Relay filters for events by address: one per kind and author, with their d-tags */
export const calendarEventFilters = (addresses: string[]): FetchFilter[] => {
  const groups = new Map<string, { kind: number; pubkey: string; dTags: string[] }>();
  for (const address of addresses) {
    const match = ADDRESS_PATTERN.exec(address);
    if (!match) continue;
    const [, kind = '', pubkey = '', dTag = ''] = match;
    const key = `${kind}:${pubkey}`;
    const group = groups.get(key) ?? { kind: Number(kind), pubkey, dTags: [] };
    if (!group.dTags.includes(dTag)) group.dTags.push(dTag);
    groups.set(key, group);
  }
  return [...groups.values()].map(({ kind, pubkey, dTags }) => ({
    kinds: [kind],
    authors: [pubkey],
    '#d': dTags,
  }));
};

/**
 * The calendar event addresses in the calendar at `address` (`31924:<pubkey>:<d-tag>`), its
 * newest version; empty when it isn't found or was deleted
 */
export async function fetchCalendarItems(
  address: string,
  options: ListRelayOptions = {}
): Promise<string[]> {
  const match = ADDRESS_PATTERN.exec(address);
  if (!match || Number(match[1]) !== CALENDAR_KIND) return [];
  const [, , pubkey = '', dTag = ''] = match;
  const events = await fetchEvents(
    [
      { kinds: [CALENDAR_KIND], authors: [pubkey], '#d': [dTag] },
      { kinds: [5], authors: [pubkey], '#a': [address] },
    ],
    options.relays ?? DEFAULT_RELAYS,
    { waitForAll: true }
  );
  const calendar = currentLists(events).find((list) => list.address === address);
  return (calendar?.items ?? [])
    .filter((item) => item.tag === 'a' && isCalendarEventAddress(item.value))
    .map((item) => item.value);
}
