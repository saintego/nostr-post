/**
 * Create or update a venue's wiki entity (the venue hub) from OSM, and link
 * the post to it. Used by the venue plugin's beforePublish hook.
 */

import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { fetchEvents, getPublishRelays, publishToRelays, signEvent } from '@nostr-post/signer';
import {
  DEFAULT_WIKI_RELAYS,
  type DTagAvailability,
  type EntityManifestRef,
  WIKI_KIND,
  type WikiEvent,
  buildWikiATag,
  checkEntityDTag,
  defaultResolver,
  entityTitleFor,
  fetchEntityVersions,
  manifestToWikiEvent,
  resolveEntityManifest,
  selectNewestEntity,
  wikiEventToManifestData,
} from '@nostr-post/wiki';
import type { VenueData } from './core';
import { type OsmElement, fetchOsmElement } from './osm';
import {
  type EntitySyncAction,
  entitySyncAction,
  mergeOsmFields,
  venueDTag,
  venueEntityTags,
  venueIdentifiers,
  venueToEntityData,
} from './wikiEntity';

type Tag = [string, ...string[]];

const dTagOf = (event: WikiEvent) => event.tags.find((t) => t[0] === 'd')?.[1] ?? '';

/** The venue's entity (resolved version), found by any of its external IDs */
export async function findVenueEntity(
  venue: VenueData,
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<WikiEvent | undefined> {
  const ids = venueIdentifiers(venue);
  if (ids.length === 0) return undefined;
  const events = (await fetchEvents({ kinds: [WIKI_KIND], '#i': ids, limit: 50 } as never, relays, {
    waitForAll: true,
    relayTimeoutMs: 8000,
  })) as unknown as WikiEvent[];
  const dTag = selectNewestEntity(events, defaultResolver);
  if (!dTag) return undefined;
  const versions = await fetchEntityVersions(dTag, relays);
  return defaultResolver(versions.length > 0 ? versions : events) ?? undefined;
}

/** What publishing would do with the venue's entity, and the OSM data it would use */
export async function planVenueEntity(
  venue: VenueData,
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<{ action: EntitySyncAction; osm: OsmElement | null }> {
  const [base, osm] = await Promise.all([
    findVenueEntity(venue, relays),
    venue.osmType && venue.osmId
      ? fetchOsmElement(venue.osmType, venue.osmId).catch(() => null)
      : Promise.resolve(null),
  ]);
  return { action: entitySyncAction(base, osm), osm };
}

/** Slug availability, asked twice when the first answer is "unknown" (a relay didn't answer) */
export async function slugAvailability(dTag: string, relays: string[]): Promise<DTagAvailability> {
  const first = await checkEntityDTag(dTag, relays);
  return first === 'unknown' ? checkEntityDTag(dTag, relays) : first;
}

/**
 * The d-tag and title of a new venue entity: the slug the user confirmed next
 * to the publish button (generated from the template unless edited; it can't
 * be changed later). Refuses a slug another venue definitely has; one that
 * can't be verified is used, since the venue wasn't found by its IDs either.
 */
async function newEntityIdentity(
  manifest: NostrPostManifest,
  data: Record<string, unknown>,
  venue: VenueData,
  relays: string[]
): Promise<{ dTag: string; title?: string }> {
  const dTag = venueDTag(manifest, data, venue.wikiSlug);
  if (!dTag) throw new Error('The venue has no name for its wiki page slug');
  if ((await slugAvailability(dTag, relays)) === 'taken') {
    throw new Error(
      `Another venue's wiki page already uses "${dTag}". Change the slug next to the publish button.`
    );
  }
  return { dTag, title: entityTitleFor(manifest, data) };
}

/** Tags from `extra` that the event doesn't have yet (same name and value) */
function addMissingTags(tags: Tag[], extra: Tag[]): Tag[] {
  const seen = new Set(tags.map((t) => `${t[0]}\u0000${t[1]}`));
  return [...tags, ...extra.filter((t) => !seen.has(`${t[0]}\u0000${t[1]}`))];
}

/**
 * Publish a new or updated version of the venue's entity when needed and
 * return the tag that links the post to it (`a`). Nothing is published when
 * the entity is up to date with OSM.
 */
export async function syncVenueEntity(venue: VenueData, field: PostField): Promise<Tag[]> {
  // A registered id, an inline manifest, or a published manifest's address
  const manifest = await resolveEntityManifest(field.metadata?.wikiEntity as EntityManifestRef);
  if (!manifest || venue.syncWiki === false || venueIdentifiers(venue).length === 0) return [];

  const relays = DEFAULT_WIKI_RELAYS;
  const { action, osm } = await planVenueEntity(venue, relays);
  if (action.kind === 'none') {
    return [['a', buildWikiATag(action.base.pubkey, dTagOf(action.base))]];
  }

  const fromOsm = venueToEntityData(venue, osm, manifest);
  const { data, dTag, title, keepTags } =
    action.kind === 'create'
      ? {
          data: fromOsm,
          keepTags: [],
          ...(await newEntityIdentity(manifest, fromOsm, venue, relays)),
        }
      : {
          data: mergeOsmFields(wikiEventToManifestData(action.base, manifest), fromOsm, manifest),
          dTag: dTagOf(action.base),
          title: action.base.tags.find((t) => t[0] === 'title')?.[1],
          // Keep what other sources and editors added (e.g. a Google Places ID)
          keepTags: action.base.tags.filter((t) => t[0] === 'i' || t[0] === 't') as Tag[],
        };

  const unsigned = manifestToWikiEvent(manifest, data, { dTag, title });
  // Hub tags: identifiers, area, address, OSM attribution with the synced version
  unsigned.tags = addMissingTags(unsigned.tags as Tag[], [
    ...venueEntityTags(venue, osm),
    ...keepTags,
  ]);

  const signed = await signEvent(unsigned);
  const results = await publishToRelays(signed, await getPublishRelays(signed.pubkey, relays));
  if (results.success === 0) throw new Error('Could not publish the venue wiki page to any relay');
  return [['a', buildWikiATag(signed.pubkey, dTag)]];
}
