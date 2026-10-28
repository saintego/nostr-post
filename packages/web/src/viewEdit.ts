/**
 * @nostr-post/web - Inline edit UI helpers for <nostr-post-view>
 *
 * Extracted render functions and submit handler for the inline composer
 * shown when the user clicks "Edit" on an event. Its author republishes an addressable event;
 * anyone else's edit (and any edit of a kind 1 post) is an update comment, which the view applies
 * for the post's editors and shows as a suggestion otherwise.
 */

import type {
  DisplayableEvent,
  EventBundle,
  NostrPostManifest,
  NostrTag,
  UnsignedNostrEvent,
} from '@nostr-post/core/types';
import type { TemplateResult } from 'lit';
import { html, nothing } from 'lit';
import { getUserRelays, signAndPublish } from './signer';
import { extractPrefillFromEvent, formatPrefillAsUpdateComment } from './viewUpdates';

/** User-facing text of the edit button and form */
export interface EditMessages {
  edit: string;
  close: string;
  /** The author's form's submit button: republishes the event */
  save: string;
  saving: string;
  /** Above the form when the editor isn't the author: the changes become an update comment */
  suggestHint: string;
  /** The form's submit button then */
  suggestSubmit: string;
  suggestSubmitting: string;
}

export const DEFAULT_EDIT_MESSAGES: EditMessages = {
  edit: 'Edit',
  close: 'Close',
  save: 'Publish the changes',
  saving: 'Publishing...',
  suggestHint:
    "You didn't publish this, so your changes go out as a comment: applied where you're one of its editors, shown as a suggestion otherwise.",
  suggestSubmit: 'Suggest the changes',
  suggestSubmitting: 'Sending...',
};

export interface EditState {
  showInlineComposer: boolean;
  /** The editor's pubkey once known ('' without a signer) */
  editPubkey: string | undefined;
  effectiveManifest: NostrPostManifest | undefined;
  onComposerClose: () => void;
  onError: (message: string) => void;
  messages: EditMessages;
}

export function renderEditButton(
  event: DisplayableEvent,
  editable: boolean | undefined,
  showInlineComposer: boolean,
  onEditRequest: (event: DisplayableEvent) => void,
  messages: EditMessages = DEFAULT_EDIT_MESSAGES
): TemplateResult | typeof nothing {
  if (!editable) return nothing;
  return html`
    <button type="button" class="view-edit-button" @click=${() => onEditRequest(event)}>
      ${showInlineComposer ? messages.close : messages.edit}
    </button>
  `;
}

const isAddressableKind = (kind: number): boolean => kind >= 30000 && kind < 40000;

const addressOf = (event: DisplayableEvent): string =>
  `${event.kind}:${event.pubkey}:${event.tags.find((t) => t[0] === 'd')?.[1] ?? ''}`;

export function renderInlineComposer(
  event: DisplayableEvent,
  state: EditState
): TemplateResult | typeof nothing {
  if (!state.showInlineComposer) return nothing;

  const { effectiveManifest: manifest, editPubkey, onComposerClose, messages: m } = state;
  // Who edits decides how: wait for the signer's answer
  if (editPubkey === undefined) return nothing;
  const dTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1];
  const prefill = manifest ? extractPrefillFromEvent(event, manifest) : undefined;
  const matchingFormat = manifest?.publishFormats?.find((f) => f.kinds.includes(event.kind));

  // Only the author's key can replace an addressable event
  if (isAddressableKind(event.kind) && editPubkey === event.pubkey) {
    return html`
      <div class="view-inline-composer">
        <nostr-post-composer
          .manifest=${manifest}
          .dTag=${dTag}
          .prefill=${prefill}
          .defaultFormatId=${matchingFormat?.id}
          .messages=${{ submit: m.save, submitting: m.saving }}
          auto-publish
          @nostr-post-published=${() => onComposerClose()}
        ></nostr-post-composer>
      </div>
    `;
  }

  // Kind 1, or someone else's edit: the full manifest editor pre-filled with current values.
  // On submit, compute a diff and publish it as a kind-1 update-comment reply.
  const isAuthor = editPubkey === event.pubkey;
  return html`
    <div class="view-inline-composer">
      ${isAuthor ? nothing : html`<p class="view-edit-hint">${m.suggestHint}</p>`}
      <nostr-post-composer
        .manifest=${manifest}
        .prefill=${prefill}
        .pubkey=${editPubkey || undefined}
        .defaultFormatId=${matchingFormat?.id}
        .messages=${isAuthor ? { submit: m.save, submitting: m.saving } : { submit: m.suggestSubmit, submitting: m.suggestSubmitting }}
        @nostr-post-submit=${(e: Event) => {
          void handleInlineEditSubmit(e, event, prefill ?? {}, state);
        }}
      ></nostr-post-composer>
    </div>
  `;
}

export async function handleInlineEditSubmit(
  e: Event,
  originalEvent: DisplayableEvent,
  originalPrefill: Record<string, unknown>,
  state: EditState
): Promise<void> {
  const { effectiveManifest: manifest, onComposerClose, onError } = state;
  const eventId = originalEvent.id;
  if (!manifest || !eventId) return;

  const newValues =
    (e as CustomEvent<{ bundle: EventBundle }>).detail.bundle.metadata?.sourceForm ?? {};
  const updateContent = formatPrefillAsUpdateComment(
    manifest,
    originalEvent.kind,
    newValues,
    originalPrefill
  );

  if (!updateContent.trim()) {
    onComposerClose();
    return;
  }

  try {
    const relays = await getUserRelays();
    const unsignedEvent: UnsignedNostrEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: '',
      content: updateContent,
      tags: [
        ['e', eventId, '', 'root'],
        // An addressable event's comments follow it to its next versions
        ...(isAddressableKind(originalEvent.kind)
          ? [['a', addressOf(originalEvent), '', 'root'] as NostrTag]
          : []),
        ['p', originalEvent.pubkey],
      ],
    };
    await signAndPublish(unsignedEvent, relays);
    onComposerClose();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Failed to publish update');
  }
}
