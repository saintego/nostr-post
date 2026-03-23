import { parseManifestATag } from '@nostr-post/core/nip78';
import type { NostrTag } from '@nostr-post/core/types';
import type { SignedEvent } from '@nostr-post/react';

export interface ReplyTarget {
  replyToEventId?: string;
  replyToPubkey?: string;
  rootEventId?: string;
  rootPubkey?: string;
}

export const REACTION_OPTIONS = ['👍', '❤️', '🔥', '😂'];

export const STORAGE_KEY = 'nostr-post-manifest-creator-events';

export const loadCachedEvents = (): SignedEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const cacheEvents = (events: SignedEvent[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore storage errors
  }
};

const uniqueValues = (values: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

export const buildReplyTags = (target: ReplyTarget): NostrTag[] => {
  if (!target.replyToEventId) return [];
  const rootEventId = target.rootEventId ?? target.replyToEventId;
  const tags: NostrTag[] = [['e', rootEventId, '', 'root']];
  if (target.replyToEventId !== rootEventId) {
    tags.push(['e', target.replyToEventId, '', 'reply']);
  }
  for (const pubkey of uniqueValues([target.replyToPubkey, target.rootPubkey])) {
    tags.push(['p', pubkey]);
  }
  return tags;
};

const getRootTagId = (event: SignedEvent): string | undefined =>
  event.tags.find((tag) => tag[0] === 'e' && tag.length >= 4 && tag[3] === 'root')?.[1];

export const buildReplyTargetFromEvent = (event: SignedEvent): ReplyTarget => {
  const rootTag = event.tags.find((tag) => tag[0] === 'e' && tag[3] === 'root');
  return {
    replyToEventId: event.id,
    replyToPubkey: event.pubkey,
    rootEventId: rootTag?.[1] ?? event.id,
    rootPubkey: rootTag ? undefined : event.pubkey,
  };
};

export const applyReplyTargetToPreviewEvents = (
  events: SignedEvent[],
  target: ReplyTarget
): SignedEvent[] => {
  const replyTags = buildReplyTags(target);
  if (replyTags.length === 0 || events.length === 0) return events;
  const [primaryEvent, ...rest] = events;
  return [{ ...primaryEvent, tags: [...primaryEvent.tags, ...replyTags] }, ...rest];
};

export const groupEventPosts = (
  events: SignedEvent[]
): { primary: SignedEvent; linked: SignedEvent[] }[] => {
  // Split events into those with a root 'e' tag (replies) and those without
  const eventIds = new Set(events.map((e) => e.id));
  const linkedByPrimary = new Map<string, SignedEvent[]>();
  const orphanReplies: SignedEvent[] = [];

  for (const event of events) {
    const primaryId = getRootTagId(event);
    if (!primaryId) continue;
    if (!eventIds.has(primaryId)) {
      orphanReplies.push(event);
      continue;
    }
    const linked = linkedByPrimary.get(primaryId) ?? [];
    linked.push(event);
    linkedByPrimary.set(primaryId, linked);
  }

  const primaryIds = new Set<string>();
  const primaries: SignedEvent[] = [];

  for (const event of events) {
    if (getRootTagId(event) || primaryIds.has(event.id)) continue;
    primaryIds.add(event.id);
    primaries.push(event);
  }

  for (const event of orphanReplies) {
    if (primaryIds.has(event.id)) continue;
    primaryIds.add(event.id);
    primaries.push(event);
  }

  return primaries.map((primary) => ({
    primary,
    linked: linkedByPrimary.get(primary.id) ?? [],
  }));
};

export const hasManifestATag = (event: SignedEvent): boolean =>
  event.tags.some((t) => t[0] === 'a' && parseManifestATag(t[1]) !== undefined);
