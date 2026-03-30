import type { NostrPostManifest } from '@nostr-post/core/types';
import { type TemplateResult, html } from 'lit';
import type { ReplyTarget } from './feedStandard';
import { mergeUniqueEvents } from './feedStandard';
import type { SignedEvent } from './signer';
import type { NostrProfile } from './userProfile';
import { loadProfilesForEvents } from './userProfile';

export const extractPublishedEvents = (eventDetail: unknown): SignedEvent[] => {
  if (Array.isArray(eventDetail)) return eventDetail as SignedEvent[];

  if (
    eventDetail &&
    typeof eventDetail === 'object' &&
    'events' in eventDetail &&
    Array.isArray((eventDetail as { events: unknown }).events)
  ) {
    return (eventDetail as { events: SignedEvent[] }).events;
  }

  return [];
};

export const isReplyComposerOpen = (
  activeReplyTarget: ReplyTarget | undefined,
  rootId: string
): boolean => {
  return (
    activeReplyTarget?.replyToEventId !== undefined && activeReplyTarget.rootEventId === rootId
  );
};

export const renderReplies = (
  root: SignedEvent,
  replies: SignedEvent[],
  commentManifest: NostrPostManifest | undefined,
  excludeFields: string[] | undefined,
  renderEventActions: (event: SignedEvent, rootEvent?: SignedEvent) => TemplateResult
): TemplateResult | '' => {
  if (replies.length === 0) return '';

  return html`
    <div class="reply-list">
      <div class="reply-header">Comments</div>
      ${replies.map(
        (reply) => html`
          <div>
            <nostr-post-view
              .event=${reply}
              .manifest=${commentManifest}
              .excludeFields=${excludeFields}
            ></nostr-post-view>
            ${renderEventActions(reply, root)}
          </div>
        `
      )}
    </div>
  `;
};

export const handleCommentPublished = async ({
  detail,
  interactionEvents,
  profileMap,
  relays,
}: {
  detail: unknown;
  interactionEvents: SignedEvent[];
  profileMap: Record<string, NostrProfile>;
  relays?: string[];
}): Promise<{
  publishedEvents: SignedEvent[];
  interactionEvents: SignedEvent[];
  profileMap: Record<string, NostrProfile>;
}> => {
  const publishedEvents = extractPublishedEvents(detail);
  if (publishedEvents.length === 0) {
    return { publishedEvents, interactionEvents, profileMap };
  }

  return {
    publishedEvents,
    interactionEvents: mergeUniqueEvents(interactionEvents, publishedEvents),
    profileMap: await loadProfilesForEvents(publishedEvents, profileMap, relays),
  };
};
