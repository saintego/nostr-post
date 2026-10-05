/**
 * Mapping between OSM venues and venue wiki entities (pure, no network).
 *
 * Entity manifest fields declare where their value comes from per provider,
 * e.g. `metadata.sources: { osm: 'opening_hours' }`. Alternatives are
 * separated by `|` (`amenity|shop|craft`, first present wins); `@street`,
 * `@city` and `@name` are derived from the picked venue's address.
 */

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { WikiEvent } from '@nostr-post/wiki';
import type { VenueData } from './core';
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

/** External identifiers of a venue as NIP-73 `i` values */
export function venueIdentifiers(venue: VenueData): string[] {
  const ids: string[] = [];
  if (venue.osmType && venue.osmId) ids.push(`osm:${venue.osmType}:${venue.osmId}`);
  if (venue.googlePlaceId) ids.push(`gplace:${venue.googlePlaceId}`);
  return ids;
}

/** `g` tags for every geohash prefix (≥ 2 chars), for area search on relays */
export const geohashTags = (geohash: string): Tag[] =>
  Array.from({ length: Math.max(geohash.length - 1, 0) }, (_, i) => [
    'g',
    geohash.slice(0, geohash.length - i),
  ]);

/** Hub tags for a venue entity: its identifiers, area, address and OSM attribution */
export function venueEntityTags(venue: VenueData, osm: OsmElement | null): Tag[] {
  const tags: Tag[] = venueIdentifiers(venue).map((id): Tag => ['i', id]);
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
