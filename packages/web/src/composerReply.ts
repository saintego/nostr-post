import type { EventBundle, NostrTag } from '@nostr-post/core/types';
import { html } from 'lit';

export interface ReplyTarget {
  replyToEventId?: string;
  replyToPubkey?: string;
  rootEventId?: string;
  rootPubkey?: string;
}

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

export const applyReplyTargetToBundle = (bundle: EventBundle, target: ReplyTarget): EventBundle => {
  const replyTags = buildReplyTags(target);
  if (replyTags.length === 0 || bundle.events.length === 0) {
    return bundle;
  }

  const [primaryEvent, ...restEvents] = bundle.events;

  return {
    ...bundle,
    events: [{ ...primaryEvent, tags: [...primaryEvent.tags, ...replyTags] }, ...restEvents],
  };
};

export const hasReplyTarget = (target: ReplyTarget): boolean => {
  return !!(
    target.replyToEventId ||
    target.replyToPubkey ||
    target.rootEventId ||
    target.rootPubkey
  );
};

export const updateReplyTargetValue = (value: string): string | undefined => {
  return value.trim() === '' ? undefined : value.trim();
};

export const renderReplyTargetPanel = ({
  target,
  readonly,
  onUpdate,
}: {
  target: ReplyTarget;
  readonly: boolean;
  onUpdate: (field: keyof ReplyTarget, value: string) => void;
}) => {
  const label = readonly ? 'Reply Context' : 'Reply Context (editable)';

  return html`
    <div class="reply-target-panel">
      <div class="reply-target-title">${label}</div>
      <div class="reply-target-grid">
        <label class="reply-target-field">
          <span>Reply to event id</span>
          <input
            type="text"
            .value=${target.replyToEventId ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('replyToEventId', (e.target as HTMLInputElement).value)}
            placeholder="Parent event id"
          />
        </label>
        <label class="reply-target-field">
          <span>Reply to pubkey</span>
          <input
            type="text"
            .value=${target.replyToPubkey ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('replyToPubkey', (e.target as HTMLInputElement).value)}
            placeholder="Parent author pubkey"
          />
        </label>
        <label class="reply-target-field">
          <span>Root event id</span>
          <input
            type="text"
            .value=${target.rootEventId ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('rootEventId', (e.target as HTMLInputElement).value)}
            placeholder="Thread root event id"
          />
        </label>
        <label class="reply-target-field">
          <span>Root pubkey</span>
          <input
            type="text"
            .value=${target.rootPubkey ?? ''}
            ?readonly=${readonly}
            @input=${(e: Event) => onUpdate('rootPubkey', (e.target as HTMLInputElement).value)}
            placeholder="Thread root pubkey"
          />
        </label>
      </div>
    </div>
  `;
};
