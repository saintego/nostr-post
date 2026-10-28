/**
 * Gigs: concerts and parties on Nostr (NIP-52), a thin app on nostr-post's packages through
 * the CDN bundle. Pages (hash routes): browse by city, genre and date; an event; an artist;
 * add a gig (from a post's text or poster, with AI as a preview first); import an .ics file.
 * Test mode signs events but publishes nothing (the signer's dry run).
 */

import { decodeNaddr, fetchEvents, icsToDrafts, setDryRun } from '../../nostr-post.js';
import { addGig } from './addGig.js';
import { browse } from './browse.js';
import { ARTIST_MANIFEST, GIG_MANIFEST } from './manifests.js';
import { escapeHtml, html, main, store } from './util.js';

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

/** One gig by its naddr (or address): shareable */
function eventPage(id) {
  const address = id.startsWith('naddr1') ? decodeNaddr(id) : decodeURIComponent(id);
  main.innerHTML = html`
    <p><a href="#/">← All gigs</a></p>
    <nostr-calendar-event id="event" thread editable></nostr-calendar-event>
    <p class="share">Share: <input readonly value="${location.href}" onfocus="this.select()" /></p>
  `;
  const card = document.getElementById('event');
  card.manifest = GIG_MANIFEST;
  card.address = address ?? '';
}

/** A musician's wiki page: their links as players, and their gigs */
function artistPage(id) {
  const dTag = decodeURIComponent(id);
  main.innerHTML = html`
    <p><a href="#/">← All gigs</a> · <a href="#/artist-edit/${encodeURIComponent(dTag)}">Edit</a> · <a href="#/artist-new">Add an artist</a></p>
    <nostr-wiki-view id="artist"></nostr-wiki-view>
    <h3>Gigs</h3>
    <nostr-post-feed id="gigs"></nostr-post-feed>
  `;
  const view = document.getElementById('artist');
  view.manifest = ARTIST_MANIFEST;
  view.entityId = dTag;
  void showArtistGigs(document.getElementById('gigs'), dTag);
}

/**
 * The gigs that link a musician: by its page (`a` tag, any version's author) or by its profile
 * links (`i` tags), so gigs added before the page existed show too
 */
async function showArtistGigs(feed, dTag) {
  const versions = await fetchEvents({ kinds: [30818], '#d': [dTag] }).catch(() => []);
  const addresses = [...new Set(versions.map((v) => `30818:${v.pubkey}:${dTag}`))];
  const ids = [
    ...new Set(versions.flatMap((v) => v.tags.filter((t) => t[0] === 'i').map((t) => t[1]))),
  ];
  const kinds = [31922, 31923];
  const filters = [
    ...(addresses.length ? [{ kinds, '#a': addresses }] : []),
    ...(ids.length ? [{ kinds, '#i': ids }] : []),
  ];
  if (!filters.length) {
    feed.replaceWith(Object.assign(document.createElement('p'), { textContent: 'No gigs yet.' }));
    return;
  }
  feed.manifest = GIG_MANIFEST;
  feed.filters = filters;
}

/**
 * Editing a musician's page; `additions` (`#/artist-edit/<d-tag>?add=<JSON>`) are added to it,
 * e.g. links from a gig that the page doesn't have
 */
function editArtist(dTag, additions) {
  main.innerHTML = `
    <h2>Edit a musician</h2>
    <p class="hint" ${additions ? '' : 'hidden'}>Links from the gig are added below: check them and publish.</p>
    <nostr-wiki-composer id="composer" auto-publish></nostr-wiki-composer>
  `;
  const composer = document.getElementById('composer');
  composer.manifest = ARTIST_MANIFEST;
  composer.additions = additions;
  composer.entityId = dTag;
  composer.addEventListener('nostr-wiki-published', () => {
    location.hash = `#/artist/${encodeURIComponent(dTag)}`;
  });
}

/** `?add=<JSON>` of a route, if valid */
const additionsOf = (query) => {
  try {
    const value = JSON.parse(new URLSearchParams(query ?? '').get('add') ?? 'null');
    return value && typeof value === 'object' ? value : undefined;
  } catch {
    return undefined;
  }
};

/** A new artist's page, with the name filled in when given (`#/artist-new/<name>`) */
function newArtist(name) {
  main.innerHTML = html`
    <h2>Add an artist</h2>
    <nostr-wiki-composer id="composer" auto-publish></nostr-wiki-composer>
  `;
  const composer = document.getElementById('composer');
  composer.manifest = ARTIST_MANIFEST;
  if (name) composer.prefill = { title: name };
  composer.addEventListener('nostr-wiki-published', (e) => {
    const dTag = e.detail?.dTag;
    if (dTag) location.hash = `#/artist/${encodeURIComponent(dTag)}`;
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
  [/^#\/artist-new(?:\/(.+))?$/, (m) => newArtist(m[1] && decodeURIComponent(m[1]))],
  [
    /^#\/artist-edit\/([^?]+)(?:\?(.*))?$/,
    (m) => editArtist(decodeURIComponent(m[1]), additionsOf(m[2])),
  ],
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
