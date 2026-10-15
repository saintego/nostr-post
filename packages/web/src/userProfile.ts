/**
 * Author names for <nostr-post-view> and <nostr-post-feed>. Profiles are loaded and
 * cached by the signer (`fetchProfile`, `fetchProfiles`); this module only formats them.
 */

import { fetchProfiles, type NostrProfile, type SignedEvent } from './signer';

export type { NostrProfile } from './signer';

export const truncatePubkey = (
  pubkey: string,
  options?: {
    unknownLabel?: string;
    head?: number;
    tail?: number;
  }
): string => {
  const unknownLabel = options?.unknownLabel ?? 'Unknown';
  const head = options?.head ?? 8;
  const tail = options?.tail ?? 8;

  if (!pubkey) return unknownLabel;
  if (pubkey.length <= head + tail) return pubkey;
  return `${pubkey.slice(0, head)}...${pubkey.slice(-tail)}`;
};

export const authorDisplayName = (profile: NostrProfile | undefined, pubkey: string): string => {
  return profile?.display_name || profile?.name || truncatePubkey(pubkey);
};

export const displayNameForPubkey = (
  profileMap: Record<string, NostrProfile>,
  pubkey: string
): string => {
  return (
    profileMap[pubkey]?.display_name ||
    profileMap[pubkey]?.name ||
    truncatePubkey(pubkey, { unknownLabel: 'unknown', head: 6, tail: 6 })
  );
};

/** Adds the profiles of `events`' authors to `profileMap` (a new object) */
export const loadProfilesForEvents = async (
  events: SignedEvent[],
  profileMap: Record<string, NostrProfile>,
  relays?: string[]
): Promise<Record<string, NostrProfile>> => {
  const missing = [...new Set(events.map((event) => event.pubkey))].filter(
    (pubkey) => pubkey && !profileMap[pubkey]
  );
  if (missing.length === 0) return profileMap;
  const found = await fetchProfiles(missing, { relays });
  return found.size > 0 ? { ...profileMap, ...Object.fromEntries(found) } : profileMap;
};
