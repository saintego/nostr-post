/**
 * The browse page's filter: in the page's link (`#/?city=…&g=…&genre=…&view=…&from=…`), so it
 * can be shared, and remembered for the next visit; and the cities picked before.
 */

import type { NominatimResult } from '@nostr-post/plugin-venue';
import { store } from './store';

/** The views: the agenda's view and number of days */
export const VIEWS = {
  list: { view: 'list', label: 'Days' },
  week: { view: 'list', days: 7, label: 'Week' },
  month: { view: 'month', label: 'Month' },
} as const satisfies Record<string, { view: 'list' | 'month'; days?: number; label: string }>;

export type ViewId = keyof typeof VIEWS;

const isView = (id: string): id is ViewId => id in VIEWS;

export interface Filter {
  /** The city's name, e.g. "Bangkok, Thailand" */
  city: string;
  /** Its area's geohash */
  g: string;
  genre: string;
  view: ViewId;
  /** The agenda's first day */
  from?: string;
}

/** The filter from the page's link, else as last used */
export const readFilter = (query: string): Filter => {
  const params = new URLSearchParams(query);
  const has = params.has('city') || params.has('genre') || params.has('view');
  const get = (key: string) => (has ? params.get(key) : store.get(`gigs:${key}`)) ?? '';
  const view = get('view');
  return {
    city: get('city'),
    g: get('g'),
    genre: get('genre'),
    view: isView(view) ? view : 'list',
    from: params.get('from') ?? undefined,
  };
};

/** Remembers the filter and puts it in the page's link (without reloading the page) */
export const writeFilter = (filter: Filter): void => {
  const params = new URLSearchParams();
  for (const key of ['city', 'g', 'genre', 'view', 'from'] as const) {
    const value = filter[key];
    if (value) params.set(key, value);
    if (key !== 'from') store.set(`gigs:${key}`, value || null);
  }
  history.replaceState(null, '', `#/?${params}`);
};

/** Cities picked before, the latest first: name → geohash */
const RECENT_CITIES = 8;
export const recentCities = (): Map<string, string> => {
  try {
    return new Map(JSON.parse(store.get('gigs:cities') ?? '[]'));
  } catch {
    return new Map();
  }
};
export const rememberCity = (name: string, g: string): void => {
  const recent = [...recentCities()].filter(([n]) => n !== name);
  store.set('gigs:cities', JSON.stringify([[name, g], ...recent].slice(0, RECENT_CITIES)));
};

/** A city's name in a search result, e.g. "Bangkok, Thailand" */
export const cityName = (result: NominatimResult): string => {
  const a = result.address ?? {};
  const name =
    a.city ?? a.town ?? a.village ?? a.municipality ?? result.display_name.split(',')[0] ?? '';
  return [name, a.country].filter(Boolean).join(', ');
};
