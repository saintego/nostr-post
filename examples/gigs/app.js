/**
 * Gigs: concerts and parties on Nostr (NIP-52), a thin app on nostr-post's packages through
 * the CDN bundle. Pages (hash routes): browse by city, genre and date; an event; an artist;
 * add a gig (from a post's text or poster, with AI as a preview first); import an .ics file.
 * Test mode signs events but publishes nothing (the signer's dry run).
 */

import {
  agendaFilter,
  coordinateEvents,
  decodeNaddr,
  encodeNaddr,
  fetchEvents,
  icsToDrafts,
  isDryRun,
  pluginRegistry,
  setDryRun,
  similarEvents,
} from '../../nostr-post.js';
import { askClaude, gigPrompt, parseAnswer, toFormData } from './ai.js';
import { ARTIST_MANIFEST, CITIES, GENRES, GIG_MANIFEST } from './manifests.js';

const main = document.getElementById('main');
const html = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? escapeHtml(values[i]) : ''), '');
const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** localStorage, which can be missing or blocked (private windows) */
const store = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Not remembered
    }
  },
};

// ── Dark theme ────────────────────────────────────────────────────────

// The components turn dark with a `dark` class on an ancestor; follow the system setting
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const syncDark = () => document.body.classList.toggle('dark', darkQuery.matches);
syncDark();
darkQuery.addEventListener('change', syncDark);

// ── Test mode ─────────────────────────────────────────────────────────

const testToggle = document.getElementById('test-mode');
const banner = document.getElementById('test-banner');
const applyTestMode = (on) => {
  setDryRun(on);
  store.set('gigs:test-mode', on ? '1' : '0');
  testToggle.checked = on;
  banner.hidden = !on;
};
// On by default: nothing reaches relays until the user turns it off
applyTestMode(store.get('gigs:test-mode') !== '0');
testToggle.addEventListener('change', () => applyTestMode(testToggle.checked));

// ── Pages ─────────────────────────────────────────────────────────────

const eventLink = (address) => `#/event/${encodeNaddr(address) ?? encodeURIComponent(address)}`;

/** Browse: an agenda or month of gigs, by city and genre */
function browse() {
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

/** One gig by its naddr (or address): shareable */
function eventPage(id) {
  const address = id.startsWith('naddr1') ? decodeNaddr(id) : decodeURIComponent(id);
  main.innerHTML = html`
    <p><a href="#/">← All gigs</a></p>
    <nostr-calendar-event id="event"></nostr-calendar-event>
    <p class="share">Share: <input readonly value="${location.href}" onfocus="this.select()" /></p>
  `;
  const card = document.getElementById('event');
  card.manifest = GIG_MANIFEST;
  card.address = address ?? '';
}

/** An artist's wiki page: their links as players */
function artistPage(dTag) {
  main.innerHTML = html`
    <p><a href="#/">← All gigs</a> · <a href="#/artist-new">Add an artist</a></p>
    <nostr-wiki-view id="artist"></nostr-wiki-view>
  `;
  const view = document.getElementById('artist');
  view.manifest = ARTIST_MANIFEST;
  view.entityId = decodeURIComponent(dTag);
}

function newArtist() {
  main.innerHTML = html`
    <h2>Add an artist</h2>
    <nostr-wiki-composer id="composer" auto-publish></nostr-wiki-composer>
  `;
  const composer = document.getElementById('composer');
  composer.manifest = ARTIST_MANIFEST;
  composer.addEventListener('nostr-wiki-published', (e) => {
    const dTag = e.detail?.dTag;
    if (dTag) location.hash = `#/artist/${encodeURIComponent(dTag)}`;
  });
}

// ── Adding a gig ──────────────────────────────────────────────────────

/** What the draft would publish, as an event to preview (unsigned, not sent anywhere) */
const previewEvent = (formData, formatId) => {
  const plugin = (field) => pluginRegistry.get(field.uiPlugin);
  const result = coordinateEvents(GIG_MANIFEST, formData, {
    pubkey: '0'.repeat(64),
    selectedFormatId: formatId,
    dTag: 'preview',
    tagSerializer: (value, field) => plugin(field)?.serializeValue?.(value, field),
    extraTagsFn: (value, field) => plugin(field)?.extraTags?.(value, field),
  });
  if (!result.success) throw new Error(result.error.map((e) => e.message).join('; '));
  return { ...result.data.events[0], id: '0'.repeat(64), sig: '' };
};

/** Gigs already on Nostr on the draft's days with an alike title */
const findDuplicates = async (formData) => {
  const start = formData.when?.start?.slice(0, 10);
  if (!start || !formData.title) return [];
  const window = { from: start, days: 1, tzid: formData.when.tzid };
  const events = await fetchEvents(agendaFilter(window)).catch(() => []);
  return similarEvents({ title: formData.title, when: formData.when }, events);
};

function addGig() {
  main.innerHTML = html`
    <h2>Add a gig</h2>
    <section class="step">
      <h3>1. The post</h3>
      <p class="hint">Copy the text of the post (Facebook, Instagram, a website) and save its poster.</p>
      <textarea id="post-text" rows="6" placeholder="Paste the post's text"></textarea>
      <label>Poster <input id="poster" type="file" accept="image/*" /></label>
    </section>
    <section class="step">
      <h3>2. Read it with AI</h3>
      <div class="row">
        <label>Your Anthropic API key <input id="api-key" type="password" autocomplete="off" value="${store.get('gigs:api-key') ?? ''}" /></label>
        <label><input id="remember-key" type="checkbox" ${store.get('gigs:api-key') ? 'checked' : ''} /> Remember in this browser</label>
        <button type="button" id="ask">Ask Claude</button>
      </div>
      <details>
        <summary>No key? Use any AI</summary>
        <p class="hint">Copy this prompt to any AI (with the poster, if you have one), then paste its answer below.</p>
        <textarea id="prompt" rows="6" readonly></textarea>
      </details>
      <textarea id="answer" rows="6" placeholder="The AI's answer (JSON)"></textarea>
      <button type="button" id="use">Preview</button>
      <p id="ai-status" class="hint" role="status"></p>
    </section>
    <section class="step" id="review" hidden>
      <h3>3. Check it</h3>
      <div id="duplicates"></div>
      <p class="hint">How it will look:</p>
      <nostr-post-view id="preview"></nostr-post-view>
      <p class="hint" id="performers-hint"></p>
      <h3>4. Correct and publish</h3>
      <nostr-post-composer id="composer" auto-publish></nostr-post-composer>
      <p id="published" class="hint"></p>
    </section>
  `;
  const $ = (id) => document.getElementById(id);
  const status = (text) => {
    $('ai-status').textContent = text;
  };
  const updatePrompt = () => {
    $('prompt').value = gigPrompt($('post-text').value);
  };
  $('post-text').addEventListener('input', updatePrompt);
  updatePrompt();

  $('ask').addEventListener('click', async () => {
    const apiKey = $('api-key').value.trim();
    if (!apiKey) return status('Enter your API key, or use the prompt with any AI.');
    store.set('gigs:api-key', $('remember-key').checked ? apiKey : null);
    status('Asking Claude…');
    try {
      $('answer').value = await askClaude({
        apiKey,
        text: $('post-text').value,
        poster: $('poster').files?.[0],
      });
      status('Done: check the preview below.');
      $('use').click();
    } catch (error) {
      status(`Claude: ${error.message}`);
    }
  });

  $('use').addEventListener('click', async () => {
    let draft;
    try {
      draft = toFormData(parseAnswer($('answer').value));
    } catch (error) {
      return status(`Couldn't read the answer: ${error.message}`);
    }
    $('review').hidden = false;
    try {
      const preview = $('preview');
      preview.manifest = GIG_MANIFEST;
      preview.event = previewEvent(draft.formData, draft.formatId);
    } catch (error) {
      status(`Preview: ${error.message}`);
    }
    $('performers-hint').textContent = draft.performers.length
      ? `Performers in the post: ${draft.performers.join(', ')}. Pick their pages in the form (or create them).`
      : '';
    const composer = $('composer');
    composer.manifest = GIG_MANIFEST;
    composer.defaultFormatId = draft.formatId;
    composer.prefill = draft.formData;
    const duplicates = await findDuplicates(draft.formData);
    $('duplicates').innerHTML = duplicates.length
      ? `<div class="warning">Maybe already on Nostr: ${duplicates
          .map(({ event }) => {
            const d = event.tags.find((t) => t[0] === 'd')?.[1] ?? '';
            const title = event.tags.find((t) => t[0] === 'title')?.[1] ?? d;
            return `<a href="${eventLink(`${event.kind}:${event.pubkey}:${d}`)}">${escapeHtml(title)}</a>`;
          })
          .join(', ')}. RSVP there instead of adding it again?</div>`
      : '';
  });

  $('composer').addEventListener('nostr-post-published', (e) => {
    const event = e.detail?.[0];
    const d = event?.tags.find((t) => t[0] === 'd')?.[1];
    if (!event || d === undefined) return;
    const where = isDryRun() ? ' (test mode: not sent to relays)' : '';
    $('published').innerHTML =
      `Published${where}: <a href="${eventLink(`${event.kind}:${event.pubkey}:${d}`)}">open the gig</a>`;
  });
}

// ── Importing .ics ────────────────────────────────────────────────────

function importIcs() {
  main.innerHTML = html`
    <h2>Import from a calendar (.ics)</h2>
    <p class="hint">E.g. Facebook's export of your events. Each event is checked by you before it's
    published; importing the same file again updates the events instead of adding copies.</p>
    <input id="file" type="file" accept=".ics,text/calendar" />
    <ul id="drafts" class="drafts"></ul>
    <div id="review"></div>
  `;
  const $ = (id) => document.getElementById(id);
  $('file').addEventListener('change', async () => {
    const file = $('file').files?.[0];
    if (!file) return;
    const drafts = icsToDrafts(await file.text());
    $('drafts').innerHTML = drafts.length
      ? drafts
          .map(
            (d, i) => `<li>
              <strong>${escapeHtml(d.formData.title ?? d.uid)}</strong> · ${escapeHtml(d.formData.when.start)}
              ${d.private ? '<em>(private: not offered)</em>' : `<button type="button" data-i="${i}">Review</button>`}
            </li>`
          )
          .join('')
      : '<li>No events in this file.</li>';
    $('drafts').onclick = (e) => {
      const index = e.target?.dataset?.i;
      if (index === undefined) return;
      const draft = drafts[Number(index)];
      $('review').innerHTML =
        '<nostr-post-composer id="composer" auto-publish></nostr-post-composer>';
      const composer = $('composer');
      composer.manifest = GIG_MANIFEST;
      composer.defaultFormatId = draft.allDay ? 'all-day' : 'timed';
      composer.dTag = draft.dTag;
      composer.prefill = draft.formData;
      composer.scrollIntoView({ behavior: 'smooth' });
    };
  });
}

// ── Router ────────────────────────────────────────────────────────────

const routes = [
  [/^#\/event\/(.+)$/, (m) => eventPage(m[1])],
  [/^#\/artist\/(.+)$/, (m) => artistPage(m[1])],
  [/^#\/artist-new$/, newArtist],
  [/^#\/add$/, addGig],
  [/^#\/import$/, importIcs],
];

const route = () => {
  for (const [pattern, page] of routes) {
    const match = location.hash.match(pattern);
    if (match) return page(match);
  }
  browse();
};

window.addEventListener('hashchange', route);
route();
