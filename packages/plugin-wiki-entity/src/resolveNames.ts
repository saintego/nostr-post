/**
 * @nostr-post/plugin-wiki-entity - Names to entities
 *
 * Finds the wiki pages of entities by name: the d-tag an entity of the type named so gets
 * (`entityTypeDTag`), looked up on relays and resolved to one version each. Used by the
 * picker's `fromAnswer`, e.g. for performers an AI read from a post.
 */

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
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';

/** The entities named `names` that have a page, and the names that don't */
export async function resolveEntityNames(
  names: string[],
  config: Pick<WikiEntityPickerConfig, 'entityManifest' | 'relays'> = {}
): Promise<{ entities: WikiEntityData[]; unresolved: string[] }> {
  const manifest = await resolveEntityManifest(config.entityManifest, config.relays);
  const affixes = manifest ? entityTypeAffixes(manifest) : { prefix: '', suffix: '' };
  const dTags = names.map((name) => entityTypeDTag(name, affixes));
  const wanted = [...new Set(dTags.filter(Boolean))];
  const events: WikiEvent[] = wanted.length
    ? ((await fetchEvents(
        { kinds: [WIKI_KIND], '#d': wanted, limit: wanted.length * 10 },
        config.relays ?? DEFAULT_WIKI_RELAYS
      ).catch(() => [])) as WikiEvent[])
    : [];
  const groups = groupByDTag(events);
  const entities: WikiEntityData[] = [];
  const unresolved: string[] = [];
  names.forEach((name, i) => {
    const event = defaultResolver(groups.get(dTags[i] ?? '') ?? []);
    if (!event) unresolved.push(name);
    else if (!entities.some((e) => e.dTag === entityDataOf(event).dTag)) {
      entities.push(entityDataOf(event));
    }
  });
  return { entities, unresolved };
}
