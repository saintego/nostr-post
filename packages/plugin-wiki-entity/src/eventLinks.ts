/**
 * @nostr-post/plugin-wiki-entity - An edited event's links, back to their entities
 *
 * An event keeps its picked entities' links as `i` tags, which can't be told apart by entity, so
 * `resolveFromTags` puts them all on one nameless unlinked value. With the picked pages loaded,
 * each entity gets back the links its page has (and its name), so removing it from the event
 * removes its links too. The other links (e.g. of performers without a page, named in the text)
 * stay on the nameless value.
 */

import { fetchEvents } from '@nostr-post/signer';
import { DEFAULT_WIKI_RELAYS, WIKI_KIND, type WikiEvent } from '@nostr-post/wiki';
import { entityDataOf, type WikiEntityData } from './core';

/** The nameless unlinked value that only keeps an event's links */
const isLinkKeeper = (entity: WikiEntityData): boolean =>
  Boolean(entity.unlinked) && !entity.displayName;

/** Whether the values are an edited event's: its links on one value, picked pages not loaded */
export const needsPageLinks = (values: WikiEntityData[]): boolean =>
  values.some(isLinkKeeper) && values.some((e) => !e.unlinked && !e.displayName);

/** The newest version of an entity's page by its author */
const pageOf = (entity: WikiEntityData, pages: WikiEvent[]): WikiEvent | undefined =>
  pages
    .filter(
      (p) =>
        p.pubkey === entity.resolvedPubkey &&
        p.tags.some((t) => t[0] === 'd' && t[1] === entity.dTag)
    )
    .sort((a, b) => b.created_at - a.created_at)[0];

/**
 * Gives each picked entity the event's links its page has, and its name; the links left stay
 * on the nameless value. The same values when nothing changes
 */
export const splitEventLinks = (values: WikiEntityData[], pages: WikiEvent[]): WikiEntityData[] => {
  const keeper = values.find(isLinkKeeper);
  if (!keeper) return values;
  const left = new Set(keeper.externalIds);
  let changed = false;
  const entities = values.flatMap((entity) => {
    if (entity === keeper) return [];
    const page = entity.unlinked ? undefined : pageOf(entity, pages);
    if (!page) return [entity];
    const own = entityDataOf(page);
    const ids = own.externalIds.filter((id) => left.has(id));
    for (const id of ids) left.delete(id);
    changed = true;
    return [
      {
        ...entity,
        displayName: entity.displayName ?? own.displayName,
        externalIds: [...new Set([...entity.externalIds, ...ids])],
      },
    ];
  });
  if (!changed) return values;
  return left.size ? [...entities, { ...keeper, externalIds: [...left] }] : entities;
};

/** An edited event's picked entities with their own links back, from their pages on relays */
export async function withPageLinks(
  values: WikiEntityData[],
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<WikiEntityData[]> {
  if (!needsPageLinks(values)) return values;
  const dTags = [...new Set(values.filter((e) => !e.unlinked).map((e) => e.dTag))];
  const pages = (await fetchEvents([{ kinds: [WIKI_KIND], '#d': dTags }], relays).catch(
    () => []
  )) as WikiEvent[];
  return splitEventLinks(values, pages);
}
