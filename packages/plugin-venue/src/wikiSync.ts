/**
 * Create or update a venue's wiki entity (the venue hub) from OSM, and link
 * the post to it. Used by the venue plugin's beforePublish hook.
 */

import { withExternalIdKinds } from '@nostr-post/core/nip73';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { fetchEvents, getPublishRelays, publishToRelays, signEvent } from '@nostr-post/signer';
import {
  buildWikiATag,
  checkEntityDTag,
  DEFAULT_WIKI_RELAYS,
  type DTagAvailability,
  defaultResolver,
  type EntityManifestRef,
  entityTitleFor,
  fetchEntityVersions,
  manifestToWikiEvent,
  resolveEntityManifest,
  selectNewestEntity,
  WIKI_KIND,
  type WikiEvent,
  wikiEventToManifestData,
} from '@nostr-post/wiki';
import type { VenueData } from './core';
import { fetchOsmElement, type OsmElement } from './osm';
import {
  canHaveVenuePage,
  type EntitySyncAction,
  entitySyncAction,
  isSameVenueByName,
  mergeOsmFields,
  syncsVenuePage,
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

/**
 * The page of a venue a post doesn't link (e.g. a gig published without creating it): found by
 * the venue's ids (`i osm:…`, `i gcid:…`, `i gplace:…`), else by its name near its point;
 * undefined when there's none
 */
export async function findVenuePage(
  venue: VenueData,
  relays?: string[]
): Promise<{ pubkey: string; dTag: string } | undefined> {
  // By its ids, else (a venue OpenStreetMap doesn't have) by its name near its point
  const page =
    (await findVenueEntity(venue, relays).catch(() => undefined)) ??
    (await findVenueEntityByName(venue, relays).catch(() => undefined));
  const dTag = page?.tags.find((t) => t[0] === 'd')?.[1];
  return page && dTag ? { pubkey: page.pubkey, dTag } : undefined;
}

/**
 * The venue's page when its IDs don't find it: a venue hub nearby with the same name
 * (`isSameVenueByName`), e.g. made from OSM while this venue was picked from Google
 */
export async function findVenueEntityByName(
  venue: VenueData,
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<WikiEvent | undefined> {
  // Pages carry every prefix of their geohash: a 5-character cell (~5 km) holds the neighbors
  const cell = venue.geohash?.slice(0, 5);
  if (!cell || cell.length < 5 || !venue.name) return undefined;
  const events = (await fetchEvents(
    { kinds: [WIKI_KIND], '#g': [cell], limit: 200 } as never,
    relays,
    {
      waitForAll: true,
      relayTimeoutMs: 8000,
    }
  )) as unknown as WikiEvent[];
  return defaultResolver(events.filter((e) => isSameVenueByName(e, venue))) ?? undefined;
}

/**
 * What publishing would do with the venue's entity, and the OSM data it would use. A page found
 * only by name is linked as it is: its OSM data is another element's, so it isn't synced.
 */
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
  if (!base) {
    const named = await findVenueEntityByName(venue, relays);
    if (named) return { action: { kind: 'none', base: named }, osm };
  }
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
/**
 * The newest version of the page at `dTag` if it's this venue's page (same OSM
 * or Google ID, or for a venue without them its name near its point): e.g. published moments ago by another field of the same post,
 * before relays answer the ID lookup
 */
async function samePlaceAt(dTag: string, venue: VenueData, relays: string[]) {
  const ids = new Set(venueIdentifiers(venue));
  const versions = await fetchEntityVersions(dTag, relays);
  // A venue without ids: the page with its name near its point
  const ours = versions.filter((v) =>
    ids.size > 0
      ? v.tags.some((t) => t[0] === 'i' && ids.has(t[1] ?? ''))
      : isSameVenueByName(v, venue)
  );
  return defaultResolver(ours) ?? undefined;
}

/** A new page's slug and title, or the page already there for this venue */
async function newEntityIdentity(
  manifest: NostrPostManifest,
  data: Record<string, unknown>,
  venue: VenueData,
  relays: string[]
): Promise<{ dTag: string; title?: string; existing?: WikiEvent }> {
  const dTag = venueDTag(manifest, data, venue.wikiSlug);
  if (!dTag) throw new Error('The venue has no name for its wiki page slug');
  if ((await slugAvailability(dTag, relays)) === 'taken') {
    const existing = await samePlaceAt(dTag, venue, relays);
    if (existing) return { dTag, existing };
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
 * the entity is up to date with OSM, or when the page isn't made or updated now
 * (`syncsVenuePage`: unticked, or the app's `createPages: false` for imports): an
 * existing page is then only linked.
 */
export async function syncVenueEntity(venue: VenueData, field: PostField): Promise<Tag[]> {
  // A registered id, an inline manifest, or a published manifest's address
  const manifest = await resolveEntityManifest(field.metadata?.wikiEntity as EntityManifestRef);
  if (!manifest || !canHaveVenuePage(venue)) return [];

  const relays = DEFAULT_WIKI_RELAYS;
  const { action, osm } = await planVenueEntity(venue, relays);
  if (action.kind === 'none' || !syncsVenuePage(venue, field)) {
    return action.kind === 'create'
      ? []
      : [['a', buildWikiATag(action.base.pubkey, dTagOf(action.base))]];
  }

  const fromOsm = venueToEntityData(venue, osm, manifest);
  const identity =
    action.kind === 'create'
      ? await newEntityIdentity(manifest, fromOsm, venue, relays)
      : undefined;
  // Its page appeared meanwhile (e.g. another field of this post created it): link it
  if (identity?.existing) return [['a', buildWikiATag(identity.existing.pubkey, identity.dTag)]];
  const { data, dTag, title, keepTags } =
    action.kind === 'create'
      ? { data: fromOsm, keepTags: [], dTag: identity?.dTag ?? '', title: identity?.title }
      : {
          data: mergeOsmFields(wikiEventToManifestData(action.base, manifest), fromOsm, manifest),
          dTag: dTagOf(action.base),
          title: action.base.tags.find((t) => t[0] === 'title')?.[1],
          // Keep what other sources and editors added (e.g. a Google Places ID)
          keepTags: action.base.tags.filter((t) => t[0] === 'i' || t[0] === 't') as Tag[],
        };

  const ref = field.metadata?.wikiEntity;
  // A published manifest's address: the page links it, like posts do
  const manifestRef = typeof ref === 'string' && ref.startsWith('30078:') ? ref : undefined;
  const unsigned = manifestToWikiEvent(manifest, data, { dTag, title, manifestRef });
  // Hub tags: identifiers, area, address, OSM attribution with the synced version
  // NIP-73: the `k` tags of the hub's `i` tags too
  unsigned.tags = withExternalIdKinds(
    addMissingTags(unsigned.tags as Tag[], [...venueEntityTags(venue, osm), ...keepTags])
  );

  const signed = await signEvent(unsigned);
  const results = await publishToRelays(signed, await getPublishRelays(signed.pubkey, relays));
  if (results.success === 0) throw new Error('Could not publish the venue wiki page to any relay');
  return [['a', buildWikiATag(signed.pubkey, dTag)]];
}
