/**
 * @nostr-post/plugin-wiki-entity - Creating the pages of unlinked entities when a post is published
 *
 * The picker's `beforePublish` hook: an unlinked entity (e.g. a performer an AI read from a post)
 * gets its page created from its `prefill` (name and links), and the post links it (`a` tag),
 * like the venue hub does for venues. Always optional: the user unticks it next to the publish
 * button (`createPage`); without a page the entity stays as its name and links. A page that
 * appeared meanwhile (found by the entity's links) is linked instead. A slug another entity has
 * gets the first free qualifier (a profile handle, a genre, …), as in the wiki composer; when
 * none is free, nothing is published, so another entity's page is never overwritten.
 */

import { pluginRegistry } from '@nostr-post/plugins/registry';
import type { PostField } from '@nostr-post/plugins/types';
import { fetchEvents, getPublishRelays, publishToRelays, signEvent } from '@nostr-post/signer';
import {
  buildWikiATag,
  checkEntitySlug,
  DEFAULT_WIKI_RELAYS,
  defaultResolver,
  distinguishingSuggestions,
  type EntityManifestRef,
  entityDTagFor,
  entityTitleFor,
  entityTypeAffixes,
  manifestToWikiEvent,
  resolveEntityManifest,
  WIKI_KIND,
  type WikiEvent,
} from '@nostr-post/wiki';
import {
  entityPrefill,
  matchesEntityType,
  type WikiEntityData,
  type WikiEntityPickerConfig,
} from './core';

type Tag = [string, ...string[]];

/** Whether publishing creates the entity's page: unlinked, named, and wanted (`createPage`) */
export const createsPage = (entity: WikiEntityData): boolean =>
  Boolean(entity.unlinked && entity.displayName) &&
  (entity.createPage ?? entity.externalIds.length > 0);

/** The form data of the entity's new page: its prefill, else its name */
export const pageData = (
  entity: WikiEntityData,
  manifest: Parameters<typeof entityPrefill>[0]
): Record<string, unknown> => entity.prefill ?? entityPrefill(manifest, entity.displayName ?? '');

const dTagOf = (event: WikiEvent): string => event.tags.find((t) => t[0] === 'd')?.[1] ?? '';

/** The entity's page published since it was read (by its links, of its type), e.g. by another post */
async function existingPage(
  entity: WikiEntityData,
  manifest: Parameters<typeof entityTypeAffixes>[0],
  relays: string[]
) {
  if (!entity.externalIds.length) return undefined;
  const events = (await fetchEvents(
    [{ kinds: [WIKI_KIND], '#i': entity.externalIds }],
    relays
  ).catch(() => [])) as WikiEvent[];
  const affixes = entityTypeAffixes(manifest);
  return defaultResolver(events.filter((e) => matchesEntityType(dTagOf(e), affixes))) ?? undefined;
}

/**
 * Creates the unlinked entity's page and returns the tag that links the post to it (`a`); no
 * tags when it doesn't create one (`createsPage`). Rejects, so nothing is published, when the
 * page can't be made: no entity manifest, no free slug, or no relay took it.
 */
export async function createEntityPage(value: unknown, field: PostField): Promise<Tag[]> {
  const entity = value as WikiEntityData;
  if (!entity || typeof entity !== 'object' || !createsPage(entity)) return [];
  const config = (field.metadata ?? {}) as WikiEntityPickerConfig;
  const relays = config.relays ?? DEFAULT_WIKI_RELAYS;
  const ref = config.entityManifest as EntityManifestRef;
  const manifest = await resolveEntityManifest(ref, relays);
  if (!manifest) throw new Error(`Can't create the page of ${entity.displayName}: no page type`);

  const existing = await existingPage(entity, manifest, relays);
  if (existing) return [['a', buildWikiATag(existing.pubkey, dTagOf(existing))]];

  const data = pageData(entity, manifest);
  const candidates = distinguishingSuggestions(manifest, data, (f, v) =>
    pluginRegistry.get(f.uiPlugin)?.qualifiers?.(v, f)
  );
  const { status, qualifier } = await checkEntitySlug(manifest, data, { candidates, relays });
  const dTag = entityDTagFor(manifest, data, qualifier);
  if (status === 'taken' || !dTag) {
    throw new Error(
      `Another page already has the name ${entity.displayName}: create its page with "Create page", or untick it`
    );
  }
  // A published manifest's address: the page links it, like posts do
  const manifestRef = typeof ref === 'string' && ref.startsWith('30078:') ? ref : undefined;
  const unsigned = manifestToWikiEvent(manifest, data, {
    dTag,
    title: entityTitleFor(manifest, data, qualifier),
    manifestRef,
  });
  const signed = await signEvent(unsigned);
  const results = await publishToRelays(signed, await getPublishRelays(signed.pubkey, relays));
  if (results.success === 0) {
    throw new Error(`Could not publish the page of ${entity.displayName} to any relay`);
  }
  return [['a', buildWikiATag(signed.pubkey, dTag)]];
}
