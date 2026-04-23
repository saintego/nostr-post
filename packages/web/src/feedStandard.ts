import { filterLatestAddressableEvents } from '@nostr-post/core/nip33';
import {
  type NostrPostManifest,
  STANDARD_KIND1_POST_MANIFEST,
  type UnsignedNostrEvent,
} from '@nostr-post/core/types';
import type { SignedEvent } from './signer';

export interface ReplyTarget {
  replyToEventId?: string;
  replyToPubkey?: string;
  rootEventId?: string;
  rootPubkey?: string;
}

export interface FeedThread {
  root: SignedEvent;
  replies: SignedEvent[];
  reactions: SignedEvent[];
}

export const DEFAULT_REACTION_OPTIONS = ['+', '❤️', '🔥', '😂'];

export const DEFAULT_COMMENT_MANIFEST: NostrPostManifest = STANDARD_KIND1_POST_MANIFEST;

const getFirstTagValue = (event: SignedEvent, tagName: string): string | undefined => {
  return event.tags.find((tag) => tag[0] === tagName)?.[1];
};

const getRootTagValue = (event: SignedEvent): string | undefined => {
  const rootTag = event.tags.find((tag) => tag[0] === 'e' && tag[3] === 'root');
  if (rootTag?.[1]) return rootTag[1];
  return getFirstTagValue(event, 'e');
};

const isReactionEvent = (event: SignedEvent): boolean => event.kind === 7;

const isReplyEvent = (event: SignedEvent): boolean => event.kind === 1 && !!getRootTagValue(event);

const insertUniqueEvent = (events: SignedEvent[], nextEvent: SignedEvent): SignedEvent[] => {
  if (events.some((event) => event.id === nextEvent.id)) return events;
  return [nextEvent, ...events];
};

const sortByCreatedAtDescending = (left: SignedEvent, right: SignedEvent) => {
  return right.created_at - left.created_at;
};

const sortByCreatedAtAscending = (left: SignedEvent, right: SignedEvent) => {
  return left.created_at - right.created_at;
};

export const mergeUniqueEvents = (
  events: SignedEvent[],
  nextEvents: SignedEvent[]
): SignedEvent[] => {
  return nextEvents.reduce(insertUniqueEvent, events).sort(sortByCreatedAtDescending);
};

export const buildReplyTarget = (event: SignedEvent, rootEvent?: SignedEvent): ReplyTarget => {
  const resolvedRootId = getRootTagValue(event) ?? rootEvent?.id ?? event.id;
  return {
    replyToEventId: event.id,
    replyToPubkey: event.pubkey,
    rootEventId: resolvedRootId,
    rootPubkey: rootEvent?.pubkey ?? (resolvedRootId === event.id ? event.pubkey : undefined),
  };
};

export const buildReactionEvent = (
  event: SignedEvent,
  reaction: string,
  pubkey: string
): UnsignedNostrEvent => {
  return {
    kind: 7,
    created_at: Math.floor(Date.now() / 1000),
    pubkey,
    content: reaction,
    tags: [
      ['e', event.id],
      ['p', event.pubkey],
    ],
  };
};

export const buildThreads = (
  primaryEvents: SignedEvent[],
  interactionEvents: SignedEvent[]
): FeedThread[] => {
  const dedupedPrimary = filterLatestAddressableEvents(primaryEvents);
  const allEvents = [...dedupedPrimary, ...interactionEvents];
  const primaryIds = new Set(dedupedPrimary.map((event) => event.id));
  const repliesByRoot = new Map<string, SignedEvent[]>();
  const reactionsByTarget = new Map<string, SignedEvent[]>();

  for (const event of allEvents) {
    if (isReactionEvent(event)) {
      const targetId = getFirstTagValue(event, 'e');
      if (!targetId) continue;
      const reactions = reactionsByTarget.get(targetId) ?? [];
      reactions.push(event);
      reactionsByTarget.set(targetId, reactions);
      continue;
    }

    if (!isReplyEvent(event)) continue;

    const rootId = getRootTagValue(event);
    if (!rootId || rootId === event.id || !primaryIds.has(rootId)) continue;

    const replies = repliesByRoot.get(rootId) ?? [];
    if (!replies.some((reply) => reply.id === event.id)) {
      replies.push(event);
      repliesByRoot.set(rootId, replies);
    }
  }

  const roots = dedupedPrimary
    .filter((event) => !isReactionEvent(event))
    .filter((event) => {
      const rootId = getRootTagValue(event);
      return !rootId || rootId === event.id || !primaryIds.has(rootId);
    })
    .sort(sortByCreatedAtDescending);

  return roots.map((root) => ({
    root,
    replies: (repliesByRoot.get(root.id) ?? []).sort(sortByCreatedAtAscending),
    reactions: (reactionsByTarget.get(root.id) ?? []).sort(sortByCreatedAtDescending),
  }));
};

export const summarizeReactions = (reactions: SignedEvent[]): Array<[string, number]> => {
  const counts = new Map<string, number>();

  for (const reaction of reactions) {
    const value = reaction.content.trim() || '+';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
};
