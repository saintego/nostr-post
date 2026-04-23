/**
 * @nostr-post/web - Inline edit UI helpers for <nostr-post-view>
 *
 * Extracted render functions and submit handler for the inline composer
 * shown when the user clicks "Edit" on an event.
 */

import type {
  DisplayableEvent,
  EventBundle,
  NostrPostManifest,
  UnsignedNostrEvent,
} from '@nostr-post/core/types';
import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { getUserRelays, signAndPublish } from './signer';
import { extractPrefillFromEvent, formatPrefillAsUpdateComment } from './viewUpdates';

export interface EditState {
  showInlineComposer: boolean;
  editPubkey: string | undefined;
  effectiveManifest: NostrPostManifest | undefined;
  onComposerClose: () => void;
  onError: (message: string) => void;
}

export function renderEditButton(
  event: DisplayableEvent,
  editable: boolean | undefined,
  showInlineComposer: boolean,
  onEditRequest: (event: DisplayableEvent) => void
): TemplateResult | typeof nothing {
  if (!editable) return nothing;
  return html`
    <button type="button" class="view-edit-button" @click=${() => onEditRequest(event)}>
      ${showInlineComposer ? 'Close' : 'Edit'}
    </button>
  `;
}

export function renderInlineComposer(
  event: DisplayableEvent,
  state: EditState
): TemplateResult | typeof nothing {
  if (!state.showInlineComposer) return nothing;

  const { effectiveManifest: manifest, editPubkey, onComposerClose } = state;
  const isAddressable = event.kind >= 30000 && event.kind < 40000;
  const dTag = event.tags.find((t: string[]) => t[0] === 'd')?.[1];
  const prefill = manifest ? extractPrefillFromEvent(event, manifest) : undefined;
  const matchingFormat = manifest?.publishFormats?.find((f) => f.kinds.includes(event.kind));

  if (isAddressable) {
    return html`
      <div class="view-inline-composer">
        <nostr-post-composer
          .manifest=${manifest}
          .dTag=${dTag}
          .prefill=${prefill}
          .defaultFormatId=${matchingFormat?.id}
          auto-publish
          @nostr-post-published=${() => onComposerClose()}
        ></nostr-post-composer>
      </div>
    `;
  }

  // Non-addressable (kind 1): show full manifest editor pre-filled with current values.
  // On submit, compute a diff and publish it as a kind-1 update-comment reply.
  return html`
    <div class="view-inline-composer">
      <nostr-post-composer
        .manifest=${manifest}
        .prefill=${prefill}
        .pubkey=${editPubkey}
        .defaultFormatId=${matchingFormat?.id}
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
        ['p', originalEvent.pubkey],
      ],
    };
    await signAndPublish(unsignedEvent, relays);
    onComposerClose();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Failed to publish update');
  }
}
