/**
 * One post of <nostr-post-feed> with its reactions, actions, reply composer and replies.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  type FeedThread,
  type ReplyTarget,
  summarizeReactionsWithAuthors,
} from '@nostr-post/posts';
import { npExportParts } from '@nostr-post/ui';
import { html, type TemplateResult } from 'lit';
import { renderReactionSummary } from './feedActions';
import { isReplyComposerOpen, renderReplies } from './feedComments';
import type { PostMenuMessages } from './postMenuMessages';
import type { SignedEvent } from './signer';

export interface FeedThreadContext {
  manifest?: NostrPostManifest;
  commentManifest?: NostrPostManifest;
  excludeFields?: string[];
  editable?: boolean;
  showKind?: boolean;
  showTags?: boolean;
  /** Besides the author and the organizers it names: whose update comments apply */
  trustedEditors?: string[];
  /** Posts without their "⋯" menu */
  hideMenu?: boolean;
  menuMessages?: Partial<PostMenuMessages>;
  activeReplyTarget?: ReplyTarget;
  /** The reply box's send button (`FeedMessages.sendComment`) */
  sendComment?: string;
  displayName: (pubkey: string) => string;
  renderEventActions: (event: SignedEvent, rootEvent?: SignedEvent) => TemplateResult;
  onCommentPublished: (event: Event) => void;
}

/**
 * A feed's layout (`<nostr-post-feed .layout>`): renders the loaded threads, e.g. under day
 * headings, with `renderFeedThread` for each. `loading`: newer posts are on their way (the
 * threads are the previous ones until then).
 */
export type FeedLayout = (
  threads: FeedThread[],
  ctx: FeedThreadContext,
  state: { loading: boolean }
) => TemplateResult;

export const renderFeedThread = (thread: FeedThread, ctx: FeedThreadContext): TemplateResult => {
  const reactionSummaryWithAuthors = summarizeReactionsWithAuthors(
    thread.reactions,
    ctx.displayName
  );
  const isReplyComposerVisible = isReplyComposerOpen(ctx.activeReplyTarget, thread.root.id);

  return html`
    <div class="event-item">
      <nostr-post-view
        exportparts=${npExportParts}
        .event=${thread.root}
        .manifest=${ctx.manifest}
        .interactionEvents=${thread.replies}
        .excludeFields=${ctx.excludeFields}
        ?editable=${ctx.editable}
        .showKind=${ctx.showKind}
        .showTags=${ctx.showTags}
        .trustedEditors=${ctx.trustedEditors}
        ?hide-menu=${ctx.hideMenu}
        .menuMessages=${ctx.menuMessages}
      ></nostr-post-view>
      ${renderReactionSummary(reactionSummaryWithAuthors)}
      ${ctx.renderEventActions(thread.root, thread.root)}
      ${
        isReplyComposerVisible
          ? html`
            <div class="reply-composer">
              <nostr-post-composer
                auto-publish
                hide-header
                .schedule=${false}
                .messages=${ctx.sendComment ? { submit: ctx.sendComment } : undefined}
                .manifest=${ctx.commentManifest}
                .excludeFields=${ctx.excludeFields}
                .replyToEventId=${ctx.activeReplyTarget?.replyToEventId}
                .replyToPubkey=${ctx.activeReplyTarget?.replyToPubkey}
                .rootEventId=${ctx.activeReplyTarget?.rootEventId}
                .rootPubkey=${ctx.activeReplyTarget?.rootPubkey}
                .rootAddress=${ctx.activeReplyTarget?.rootAddress}
                @nostr-post-published=${ctx.onCommentPublished}
              ></nostr-post-composer>
            </div>
          `
          : ''
      }
      ${renderReplies(
        thread.root,
        thread.replies,
        ctx.commentManifest,
        ctx.excludeFields,
        ctx.renderEventActions,
        ctx
      )}
    </div>
  `;
};
