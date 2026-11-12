/**
 * A time zone guessed from where something happens, for timed events that don't say theirs
 * (`start_tzid`; other clients and bridges often leave it out): the event's country (NIP-73
 * `i iso3166:CZ`) and point (`g` geohash). A country with one zone (or zones keeping the same
 * clock, e.g. Germany's Berlin and Büsingen) gives it; with several (or no country) the zone whose
 * main city is nearest to the point. Offline: the tz database's zone.tab
 * (`zoneTable.ts`). A guess is a guess: show it as one. No DOM dependencies.
 */

import { decodeGeohash, isValidGeohash } from '@nostr-post/core/geohash';
import { isValidTimeZone, unixToWall } from './dateValue';
import { ZONE_TABLE } from './zoneTable';

interface ZoneCity {
  country: string;
  lat: number;
  lon: number;
  zone: string;
}

/** Where a zone is guessed from: a country code (ISO 3166-1 alpha-2) and/or a point */
export interface ZonePlace {
  country?: string;
  lat?: number;
  lon?: number;
}

/** Farthest a point may be from a zone's main city when no country narrows the zones (km) */
const MAX_KM_WITHOUT_COUNTRY = 1500;
/** Shortest geohash precise enough to guess from (3 chars ≈ ±78 km) */
const MIN_GEOHASH = 3;
const EARTH_KM = 6371;

let cities: ZoneCity[] | undefined;

/** The table's zones the runtime knows, read once */
const zoneCities = (): ZoneCity[] => {
  cities ??= ZONE_TABLE.split('\n').flatMap((line): ZoneCity[] => {
    const [country = '', lat = '', lon = '', zone = ''] = line.split(' ');
    return isValidTimeZone(zone) ? [{ country, lat: Number(lat), lon: Number(lon), zone }] : [];
  });
  return cities;
};

/** Winter and summer moments of this year, to compare zones' clocks with daylight saving */
const clockMoments = (): number[] => {
  const year = new Date().getUTCFullYear();
  return [Date.UTC(year, 0, 15) / 1000, Date.UTC(year, 6, 15) / 1000];
};

/** Whether the zones keep the same clock (the same local time in winter and summer) */
const sameClock = (zones: ZoneCity[]): boolean => {
  const moments = clockMoments();
  const clock = (zone: string) => moments.map((m) => unixToWall(m, zone)).join();
  const first = zones[0];
  return first !== undefined && zones.every((z) => clock(z.zone) === clock(first.zone));
};

/** Great-circle distance in km */
const distanceKm = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** The zone of a place; undefined when it can't be told (no data, a country of several zones without a point, a point far from any zone's city) */
export const guessTimeZone = ({ country, lat, lon }: ZonePlace): string | undefined => {
  const code = country?.trim().toUpperCase();
  const ofCountry = code ? zoneCities().filter((c) => c.country === code) : [];
  if (ofCountry.length > 0 && sameClock(ofCountry)) return ofCountry[0]?.zone;
  if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return undefined;
  }
  const candidates = ofCountry.length > 0 ? ofCountry : zoneCities();
  let best: { zone: string; km: number } | undefined;
  for (const city of candidates) {
    const km = distanceKm(lat, lon, city.lat, city.lon);
    if (!best || km < best.km) best = { zone: city.zone, km };
  }
  if (!best || (ofCountry.length === 0 && best.km > MAX_KM_WITHOUT_COUNTRY)) return undefined;
  return best.zone;
};

/** The place an event's tags give: its country (`i iso3166:…`) and most precise `g` geohash */
export const zonePlaceOfTags = (tags: string[][]): ZonePlace => {
  const country = tags
    .flatMap((t) => (t[0] === 'i' && t[1]?.startsWith('iso3166:') ? [t[1].slice(8, 10)] : []))
    .find((c) => /^[a-z]{2}$/i.test(c));
  const geohash = tags
    .flatMap((t) =>
      t[0] === 'g' && isValidGeohash(t[1]?.trim().toLowerCase()) ? [t[1].trim().toLowerCase()] : []
    )
    .sort((a, b) => b.length - a.length)[0];
  const point = geohash && geohash.length >= MIN_GEOHASH ? decodeGeohash(geohash) : undefined;
  return { ...(country ? { country } : {}), ...(point ? { lat: point.lat, lon: point.lon } : {}) };
};

/** The zone guessed from an event's tags (`zonePlaceOfTags`, `guessTimeZone`) */
export const guessTimeZoneOfTags = (tags: string[][]): string | undefined =>
  guessTimeZone(zonePlaceOfTags(tags));
