import { buildReactionEvent, mergeUniqueEvents } from './feedStandard';
import type { SignedEvent } from './signer';
import { getPublicKey, getUserRelays, signAndPublish } from './signer';
import type { NostrProfile } from './userProfile';
import { loadProfilesForEvents } from './userProfile';

export interface ReactionSummaryWithAuthors {
  reaction: string;
  count: number;
  authors: string[];
}

export const summarizeReactionsWithAuthors = (
  reactions: SignedEvent[],
  resolveAuthorName: (pubkey: string) => string
): ReactionSummaryWithAuthors[] => {
  const grouped = new Map<string, { count: number; authors: Set<string> }>();

  for (const reaction of reactions) {
    const value = reaction.content.trim() || '+';
    const existing = grouped.get(value) ?? { count: 0, authors: new Set<string>() };
    existing.count += 1;
    existing.authors.add(resolveAuthorName(reaction.pubkey));
    grouped.set(value, existing);
  }

  return Array.from(grouped.entries())
    .map(([reaction, data]) => ({
      reaction,
      count: data.count,
      authors: Array.from(data.authors),
    }))
    .sort((left, right) => right.count - left.count);
};

export const publishReaction = async ({
  event,
  reaction,
  relays,
  interactionEvents,
  profileMap,
}: {
  event: SignedEvent;
  reaction: string;
  relays?: string[];
  interactionEvents: SignedEvent[];
  profileMap: Record<string, NostrProfile>;
}): Promise<{
  signedEvent: SignedEvent;
  interactionEvents: SignedEvent[];
  profileMap: Record<string, NostrProfile>;
}> => {
  const pubkey = await getPublicKey();
  const resolvedRelays = relays ?? (await getUserRelays());
  const unsignedEvent = buildReactionEvent(event, reaction, pubkey);
  const { signedEvent } = await signAndPublish(unsignedEvent, resolvedRelays);

  return {
    signedEvent,
    interactionEvents: mergeUniqueEvents(interactionEvents, [signedEvent]),
    profileMap: await loadProfilesForEvents([signedEvent], profileMap, relays),
  };
};
