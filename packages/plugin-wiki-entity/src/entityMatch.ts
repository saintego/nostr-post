/**
 * @nostr-post/plugin-wiki-entity - Confirming pages found automatically
 *
 * `resolveEntities` finds an entity's page by its links or its name (e.g. a performer an AI read
 * from a post), but a name can be someone else's and a link can be wrong. Such a value carries
 * `match` until the user checks the page: "It's them" keeps the page (`confirmMatch`), "Not them"
 * makes it the unlinked value it was, with its name and links (`rejectMatch`), so it can get a
 * page of its own.
 */

import type { WikiEntityData } from './core';

/** Whether the value's page was found automatically and the user hasn't confirmed it */
export const isUnconfirmed = (entity: WikiEntityData): boolean => Boolean(entity.match);

/** The page is this entity's: the value keeps it, without the mark */
export const confirmMatch = (entity: WikiEntityData): WikiEntityData => {
  const { match: _, ...confirmed } = entity;
  return confirmed;
};

/** The page isn't this entity's: the unlinked value it was (its name and links) */
export const rejectMatch = (entity: WikiEntityData): WikiEntityData =>
  entity.match?.instead ?? entity;
