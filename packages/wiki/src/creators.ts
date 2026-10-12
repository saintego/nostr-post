/**
 * Entity creators: a plugin can offer its own "create" form for the entity
 * types it knows how to fill, e.g. the venue plugin creates a venue's wiki page
 * from an OpenStreetMap search. The wiki-entity picker shows that form for
 * "+ Create" instead of a blank wiki composer.
 *
 * The form is a custom element with `manifest`, `query` and `relays`
 * properties. When it has created or found the entity it dispatches
 * `wiki-entity-created` with `{ dTag, pubkey, displayName }`.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';

export interface EntityCreator {
  /** The form's custom element, e.g. `np-venue-entity-create` */
  tagName: string;
  /** Whether it can create entities of this manifest's type */
  matches: (manifest: NostrPostManifest) => boolean;
}

/** Detail of `wiki-entity-created` */
export interface CreatedEntity {
  dTag: string;
  pubkey: string;
  displayName?: string;
}

// Module state: creators register once when their plugin's web entry loads
const creators: EntityCreator[] = [];

export function registerEntityCreator(creator: EntityCreator): void {
  if (!creators.some((c) => c.tagName === creator.tagName)) creators.push(creator);
}

/** The creator for a manifest's entity type, if a plugin registered one */
export function entityCreatorFor(manifest: NostrPostManifest): EntityCreator | undefined {
  return creators.find((c) => c.matches(manifest));
}
