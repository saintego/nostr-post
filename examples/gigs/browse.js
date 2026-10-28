/**
 * Browsing gigs: an agenda or month of them by city and genre.
 */

import { CITIES, GENRES, GIG_MANIFEST } from './manifests.js';
import { escapeHtml, eventLink, html, main, store } from './util.js';

/** Browse: an agenda or month of gigs, by city and genre */
export function browse() {
  const city = store.get('gigs:city') ?? '';
  const genre = store.get('gigs:genre') ?? '';
  const view = store.get('gigs:view') ?? 'list';
  main.innerHTML = html`
    <form class="filters" id="filters">
      <label>City
        <select name="city">
          ${'' /* filled below */}
        </select>
      </label>
      <label>Genre <input name="genre" list="genres" value="${genre}" placeholder="any" /></label>
      <label>View
        <select name="view">
          <option value="list">Days</option>
          <option value="month">Month</option>
        </select>
      </label>
    </form>
    <datalist id="genres"></datalist>
    <nostr-calendar-agenda id="agenda"></nostr-calendar-agenda>
  `;
  const form = document.getElementById('filters');
  form.city.innerHTML = CITIES.map(
    (c) => `<option value="${escapeHtml(c.geohash)}">${escapeHtml(c.name)}</option>`
  ).join('');
  form.city.value = city;
  form.view.value = view;
  document.getElementById('genres').innerHTML = GENRES.map(
    (g) => `<option value="${escapeHtml(g)}"></option>`
  ).join('');
  const agenda = document.getElementById('agenda');
  agenda.manifest = GIG_MANIFEST;
  // Rows link to the gig's page; "Details" opens it in place
  agenda.eventHref = (address) => eventLink(address);
  const apply = () => {
    const tagFilters = {};
    if (form.city.value) tagFilters['#g'] = [form.city.value];
    const g = form.genre.value.trim().toLowerCase();
    if (g) tagFilters['#t'] = [g];
    agenda.tagFilters = tagFilters;
    agenda.view = form.view.value;
    store.set('gigs:city', form.city.value);
    store.set('gigs:genre', g);
    store.set('gigs:view', form.view.value);
  };
  form.addEventListener('change', apply);
  apply();
}
