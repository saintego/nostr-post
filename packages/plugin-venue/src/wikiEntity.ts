/**
 * Mapping between OSM venues and venue wiki entities (pure, no network).
 *
 * Entity manifest fields declare where their value comes from per provider,
 * e.g. `metadata.sources: { osm: 'opening_hours' }`. Alternatives are
 * separated by `|` (`amenity|shop|craft`, first present wins); `@street`,
 * `@city` and `@name` are derived from the picked venue's address.
 */

import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { decodeGeohash } from '@nostr-post/plugin-geo';
import {
  type EntityManifestRef,
  type EntityTypeAffixes,
  entityDTagFor,
  entityTypeAffixes,
  getEntityManifest,
  normalizeDTag,
  type WikiEvent,
} from '@nostr-post/wiki';
import type { VenueData } from './core';
import { venueSettings } from './googleEmbed';
import { geohashTags } from './levels';
import type { OsmElement } from './osm';

export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
const OSM_SOURCE = 'OpenStreetMap';

type Tag = [string, ...string[]];

/** `["source", "OpenStreetMap", <copyright URL>, "node/123/v42"]`: attribution + imported version */
export const osmSourceTag = (osm: OsmElement): Tag => [
  'source',
  OSM_SOURCE,
  OSM_COPYRIGHT_URL,
  `${osm.type}/${osm.id}/v${osm.version}`,
];

/** The OSM element version an entity was last synced from, if any */
export function syncedOsmVersion(event: WikiEvent): number | undefined {
  const tag = event.tags.find((t) => t[0] === 'source' && t[1] === OSM_SOURCE);
  const match = tag?.[3]?.match(/\/v(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

const osmSourceKey = (field: NostrPostManifest['fields'][number]): string | undefined =>
  (field.metadata?.sources as { osm?: unknown } | undefined)?.osm as string | undefined;

/** Ids of the manifest fields that are filled from OSM */
export const osmSourcedFieldIds = (manifest: NostrPostManifest): string[] =>
  manifest.fields.filter((f) => osmSourceKey(f)).map((f) => f.id);

const street = (venue: VenueData, osm: OsmElement | null): string | undefined => {
  const road = venue.address?.street ?? osm?.tags['addr:street'];
  const number = venue.address?.houseNumber ?? osm?.tags['addr:housenumber'];
  return road ? [road, number].filter(Boolean).join(' ') : undefined;
};

function derivedValue(key: string, venue: VenueData, osm: OsmElement | null): string | undefined {
  if (key === '@street') return street(venue, osm);
  if (key === '@city') return venue.address?.city || osm?.tags['addr:city'];
  // Empty OSM values count as missing
  if (key === '@name') return osm?.tags.name || venue.name?.split(',')[0]?.trim();
  return osm?.tags[key];
}

function sourceValue(spec: string, venue: VenueData, osm: OsmElement | null): string | undefined {
  for (const key of spec.split('|')) {
    const value = derivedValue(key.trim(), venue, osm);
    if (value) return value;
  }
  return undefined;
}

/** Entity form data from an OSM venue, for the fields that declare an OSM source */
export function venueToEntityData(
  venue: VenueData,
  osm: OsmElement | null,
  manifest: NostrPostManifest
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of manifest.fields) {
    const spec = osmSourceKey(field);
    const value = spec ? sourceValue(spec, venue, osm) : undefined;
    if (value !== undefined) data[field.id] = value;
  }
  return data;
}

/** `current` with only its OSM-sourced fields replaced by `fromOsm`; everything else kept */
export function mergeOsmFields(
  current: Record<string, unknown>,
  fromOsm: Record<string, unknown>,
  manifest: NostrPostManifest
): Record<string, unknown> {
  const merged = { ...current };
  for (const id of osmSourcedFieldIds(manifest)) {
    if (fromOsm[id] !== undefined) merged[id] = fromOsm[id];
  }
  return merged;
}

/** External identifiers of a venue as `i` values (`osm:`, `gplace:`, `gcid:`: our namespaces) */
/**
 * Whether the field always creates/updates the venue's page: the manifest requires it
 * (`metadata.requirePage`), or the post has nothing else for the venue (`linkOnly`: only the
 * page's `a` tag). Otherwise the user may opt out (`VenueData.syncWiki`)
 */
export const venuePageRequired = (field: PostField): boolean =>
  field.metadata?.requirePage === true || field.metadata?.linkOnly === true;

/**
 * Whether publishing creates/updates venues' pages unless the author chooses: the app's
 * `configureVenuePlugin({ createPages })`, else the manifest's `metadata.createPage`, else yes
 */
export const createsVenuePages = (field: PostField): boolean =>
  venueSettings().createPages ?? field.metadata?.createPage !== false;

/**
 * Whether publishing creates/updates the venue's page: required, else the author's tick
 * (`VenueData.syncWiki`), else `createsVenuePages`. Without it an existing page is only linked
 */
export const syncsVenuePage = (venue: VenueData, field: PostField): boolean =>
  venuePageRequired(field) || (venue.syncWiki ?? createsVenuePages(field));

/** Shortest geohash a venue without ids is placed precisely enough by (6 chars ≈ ±610 m) */
const PAGE_POINT_PRECISION = 6;

/**
 * Whether a venue can have a wiki page: it has an OpenStreetMap or Google id, or (a venue
 * OpenStreetMap doesn't have, placed by its address or the author's pin) a name and a precise
 * point; its page is then found again by its name near that point (`findVenueEntityByName`)
 */
export const canHaveVenuePage = (venue: VenueData): boolean =>
  venueIdentifiers(venue).length > 0 ||
  (!!venue.name?.split(',')[0]?.trim() && (venue.geohash?.length ?? 0) >= PAGE_POINT_PRECISION);

/** What tells a venue's page apart, to plan it once per venue: its ids, else its name and point */
export const venuePageKey = (venue: VenueData): string =>
  venueIdentifiers(venue).join(',') || `${venue.name?.split(',')[0]?.trim()}@${venue.geohash}`;

export function venueIdentifiers(venue: VenueData): string[] {
  const ids: string[] = [];
  if (venue.osmType && venue.osmId) ids.push(`osm:${venue.osmType}:${venue.osmId}`);
  if (venue.googlePlaceId) ids.push(`gplace:${venue.googlePlaceId}`);
  if (venue.googleCid) ids.push(`gcid:${venue.googleCid}`);
  return ids;
}

/** Hub tags for a venue entity: its identifiers, area, address and OSM attribution */
export function venueEntityTags(venue: VenueData, osm: OsmElement | null): Tag[] {
  const ids = venueIdentifiers(venue);
  const tags: Tag[] = ids.map((id): Tag => ['i', id]);
  // A venue OpenStreetMap and Google don't have: its point as its id (NIP-73 `geo:`), so it's a
  // venue page that `isSameVenueByName` finds again by its name there
  if (ids.length === 0 && venue.geohash) tags.push(['i', `geo:${venue.geohash}`]);
  // Not identifiers of this venue (not used to find its page), but queryable: its country, Wikidata item
  if (venue.countryCode) tags.push(['i', `iso3166:${venue.countryCode}`]);
  if (venue.wikidata) tags.push(['i', `wikidata:${venue.wikidata}`]);
  tags.push(...geohashTags(venue.geohash));
  if (venue.name) tags.push(['location', venue.name]);
  if (osm) tags.push(osmSourceTag(osm));
  return tags;
}

/** What publishing a review should do with the venue's entity */
export type EntitySyncAction =
  | { kind: 'create' }
  | { kind: 'update'; base: WikiEvent }
  | { kind: 'none'; base: WikiEvent };

/**
 * Create the entity if missing; update it when OSM changed since the version
 * it was synced from (or it was never synced from OSM); otherwise leave it, so
 * community edits aren't overwritten on every review.
 */
export function entitySyncAction(
  base: WikiEvent | undefined,
  osm: OsmElement | null
): EntitySyncAction {
  if (!base) return { kind: 'create' };
  if (!osm) return { kind: 'none', base };
  const synced = syncedOsmVersion(base);
  return synced === undefined || osm.version > synced
    ? { kind: 'update', base }
    : { kind: 'none', base };
}

/** A venue name compared loosely: case, accents, spaces and punctuation ignored */
export const venueNameKey = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

/** How close (m) a venue page must be to count as the same place by its name */
export const SAME_VENUE_METERS = 300;

/** Distance in meters between two points (haversine) */
const metersBetween = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

/**
 * Whether a venue page is this venue's though its IDs differ (picked from another source, e.g.
 * Google next to OSM, or a duplicate OSM entry): a venue hub (it has a place ID) with the same
 * name (its title without the " (qualifier)") within `SAME_VENUE_METERS` of the venue
 */
export function isSameVenueByName(event: WikiEvent, venue: VenueData): boolean {
  // The venue's name is its label's first part ("Speakerbox, 1000/39 Soi Sukhumvit 55, …")
  const key = venueNameKey(venue.name?.split(',')[0] ?? '');
  const title = event.tags.find((t) => t[0] === 'title')?.[1] ?? '';
  const isHub = event.tags.some((t) => t[0] === 'i' && /^(osm|gplace|gcid|geo):/.test(t[1] ?? ''));
  const geohash = event.tags
    .filter((t) => t[0] === 'g' && t[1])
    .reduce((longest, t) => ((t[1] ?? '').length > longest.length ? (t[1] ?? '') : longest), '');
  if (!key || !isHub || !geohash || !venue.geohash) return false;
  if (venueNameKey(title.replace(/\s*\([^)]*\)\s*$/, '')) !== key) return false;
  return metersBetween(decodeGeohash(geohash), venue) <= SAME_VENUE_METERS;
}

/** Details that could tell this venue apart from another with the same name and city */
export function venueQualifierSuggestions(venue: VenueData): string[] {
  const { street, district, postcode } = venue.address ?? {};
  return [street, district, postcode].filter(
    (s, i, all): s is string => !!s && all.indexOf(s) === i
  );
}

/** The editable part of a slug: without the entity type's fixed prefix/suffix */
export function slugBody(dTag: string, { prefix, suffix }: EntityTypeAffixes): string {
  const withoutPrefix = prefix && dTag.startsWith(prefix) ? dTag.slice(prefix.length) : dTag;
  return suffix && withoutPrefix.endsWith(suffix)
    ? withoutPrefix.slice(0, -suffix.length)
    : withoutPrefix;
}

/**
 * A new venue page's d-tag: the slug the user edited (normalized, with the
 * type's prefix/suffix), else the one generated from the manifest template.
 */
export function venueDTag(
  manifest: NostrPostManifest,
  data: Record<string, unknown>,
  editedSlug?: string
): string | undefined {
  const affixes = entityTypeAffixes(manifest);
  const edited = slugBody(normalizeDTag(editedSlug ?? ''), affixes);
  return edited ? `${affixes.prefix}${edited}${affixes.suffix}` : entityDTagFor(manifest, data);
}

/** The d-tag suffix of venue pages when the field's venue page type isn't loaded: `{…}-(venue)` */
const VENUE_SUFFIX = '-venue';

/**
 * The venue's page among a post's tags: the last `a` tag to a wiki page of the venue page type
 * (its d-tag's fixed prefix and suffix, from the field's `metadata.wikiEntity`, else `-venue`).
 * Other pages the post links (a gig's performers) aren't its page; a post without one has none
 */
export function venuePageOf(
  tags: string[][],
  field: PostField | undefined
): { pubkey: string; dTag: string } | undefined {
  const manifest = getEntityManifest(field?.metadata?.wikiEntity as EntityManifestRef | undefined);
  const { prefix, suffix } = manifest
    ? entityTypeAffixes(manifest)
    : { prefix: '', suffix: VENUE_SUFFIX };
  for (const tag of [...tags].reverse()) {
    if (tag[0] !== 'a' || !tag[1]?.startsWith('30818:')) continue;
    const [, pubkey = '', ...rest] = tag[1].split(':');
    const dTag = rest.join(':');
    const ofVenueType = dTag.startsWith(prefix) && dTag.endsWith(suffix);
    if (pubkey && dTag && ofVenueType) return { pubkey, dTag };
  }
  return undefined;
}
