/**
 * Adding a gig: the post's text and poster, read by AI (Claude with the user's key, or any AI
 * through a copied prompt), checked as a preview and corrected in the composer before publishing.
 */

import {
  agendaFilter,
  coordinateEvents,
  fetchEvents,
  findJsonObject,
  isDryRun,
  pluginRegistry,
  similarEvents,
} from '../../nostr-post.js';
import { askClaude, gigPrompt, readAnswer } from './ai.js';
import { suggestedLinks } from './links.js';
import { GIG_MANIFEST } from './manifests.js';
import { escapeHtml, eventLink, html, main, store } from './util.js';

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

export function addGig() {
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
      <label><input id="suggest-links" type="checkbox" ${store.get('gigs:suggest-links') === '0' ? '' : 'checked'} />
        Let the AI suggest performers' Spotify, SoundCloud and YouTube links (checked by asking those sites)</label>
      <textarea id="answer" rows="6" placeholder="The AI's answer (JSON)"></textarea>
      <button type="button" id="use">Preview</button>
      <p id="ai-status" class="hint" role="status"></p>
    </section>
    <section class="step" id="suggested" hidden></section>
    <section class="step" id="review" hidden>
      <h3>3. Check it</h3>
      <div id="duplicates"></div>
      <p class="hint">How it will look:</p>
      <nostr-post-view id="preview"></nostr-post-view>
      <div id="performer-links"></div>
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
  const suggestLinks = () => $('suggest-links').checked;
  const updatePrompt = () => {
    $('prompt').value = gigPrompt($('post-text').value, { suggestLinks: suggestLinks() });
  };
  $('post-text').addEventListener('input', updatePrompt);
  $('suggest-links').addEventListener('change', () => {
    store.set('gigs:suggest-links', suggestLinks() ? '1' : '0');
    updatePrompt();
  });
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
        suggestLinks: suggestLinks(),
      });
      status('Done: check the preview below.');
      $('use').click();
    } catch (error) {
      status(`Claude: ${error.message}`);
    }
  });

  // Links the post doesn't have, suggested by the AI: the ones Spotify, SoundCloud or YouTube
  // know by the performer's name are offered to confirm (by playing them) before the preview
  $('use').addEventListener('click', async () => {
    $('review').hidden = true;
    $('suggested').hidden = true;
    const json = findJsonObject($('answer').value);
    if (!json.success) return status(`Couldn't read the answer: ${json.error.message}`);
    status('Checking the links the AI suggested…');
    const suggestions = await suggestedLinks(json.data, $('post-text').value);
    status('');
    if (!suggestions.length) return showDraft([]);
    renderSuggestedLinks($('suggested'), suggestions, showDraft);
  });

  const showDraft = async (confirmed) => {
    let draft;
    try {
      status('Reading the answer…');
      draft = await readAnswer($('answer').value, {
        text: $('post-text').value,
        poster: $('poster').files?.[0],
        confirmed,
      });
      status('');
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
    renderPerformerLinks($('performer-links'), draft);
    // Performers with a page are picked in the form, the others show "Create page" there;
    // pages that lack links from the post can get them
    const updates = (draft.suggestions.performers ?? []).filter((s) => s.action === 'update');
    $('performers-hint').innerHTML = updates.length
      ? `New links for ${updates
          .map((s) => {
            const dTag = s.address.split(':').slice(2).join(':');
            const links = Object.values(s.prefill).flat().map(escapeHtml).join(', ');
            return `<a href="#/artist/${encodeURIComponent(dTag)}" target="_blank">${escapeHtml(s.label)}</a> (${links})`;
          })
          .join('; ')}: add them to their page?`
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
  };

  $('composer').addEventListener('nostr-post-published', (e) => {
    const event = e.detail?.[0];
    const d = event?.tags.find((t) => t[0] === 'd')?.[1];
    if (!event || d === undefined) return;
    const where = isDryRun() ? ' (test mode: not sent to relays)' : '';
    $('published').innerHTML =
      `Published${where}: <a href="${eventLink(`${event.kind}:${event.pubkey}:${d}`)}">open the gig</a>`;
  });
}

/**
 * The links the AI suggested and their provider knows by the performer's name, as players with
 * "It's them" to confirm each: `onContinue` gets the confirmed links
 */
function renderSuggestedLinks(target, suggestions, onContinue) {
  target.hidden = false;
  target.innerHTML = `<h3>Links the AI suggested</h3>
    <p class="hint">Not in the post. They exist, under the performer's name, but may be someone
    else's with the same name: play each one and tick those that are really them.</p>
    ${suggestions
      .map(
        (s, i) => `<div class="performer"><strong>${escapeHtml(s.name)}</strong>
          <np-embed data-i="${i}"></np-embed>
          <label><input type="checkbox" data-i="${i}" /> It's them (${escapeHtml(s.names.join(' · '))})</label>
        </div>`
      )
      .join('')}
    <button type="button" id="continue">Continue</button>`;
  for (const embed of target.querySelectorAll('np-embed')) {
    embed.url = suggestions[Number(embed.dataset.i)].link;
  }
  target.querySelector('#continue').addEventListener('click', () => {
    const confirmed = [...target.querySelectorAll('input:checked')].map(
      (box) => suggestions[Number(box.dataset.i)].link
    );
    target.hidden = true;
    onContinue(confirmed);
  });
}

/** The performers' links as players, so the user sees what the AI found (and from where) */
function renderPerformerLinks(target, { performers, fromPoster }) {
  const withLinks = performers.filter((p) => p.links.length);
  target.innerHTML = withLinks.length
    ? `<p class="hint">Performers' links:</p>${withLinks
        .map(
          (p, i) => `<div class="performer"><strong>${escapeHtml(p.name)}</strong>
            ${p.links
              .map(
                (link, j) =>
                  `<div><np-embed data-p="${i}" data-l="${j}"></np-embed>${
                    fromPoster.includes(link)
                      ? '<span class="warning">Read from the poster, not in the text: check it</span>'
                      : ''
                  }</div>`
              )
              .join('')}</div>`
        )
        .join('')}`
    : '';
  for (const embed of target.querySelectorAll('np-embed')) {
    embed.url = withLinks[Number(embed.dataset.p)].links[Number(embed.dataset.l)];
  }
}
