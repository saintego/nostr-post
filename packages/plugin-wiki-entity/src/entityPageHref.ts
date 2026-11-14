/**
 * @nostr-post/plugin-wiki-entity - Where an entity's own page opens
 *
 * A post's view lists its entities (a gig's performers) and opens their pages in place. An app
 * with a page of its own for them (the gigs app's musician page, with its gigs and photos) says
 * where it is with `setEntityPageHref`; the view then links each page there. No DOM dependencies.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { WikiEntityData } from './core';

/** An entity's page link in the app, for its type's manifest; undefined for none */
export type EntityPageHref = (
  entity: WikiEntityData,
  manifest: NostrPostManifest | undefined
) => string | undefined;

// Module state: the app's page links, set once at start
let pageHref: EntityPageHref | undefined;

/** Sets where entities' pages open in the app (undefined: nowhere, only in place) */
export function setEntityPageHref(href: EntityPageHref | undefined): void {
  pageHref = href;
}

/** The app's link to an entity's page, if it has one */
export const entityPageHref = (
  entity: WikiEntityData,
  manifest: NostrPostManifest | undefined
): string | undefined => pageHref?.(entity, manifest);
