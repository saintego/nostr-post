/**
 * Browsing gigs: an agenda, a week or a month of them by city and genre. The filter is in the
 * page's link, so it can be shared, as text or an image.
 */

import { encodeGeohash } from '@nostr-post/plugin-geo';
import { searchNominatim } from '@nostr-post/plugin-venue';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cityName,
  type Filter,
  readFilter,
  recentCities,
  rememberCity,
  VIEWS,
  type ViewId,
  writeFilter,
} from '../lib/filter';
import { GENRES, GIG_MANIFEST } from '../lib/manifests';
import { eventLink } from '../lib/routes';
import { shareImage, shareText } from '../lib/share';

/** Geohash length of a city's area (about 40 × 20 km), as the venue field tags cities */
const CITY_PRECISION = 4;
/** Nominatim asks for at most one request a second */
const SEARCH_DELAY = 700;

/**
 * Cities: any place OpenStreetMap knows (searched while typing), and those picked before.
 * `city` is the typed name's city once it's a known one, or none when the input is empty.
 */
function useCities(initial: Filter) {
  const [cities, setCities] = useState(() => {
    const known = recentCities();
    if (initial.city && initial.g) known.set(initial.city, initial.g);
    return known;
  });
  const [input, setInput] = useState(initial.city);
  const [city, setCity] = useState({ name: initial.g ? initial.city : '', g: initial.g });
  useEffect(() => {
    const name = input.trim();
    const g = cities.get(name);
    if (g) setCity({ name, g });
    else if (!name) setCity({ name: '', g: '' });
  }, [input, cities]);
  useEffect(() => {
    const query = input.trim();
    if (query.length < 3 || cities.has(query)) return;
    const timer = setTimeout(async () => {
      const results = await searchNominatim(query, ['city']).catch(() => []);
      if (!results.length) return;
      setCities((known) => {
        const next = new Map(known);
        for (const r of results) {
          next.set(cityName(r), encodeGeohash(Number(r.lat), Number(r.lon), CITY_PRECISION));
        }
        return next;
      });
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [input, cities]);
  return { cities, input, setInput, city };
}

export function Browse({ query }: { query: string }) {
  // The link's filter when the page opens; afterwards the page writes it
  const [initial] = useState(() => readFilter(query));
  const { cities, input, setInput, city } = useCities(initial);
  const [genreInput, setGenreInput] = useState(initial.genre);
  const [genre, setGenre] = useState(initial.genre.trim().toLowerCase());
  const [view, setView] = useState<ViewId>(initial.view);
  const [status, setStatus] = useState('');
  const agenda = useRef<HTMLElementTagNameMap['nostr-calendar-agenda']>(null);

  const tagFilters = useMemo(() => {
    const filters: Record<string, string[]> = {};
    if (city.g) filters['#g'] = [city.g];
    if (genre) filters['#t'] = [genre];
    return filters;
  }, [city.g, genre]);
  const current = (): Filter => ({
    city: city.name,
    g: city.g,
    genre,
    view,
    from: agenda.current?.from,
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: written when the filter changes
  useEffect(() => {
    if (city.g) rememberCity(city.name, city.g);
    writeFilter(current());
  }, [city.name, city.g, genre, view]);

  const commitGenre = (value: string) => setGenre(value.trim().toLowerCase());
  const shareOptions = () => ({
    ...current(),
    days: agenda.current?.days,
    view: agenda.current?.view ?? 'list',
  });
  const selected = VIEWS[view];

  return (
    <>
      <form className="filters" onSubmit={(e) => e.preventDefault()}>
        <label>
          City
          <input
            list="cities"
            value={input}
            placeholder="Anywhere"
            autoComplete="off"
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <label>
          Genre
          <input
            list="genres"
            value={genreInput}
            placeholder="any"
            onChange={(e) => {
              setGenreInput(e.target.value);
              // Picked from the list: no need to leave the field
              if (GENRES.includes(e.target.value)) commitGenre(e.target.value);
            }}
            onBlur={(e) => commitGenre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitGenre(e.currentTarget.value)}
          />
        </label>
        <label>
          View
          <select value={view} onChange={(e) => setView(e.target.value as ViewId)}>
            {Object.entries(VIEWS).map(([id, v]) => (
              <option key={id} value={id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <span className="share-buttons">
          <button type="button" onClick={() => shareText(shareOptions(), setStatus)}>
            Share
          </button>
          <button type="button" onClick={() => shareImage(shareOptions(), setStatus)}>
            Image
          </button>
        </span>
      </form>
      <p className="hint" role="status">
        {status}
      </p>
      <datalist id="cities">
        {[...cities.keys()].map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="genres">
        {GENRES.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <nostr-calendar-agenda
        ref={agenda}
        manifest={GIG_MANIFEST}
        // A city's gigs at the city's times, wherever the viewer is
        eventZones
        // Rows link to the gig's page; "Details" opens it in place
        eventHref={eventLink}
        from={initial.from}
        tagFilters={tagFilters}
        view={selected.view}
        days={'days' in selected ? selected.days : undefined}
        onnostr-calendar-agenda-change={() => writeFilter(current())}
      />
    </>
  );
}
