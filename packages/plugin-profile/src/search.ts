/**
 * @nostr-post/plugin-profile - finding people
 *
 * By name, through relays that support NIP-50 search of profiles (kind 0). Few relays do, so
 * they're configurable. No DOM dependencies.
 */

import { fetchEvents, type NostrProfile, newestProfiles } from '@nostr-post/signer';

/** Relays searched by default (NIP-50 on kind 0) */
export const DEFAULT_SEARCH_RELAYS = ['wss://relay.nostr.band', 'wss://search.nos.today'];

export interface FoundProfile {
  pubkey: string;
  profile: NostrProfile;
}

/** What a found profile is called: display name, else name, else the start of its key */
export const profileName = (pubkey: string, profile?: NostrProfile): string =>
  profile?.display_name?.trim() || profile?.name?.trim() || `${pubkey.slice(0, 8)}…`;

/**
 * Profiles matching `query`, those whose name starts with it first. Fewer than 2 characters
 * find nothing.
 */
export async function searchProfiles(
  query: string,
  options: { relays?: string[]; limit?: number } = {}
): Promise<FoundProfile[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const events = await fetchEvents(
    { kinds: [0], search: text, limit: options.limit ?? 20 },
    options.relays ?? DEFAULT_SEARCH_RELAYS,
    { waitForAll: true }
  );
  const lower = text.toLowerCase();
  const startsWith = (found: FoundProfile) =>
    profileName(found.pubkey, found.profile).toLowerCase().startsWith(lower) ? 0 : 1;
  return [...newestProfiles(events)]
    .map(([pubkey, profile]) => ({ pubkey, profile }))
    .sort((a, b) => startsWith(a) - startsWith(b));
}
