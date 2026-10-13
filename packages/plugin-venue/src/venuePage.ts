/**
 * A link-only venue (a post or page stores only the link to the venue's wiki
 * page) read back as a place: load the venue page and take its name, area and
 * OSM identity from its tags, so views can show the name and map and editing
 * can fill the venue field.
 */

import type { PostField } from '@nostr-post/plugins/types';
import {
  DEFAULT_WIKI_RELAYS,
  type WikiEvent,
  defaultResolver,
  fetchEntityVersions,
} from '@nostr-post/wiki';
import { type VenueData, venuePlugin } from './core';

/** A venue value that names its page but not its place yet */
export const needsPage = (value: unknown): value is VenueData =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !!(value as VenueData).wikiEntity &&
  !(value as VenueData).geohash;

/** The place a venue page describes, from its tags (title as the name) */
export function venueFromPage(page: WikiEvent, field: PostField): VenueData | undefined {
  const fromTags = venuePlugin.resolveFromTags?.(page.tags, field) as VenueData | null | undefined;
  if (!fromTags) return undefined;
  const title = page.tags.find((t) => t[0] === 'title')?.[1];
  const dTag = page.tags.find((t) => t[0] === 'd')?.[1] ?? '';
  return { ...fromTags, name: title ?? fromTags.name, wikiEntity: { pubkey: page.pubkey, dTag } };
}

/**
 * The venue with its place loaded from its page: the version by the linked
 * author if there is one, else the resolved version. The value as is when the
 * page can't be found.
 */
export async function loadVenueFromPage(
  venue: VenueData,
  field: PostField,
  relays: string[] = DEFAULT_WIKI_RELAYS
): Promise<VenueData> {
  const link = venue.wikiEntity;
  if (!link) return venue;
  const versions = await fetchEntityVersions(link.dTag, relays).catch(() => []);
  const page = versions.find((v) => v.pubkey === link.pubkey) ?? defaultResolver(versions);
  const place = page ? venueFromPage(page, field) : undefined;
  return place ? { ...venue, ...place, wikiEntity: link } : venue;
}
