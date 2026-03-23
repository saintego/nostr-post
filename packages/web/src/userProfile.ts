import { fetchEvents } from './signer';
import type { SignedEvent } from './signer';

export type NostrProfile = {
  name?: string;
  display_name?: string;
  picture?: string;
};

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

export const loadProfilesForEvents = async (
  events: SignedEvent[],
  profileMap: Record<string, NostrProfile>,
  relays?: string[]
): Promise<Record<string, NostrProfile>> => {
  const pubkeys = Array.from(new Set(events.map((event) => event.pubkey))).filter(Boolean);
  if (pubkeys.length === 0) return profileMap;

  const missing = pubkeys.filter((pubkey) => !profileMap[pubkey]);
  if (missing.length === 0) return profileMap;

  try {
    const profileEvents = await fetchEvents(
      {
        kinds: [0],
        authors: missing,
        limit: missing.length,
      },
      relays
    );

    const nextProfiles = { ...profileMap };
    for (const profileEvent of profileEvents) {
      try {
        const parsed = JSON.parse(profileEvent.content) as NostrProfile;
        nextProfiles[profileEvent.pubkey] = parsed;
      } catch {
        // Ignore malformed metadata profiles.
      }
    }

    return nextProfiles;
  } catch (error) {
    console.warn('Failed to load author profiles:', error);
    return profileMap;
  }
};

export const fetchAuthorProfile = async ({
  pubkey,
  cache,
}: {
  pubkey: string;
  cache: Map<string, NostrProfile>;
}): Promise<NostrProfile | undefined> => {
  const cached = cache.get(pubkey);
  if (cached) return cached;

  try {
    const profileEvents = await fetchEvents({
      kinds: [0],
      authors: [pubkey],
      limit: 1,
    });
    const profileEvent = profileEvents[0];
    if (!profileEvent?.content) return undefined;

    const parsed = JSON.parse(profileEvent.content) as NostrProfile;
    cache.set(pubkey, parsed);
    return parsed;
  } catch {
    return undefined;
  }
};
