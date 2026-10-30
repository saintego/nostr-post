/**
 * @nostr-post/plugin-venue - Venues in form JSON
 *
 * A venue field asks for a place as text ("JAM, Bangkok"), and reads it back as the first place
 * OpenStreetMap finds for it, at the field's levels. The user checks it in the composer (the map
 * shows it). No DOM dependencies.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { nominatimToVenue, searchNominatim, type VenueData, type VenuePluginConfig } from './core';
import { venueLevels } from './levels';

const DESCRIPTION: Record<string, string> = {
  place: 'The venue\'s name and city, e.g. "JAM, Bangkok" (looked up on OpenStreetMap)',
  city: 'A city and country, e.g. "Bangkok, Thailand"',
  country: 'A country',
};

/** A place as text, or several with `metadata.multiple` */
export const venueJsonSchema = (field: PostField): Record<string, unknown> => {
  const levels = venueLevels(field.metadata?.levels);
  const level = levels.includes('place') ? 'place' : (levels[0] ?? 'place');
  const place = { type: 'string', description: DESCRIPTION[level] };
  return field.metadata?.multiple === true ? { type: 'array', items: place } : place;
};

/** The first place OpenStreetMap finds for a text, as the field's value; undefined for none */
const findVenue = async (query: unknown, field: PostField): Promise<VenueData | undefined> => {
  if (typeof query !== 'string' || !query.trim()) return undefined;
  const config = (field.metadata ?? {}) as VenuePluginConfig;
  const results = await searchNominatim(query.trim(), venueLevels(config.levels)).catch(() => []);
  const first = results[0];
  return first ? nominatimToVenue(first, config.precision) : undefined;
};

/** Texts looked up as places (one by one: Nominatim takes a request a second) */
export const parseVenueJson = async (
  value: unknown,
  field: PostField
): Promise<{ value?: unknown }> => {
  if (!Array.isArray(value)) return { value: await findVenue(value, field) };
  const venues: VenueData[] = [];
  for (const query of value) {
    const venue = await findVenue(query, field);
    if (venue) venues.push(venue);
  }
  return { value: venues.length ? venues : undefined };
};
