/**
 * Browsing gigs: an agenda, a week or a month of them by city and genre. The filter is in the
 * page's link (`#/?city=…&g=…&genre=…&view=…&from=…`), so it can be shared, as text or an image.
 */

import { encodeGeohash, searchNominatim } from '../../nostr-post.js';
import { CITIES, GENRES, GIG_MANIFEST } from './manifests.js';
import { shareImage, shareText } from './share.js';
import { escapeHtml, eventLink, html, main, store } from './util.js';

/** Geohash length of a city's area (about 40 × 20 km), as the venue field tags cities */
const CITY_PRECISION = 4;

/** The views: the agenda's view and number of days */
const VIEWS = {
  list: { view: 'list', label: 'Days' },
  week: { view: 'list', days: 7, label: 'Week' },
  month: { view: 'month', label: 'Month' },
};

/** The filter from the page's link, else as last used */
const readFilter = () => {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const has = params.has('city') || params.has('genre') || params.has('view');
  const get = (key) => (has ? params.get(key) : store.get(`gigs:${key}`)) ?? '';
  return {
    city: get('city'),
    g: get('g'),
    genre: get('genre'),
    view: VIEWS[get('view')] ? get('view') : 'list',
    from: params.get('from') ?? undefined,
  };
};

/** Remembers the filter and puts it in the page's link (without reloading the page) */
const writeFilter = (filter) => {
  const params = new URLSearchParams();
  for (const key of ['city', 'g', 'genre', 'view', 'from']) {
    if (filter[key]) params.set(key, filter[key]);
    if (key !== 'from') store.set(`gigs:${key}`, filter[key] || null);
  }
  history.replaceState(null, '', `#/?${params}`);
};

/** A city's name in a search result, e.g. "Bangkok, Thailand" */
const cityName = (result) => {
  const a = result.address ?? {};
  const name = a.city ?? a.town ?? a.village ?? a.municipality ?? result.display_name.split(',')[0];
  return [name, a.country].filter(Boolean).join(', ');
};

/** Browse: an agenda of gigs by city and genre */
export function browse() {
  const filter = readFilter();
  main.innerHTML = html`
    <form class="filters" id="filters">
      <label>City
        <input name="city" list="cities" value="${filter.city}" placeholder="Anywhere" autocomplete="off" />
      </label>
      <label>Genre <input name="genre" list="genres" value="${filter.genre}" placeholder="any" /></label>
      <label>View
        <select name="view">
          ${''}
        </select>
      </label>
      <span class="share-buttons">
        <button type="button" id="share-text">Share</button>
        <button type="button" id="share-image">Image</button>
      </span>
    </form>
    <p id="share-status" class="hint" role="status"></p>
    <datalist id="cities"></datalist>
    <datalist id="genres"></datalist>
    <nostr-calendar-agenda id="agenda"></nostr-calendar-agenda>
  `;
  const $ = (id) => document.getElementById(id);
  const form = $('filters');
  form.view.innerHTML = Object.entries(VIEWS)
    .map(([id, v]) => `<option value="${id}">${escapeHtml(v.label)}</option>`)
    .join('');
  form.view.value = filter.view;
  $('genres').innerHTML = GENRES.map((g) => `<option value="${escapeHtml(g)}"></option>`).join('');

  // Cities: the app's list, and any place OpenStreetMap knows (searched while typing)
  const cities = new Map(CITIES.filter((c) => c.geohash).map((c) => [c.name, c.geohash]));
  if (filter.city && filter.g) cities.set(filter.city, filter.g);
  const listCities = () => {
    $('cities').innerHTML = [...cities.keys()]
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join('');
  };
  listCities();
  let searchTimer;
  form.city.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const query = form.city.value.trim();
    if (query.length < 3 || cities.has(query)) return;
    // Nominatim asks for at most one request a second
    searchTimer = setTimeout(async () => {
      const results = await searchNominatim(query, ['city']).catch(() => []);
      for (const r of results) {
        cities.set(cityName(r), encodeGeohash(Number(r.lat), Number(r.lon), CITY_PRECISION));
      }
      listCities();
    }, 700);
  });

  const agenda = $('agenda');
  agenda.manifest = GIG_MANIFEST;
  // Rows link to the gig's page; "Details" opens it in place
  agenda.eventHref = (address) => eventLink(address);
  agenda.from = filter.from;
  const current = () => {
    const city = form.city.value.trim();
    const g = cities.get(city) ?? '';
    return {
      city: g ? city : '',
      g,
      genre: form.genre.value.trim().toLowerCase(),
      view: form.view.value,
      from: agenda.from,
    };
  };
  const apply = () => {
    const f = current();
    const tagFilters = {};
    if (f.g) tagFilters['#g'] = [f.g];
    if (f.genre) tagFilters['#t'] = [f.genre];
    agenda.tagFilters = tagFilters;
    agenda.view = VIEWS[f.view].view;
    agenda.days = VIEWS[f.view].days;
    writeFilter(f);
  };
  form.addEventListener('change', apply);
  agenda.addEventListener('nostr-calendar-agenda-change', () => writeFilter(current()));
  apply();

  const status = (text) => {
    $('share-status').textContent = text;
  };
  const shareOptions = () => ({ ...current(), days: agenda.days, view: agenda.view });
  $('share-text').addEventListener('click', () => shareText(shareOptions(), status));
  $('share-image').addEventListener('click', () => shareImage(shareOptions(), status));
}
