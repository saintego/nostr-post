/**
 * @nostr-post/plugin-date - RSVPs (NIP-52 kind 31925)
 *
 * Answers to a calendar event: going, maybe or can't go. One RSVP per person and event: its
 * `d` tag is the event's address, so a new answer replaces the old one. No DOM dependencies.
 */

import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from '@nostr-post/plugin-date';

export const RSVP_KIND = 31925;

export type RsvpStatus = 'accepted' | 'tentative' | 'declined';

export const RSVP_STATUSES: readonly RsvpStatus[] = ['accepted', 'tentative', 'declined'];

/** An RSVP before signing */
export interface UnsignedRsvp {
  kind: number;
  pubkey: string;
  created_at: number;
  tags: [string, ...string[]][];
  content: string;
}

/** The parts of an RSVP event that are read (a signed Nostr event fits) */
export interface RsvpLike {
  pubkey: string;
  created_at: number;
  tags: string[][];
}

export interface RsvpSummary {
  counts: Record<RsvpStatus, number>;
  /** Each person's newest answer */
  byPubkey: Map<string, RsvpStatus>;
}

const ADDRESS_PATTERN = /^(\d+):([0-9a-f]{64}):(.*)$/;

/** Whether an address (`kind:pubkey:d`) is a calendar event's */
export const isCalendarEventAddress = (address: string): boolean => {
  const kind = Number(ADDRESS_PATTERN.exec(address)?.[1]);
  return kind === ALL_DAY_EVENT_KIND || kind === TIMED_EVENT_KIND;
};

/**
 * An RSVP to the calendar event at `address`. Going and maybe mark the time as busy (`fb`);
 * NIP-52 leaves `fb` out of declines. `note` becomes the content.
 */
export const rsvpEvent = (
  address: string,
  status: RsvpStatus,
  pubkey: string,
  options: { note?: string; createdAt?: number } = {}
): UnsignedRsvp => {
  const author = ADDRESS_PATTERN.exec(address)?.[2];
  const tags: [string, ...string[]][] = [
    ['d', address],
    ['a', address],
    ['status', status],
  ];
  if (status !== 'declined') tags.push(['fb', 'busy']);
  if (author) tags.push(['p', author]);
  return {
    kind: RSVP_KIND,
    pubkey,
    created_at: options.createdAt ?? Math.floor(Date.now() / 1000),
    tags,
    content: options.note ?? '',
  };
};

/** Relay filter for the RSVPs to calendar events */
export const rsvpFilter = (addresses: string[]): { kinds: number[]; '#a': string[] } => ({
  kinds: [RSVP_KIND],
  '#a': addresses,
});

const isStatus = (value: string | undefined): value is RsvpStatus =>
  RSVP_STATUSES.includes(value as RsvpStatus);

/** Counts of the RSVPs to `address`, each person's newest answer only */
export const summarizeRsvps = (events: RsvpLike[], address: string): RsvpSummary => {
  const newest = new Map<string, { status: RsvpStatus; createdAt: number }>();
  for (const event of events) {
    if (!event.tags.some((tag) => tag[0] === 'a' && tag[1] === address)) continue;
    const status = event.tags.find((tag) => tag[0] === 'status')?.[1];
    if (!isStatus(status)) continue;
    const existing = newest.get(event.pubkey);
    if (!existing || event.created_at > existing.createdAt) {
      newest.set(event.pubkey, { status, createdAt: event.created_at });
    }
  }
  const counts: Record<RsvpStatus, number> = { accepted: 0, tentative: 0, declined: 0 };
  const byPubkey = new Map<string, RsvpStatus>();
  for (const [pubkey, { status }] of newest) {
    counts[status] += 1;
    byPubkey.set(pubkey, status);
  }
  return { counts, byPubkey };
};

/** A summary with one person's answer set (e.g. the user's, just published) */
export const withAnswer = (
  summary: RsvpSummary | undefined,
  pubkey: string,
  status: RsvpStatus
): RsvpSummary => {
  const byPubkey = new Map(summary?.byPubkey);
  byPubkey.set(pubkey, status);
  const counts: Record<RsvpStatus, number> = { accepted: 0, tentative: 0, declined: 0 };
  for (const answer of byPubkey.values()) counts[answer] += 1;
  return { counts, byPubkey };
};

/** Who gave each answer, in the order they answered */
export const peopleByStatus = (summary: RsvpSummary | undefined): Record<RsvpStatus, string[]> => {
  const people: Record<RsvpStatus, string[]> = { accepted: [], tentative: [], declined: [] };
  for (const [pubkey, status] of summary?.byPubkey ?? []) people[status].push(pubkey);
  return people;
};
