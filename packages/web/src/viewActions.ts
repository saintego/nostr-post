/**
 * Plugins' controls for a post (`@nostr-post/plugins/entities` event actions), shown in
 * <nostr-post-view>'s header, e.g. the list plugin's Save for manifests with `lists`
 */

import type { DisplayableEvent, NostrPostManifest } from '@nostr-post/core/types';
import { eventActionsFor } from '@nostr-post/plugins/entities';
import { nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

/** The event's address if it's addressable, else its id (none for an unsigned preview) */
export const eventTarget = (event: DisplayableEvent): string | undefined => {
  const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
  return event.kind >= 30000 && event.kind < 40000 && dTag !== undefined
    ? `${event.kind}:${event.pubkey}:${dTag}`
    : event.id;
};

export function renderEventActions(
  event: DisplayableEvent,
  manifest: NostrPostManifest | undefined
) {
  const target = eventTarget(event);
  if (!manifest || !target) return nothing;
  return eventActionsFor(manifest).map((action) => {
    const tag = unsafeStatic(action.tagName);
    return staticHtml`<${tag} class="view-action" .target=${target} .manifest=${manifest}></${tag}>`;
  });
}
