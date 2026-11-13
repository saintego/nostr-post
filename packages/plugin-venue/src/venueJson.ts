/**
 * @nostr-post/plugin-venue - Venues in form JSON
 *
 * A venue field asks for a place as text ("JAM, Bangkok"), and reads it back as the first place
 * OpenStreetMap finds for it, at the field's levels. A single exact place may also come as
 * `{ name, address }`: when the name alone isn't found, the address is, and the venue is searched
 * by its name around that spot (also without a trailing word, as posts add the city); a venue
 * OpenStreetMap doesn't have there is placed at its street address, under its own name (no OSM
 * id: the street isn't the venue). The user checks it in the composer
 * (the map shows it). No DOM dependencies.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { nominatimToVenue, searchNominatim, type VenueData, type VenuePluginConfig } from './core';
import { resultLevel, venueLevels } from './levels';
import { venueNameKey } from './wikiEntity';

const DESCRIPTION: Record<string, string> = {
  place: 'The venue\'s name and city, e.g. "JAM, Bangkok" (looked up on OpenStreetMap)',
  city: 'A city and country, e.g. "Bangkok, Thailand"',
  country: 'A country',
};

const ADDRESS = 'Its street address, as the post gives it; null when it does not';

/** A place as text, or several with `metadata.multiple`; one exact place with its address */
export const venueJsonSchema = (field: PostField): Record<string, unknown> => {
  const levels = venueLevels(field.metadata?.levels);
  const level = levels.includes('place') ? 'place' : (levels[0] ?? 'place');
  const place = { type: 'string', description: DESCRIPTION[level] };
  if (field.metadata?.multiple === true) return { type: 'array', items: place };
  if (level !== 'place') return place;
  return {
    type: 'object',
    properties: { name: place, address: { type: ['string', 'null'], description: ADDRESS } },
    required: ['name'],
  };
};

/** Address search results that are an area (a district, a city), not a street or a building */
const AREA_TYPES = new Set([
  'country',
  'state',
  'region',
  'province',
  'county',
  'municipality',
  'city',
  'town',
  'village',
  'city_district',
  'district',
  'borough',
  'suburb',
  'quarter',
  'neighbourhood',
  'postcode',
]);

/**
 * Queries for an address, without the venue's name when it starts with it: as given, then its
 * street (the first part) with its city (the last), then the street without the house number
 */
const addressQueries = (address: string, name: string): string[] => {
  const venue = venueNameKey(name.split(',')[0] ?? '');
  const parts = address
    .split(',')
    .map((p) =>
      p
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((p) => p && venueNameKey(p) !== venue);
  const street = parts[0];
  const city = parts.length > 1 ? parts.at(-1) : undefined;
  const bareStreet = street?.replace(/^\d[\w/-]*\s+/, '');
  const queries = [parts.join(', ')];
  if (street && city) queries.push(`${street}, ${city}`);
  if (bareStreet && city && bareStreet !== street) queries.push(`${bareStreet}, ${city}`);
  return [...new Set(queries.filter(Boolean))];
};

/**
 * A venue OpenStreetMap doesn't have, at its street address: named by the venue's name, with
 * the street and city from the address found; undefined when the address isn't found as a street
 * or a building
 */
const findByAddress = async (
  name: string,
  address: string,
  config: VenuePluginConfig
): Promise<VenueData | undefined> => {
  for (const query of addressQueries(address, name)) {
    const results = await searchNominatim(query, ['place']).catch(() => []);
    const spot = results.find(
      (r) => !AREA_TYPES.has(r.addresstype ?? '') && resultLevel(r) === 'place'
    );
    if (!spot) continue;
    const venue = nominatimToVenue(spot, config.precision);
    const street = [venue.address?.street, venue.address?.houseNumber].filter(Boolean).join(' ');
    const label = [name.split(',')[0]?.trim(), street, venue.address?.city].filter(Boolean);
    return {
      ...venue,
      name: label.join(', '),
      osmId: undefined,
      osmType: undefined,
      wikidata: undefined,
    };
  }
  return undefined;
};

/** How far around an address's spot the venue is searched by its name: ~500 m */
const NEAR_SPOT_DEGREES = 0.005;

/**
 * The venue's name as searched near its spot: as given, then without its last word, as posts
 * often add the city ("Blue Monkey Bar Saigon" for OpenStreetMap's "Blue Monkey Bar")
 */
const nameVariants = (name: string): string[] => {
  const words = (name.split(',')[0] ?? '').trim().split(/\s+/).filter(Boolean);
  const variants = [words.join(' ')];
  if (words.length > 2) variants.push(words.slice(0, -1).join(' '));
  return variants.filter(Boolean);
};

/** Whether OpenStreetMap's name is the venue's: one contains the other, ignoring case and accents */
const sameName = (osmName: string, name: string): boolean => {
  const a = venueNameKey(osmName);
  const b = venueNameKey(name);
  return a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a));
};

/**
 * The venue on OpenStreetMap around its address's spot, by its name (the name search alone missed
 * it, e.g. under a longer name); undefined when OSM doesn't have it there
 */
const findNearSpot = async (
  name: string,
  spot: { lat: number; lon: number },
  config: VenuePluginConfig
): Promise<VenueData | undefined> => {
  for (const variant of nameVariants(name)) {
    const results = await searchNominatim(variant, ['place'], spot, NEAR_SPOT_DEGREES).catch(
      () => []
    );
    const match = results.find(
      (r) =>
        !AREA_TYPES.has(r.addresstype ?? '') &&
        sameName(r.name || r.display_name.split(',')[0] || '', variant)
    );
    if (match) return nominatimToVenue(match, config.precision);
  }
  return undefined;
};

/** `{ name, address }` or a text, as the name and the address */
const placeQuery = (value: unknown): { name: string; address: string } => {
  if (typeof value === 'string') return { name: value.trim(), address: '' };
  const place = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return { name: text(place.name), address: text(place.address) };
};

/**
 * The first place OpenStreetMap finds for a text, as the field's value, else (with an address) the
 * venue at its address; undefined for none
 */
const findVenue = async (value: unknown, field: PostField): Promise<VenueData | undefined> => {
  const { name, address } = placeQuery(value);
  if (!name) return undefined;
  const config = (field.metadata ?? {}) as VenuePluginConfig;
  const results = await searchNominatim(name, venueLevels(config.levels)).catch(() => []);
  const first = results[0];
  if (first) return nominatimToVenue(first, config.precision);
  if (!address) return undefined;
  const atAddress = await findByAddress(name, address, config);
  // Found the address: the venue may still be on OpenStreetMap there, under a shorter name
  const onOsm = atAddress ? await findNearSpot(name, atAddress, config) : undefined;
  return onOsm ?? atAddress;
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
