/**
 * @nostr-post/plugin-wiki-entity - Entities to their pages
 *
 * Finds the wiki pages of entities given by name and links (`entityItems`): first by the
 * NIP-73 ids of their links (`#i`, e.g. the same Instagram profile), then by the d-tag an entity
 * of the type with that name gets. A page found by name whose links are all different is another
 * entity with the same name. Entities without a page stay as unlinked values (their links still
 * written as `i` tags), with a suggestion to create the page; pages missing some of the links get
 * a suggestion to add them. Used by the picker's `parseJson`, e.g. for performers an AI read
 * from a post.
 */

import type { FormJsonSuggestion } from '@nostr-post/plugins/types';
import { fetchEvents } from '@nostr-post/signer';
import {
  DEFAULT_WIKI_RELAYS,
  defaultResolver,
  entityTypeAffixes,
  groupByDTag,
  resolveEntityManifest,
  WIKI_KIND,
  type WikiEvent,
} from '@nostr-post/wiki';
import {
  entityDataOf,
  entityTypeDTag,
  matchesEntityType,
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';
import { type EntityItem, linkFields } from './entityJson';

const idsOfEvent = (event: WikiEvent): string[] =>
  event.tags.flatMap((t) => (t[0] === 'i' && t[1] ? [t[1]] : []));

const addressOf = (event: WikiEvent): string =>
  `${WIKI_KIND}:${event.pubkey}:${event.tags.find((t) => t[0] === 'd')?.[1] ?? ''}`;

/** The resolved page among `events` (one entity's versions, possibly of several entities) */
const pageOf = (events: WikiEvent[]): WikiEvent | undefined => {
  const [first] = [...groupByDTag(events).values()];
  return (first && defaultResolver(first)) ?? undefined;
};

/** What to add to the page: the item's links it doesn't have */
const missingLinks = (
  item: EntityItem,
  page: WikiEvent,
  linkFieldIds: string[]
): Record<string, unknown> | undefined => {
  const pageIds = new Set(idsOfEvent(page));
  if (item.ids.every((id) => pageIds.has(id))) return undefined;
  const prefill = Object.fromEntries(
    linkFieldIds.flatMap((id) => (id in item.prefill ? [[id, item.prefill[id]]] : []))
  );
  return Object.keys(prefill).length ? prefill : undefined;
};

/**
 * The entities of `items` as picker values: their pages where found, else unlinked values; and
 * suggestions to create or update pages
 */
export async function resolveEntities(
  items: EntityItem[],
  config: Pick<WikiEntityPickerConfig, 'entityManifest' | 'relays'> = {}
): Promise<{ entities: WikiEntityData[]; suggestions: FormJsonSuggestion[] }> {
  const manifest = await resolveEntityManifest(config.entityManifest, config.relays);
  const affixes = manifest ? entityTypeAffixes(manifest) : { prefix: '', suffix: '' };
  const linkFieldIds = manifest ? linkFields(manifest).map((f) => f.id) : [];
  const dTags = items.map((item) => entityTypeDTag(item.name, affixes));
  const ids = [...new Set(items.flatMap((item) => item.ids))];
  const wantedDTags = [...new Set(dTags.filter(Boolean))];
  const filters = [
    ...(wantedDTags.length ? [{ kinds: [WIKI_KIND], '#d': wantedDTags }] : []),
    ...(ids.length ? [{ kinds: [WIKI_KIND], '#i': ids }] : []),
  ];
  const events = filters.length
    ? ((await fetchEvents(filters, config.relays ?? DEFAULT_WIKI_RELAYS).catch(
        () => []
      )) as WikiEvent[])
    : [];
  const ofType = events.filter((e) =>
    matchesEntityType(e.tags.find((t) => t[0] === 'd')?.[1] ?? '', affixes)
  );

  const entities: WikiEntityData[] = [];
  const suggestions: FormJsonSuggestion[] = [];
  items.forEach((item, i) => {
    const byLink = pageOf(ofType.filter((e) => idsOfEvent(e).some((id) => item.ids.includes(id))));
    const byName = pageOf(
      ofType.filter((e) => e.tags.some((t) => t[0] === 'd' && t[1] === dTags[i]))
    );
    // Same name, but none of the same links: another entity with that name
    const sameName =
      byName &&
      (item.ids.length === 0 ||
        idsOfEvent(byName).length === 0 ||
        idsOfEvent(byName).some((id) => item.ids.includes(id)));
    const page = byLink ?? (sameName ? byName : undefined);
    if (!page) {
      entities.push({
        dTag: '',
        resolvedPubkey: '',
        externalIds: item.ids,
        displayName: item.name,
        unlinked: true,
        prefill: item.prefill,
      });
      suggestions.push({ label: item.name, action: 'create', prefill: item.prefill });
      return;
    }
    const entity = entityDataOf(page);
    if (entities.some((e) => !e.unlinked && e.dTag === entity.dTag)) return;
    entities.push({ ...entity, externalIds: [...new Set([...entity.externalIds, ...item.ids])] });
    const missing = missingLinks(item, page, linkFieldIds);
    if (missing) {
      suggestions.push({
        label: entity.displayName ?? item.name,
        action: 'update',
        address: addressOf(page),
        prefill: missing,
      });
    }
  });
  return { entities, suggestions };
}
